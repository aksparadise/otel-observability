import { afterEach, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const servers = [];

const createCollector = async () => {
    const requests = [];
    const server = http.createServer((req, res) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
            requests.push({
                url: req.url,
                method: req.method,
                contentType: req.headers["content-type"],
                bodyLength: Buffer.concat(chunks).length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end("{}");
        });
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    servers.push(server);

    return {
        endpoint: `http://127.0.0.1:${server.address().port}`,
        requests,
    };
};

const runNode = (code) => {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ["--input-type=module", "-e", code], {
            cwd: repoRoot,
            env: {
                ...process.env,
                OTEL_ENABLED: "false",
                NODE_NO_WARNINGS: "1",
            },
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", reject);
        child.on("exit", (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`child exited ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
            }
        });
    });
};

afterEach(async () => {
    await Promise.all(
        servers.splice(0).map(
            (server) => new Promise((resolve) => server.close(resolve)),
        ),
    );
});

describe("OTLP export integration", () => {
    it("exports traces, logs, and metrics to an OTLP HTTP receiver", async () => {
        const collector = await createCollector();

        await runNode(`
            const { initOtel, shutdownOtel } = await import("./src/otel.js");
            const sdk = initOtel({
                enabled: true,
                backend: "custom",
                serviceName: "otlp-integration-test",
                collectorEndpoint: "${collector.endpoint}",
                metricExportInterval: 100,
            });
            process.env.OTEL_ENABLED = "true";
            const { logger } = await import("./src/logger.js");
            const { withSpan } = await import("./src/tracer.js");
            const { createCounter } = await import("./src/metrics.js");

            await withSpan("integration.operation", async () => {
                logger.info("integration log", { userId: "user-1" });
                createCounter("integration_requests_total").add(1, { route: "/test" });
            });

            await new Promise((resolve) => setTimeout(resolve, 500));
            await shutdownOtel(sdk);
        `);

        const urls = collector.requests.map((request) => request.url);
        expect(urls).toContain("/v1/traces");
        expect(urls).toContain("/v1/logs");
        expect(urls).toContain("/v1/metrics");
        expect(collector.requests.every((request) => request.bodyLength > 0)).toBe(true);
    }, 10000);
});
