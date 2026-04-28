// build-cjs.js - Build CommonJS output using esbuild
import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, "src");
const cjsDir = path.join(__dirname, "dist", "cjs");

// Create dist/cjs directory
fs.mkdirSync(cjsDir, { recursive: true });

const files = [
    "index.js",
    "otel.js",
    "tracer.js",
    "metrics.js",
    "logger.js",
    "middleware.js",
    "sanitizer.js",
    "errorHandler.js",
    "security.js",
];

await Promise.all(
    files.map(async (file) => {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(cjsDir, file.replace(".js", ".cjs"));

        await esbuild.build({
            entryPoints: [srcPath],
            outfile: destPath,
            format: "cjs",
            platform: "node",
            target: "node18",
            bundle: true,
            external: ["*"],
        });

        console.log(`Built ${file} to dist/cjs/${file.replace(".js", ".cjs")}`);
    }),
);

console.log("CommonJS build complete");
