// build-cjs.js - Build CommonJS output using esbuild (no bundling)
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
    "context.js",
    "middleware.js",
    "sanitizer.js",
    "errorHandler.js",
    "security.js",
    "nestjs-logger.js",
    "setup.js",
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
            bundle: false,
        });

        // Post-process to fix internal require paths from .js to .cjs
        let content = fs.readFileSync(destPath, "utf-8");
        content = content.replaceAll(
            /require\("\.\/(.+?)\.js"\)/g,
            'require("./$1.cjs")',
        );

        // Convert CommonJS require to ESM imports for specific modules
        if (file === "otel.js") {
            // Convert require("events") to import { EventEmitter } from "events"
            content = content.replace(
                /const EventEmitter = require\("events"\);/,
                'import { EventEmitter } from "events";',
            );
        }

        // Fix dynamic import paths for CommonJS compatibility
        if (file === "setup.js") {
            // Convert dynamic import("./otel.js") to import("./otel.cjs")
            content = content.replace(
                /await import\("\.\/otel\.js"\);/,
                'await import("./otel.cjs");',
            );
        }

        fs.writeFileSync(destPath, content);

        console.log(`Built ${file} to dist/cjs/${file.replace(".js", ".cjs")}`);
    }),
);

console.log("CommonJS build complete");
