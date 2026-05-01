// build-esm.js - Build ESM output using esbuild (no bundling)
import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, "src");
const esmDir = path.join(__dirname, "dist", "esm");

// Create dist/esm directory
fs.mkdirSync(esmDir, { recursive: true });

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
    "nestjs-logger.js",
];

await Promise.all(
    files.map(async (file) => {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(esmDir, file.replace(".js", ".mjs"));

        await esbuild.build({
            entryPoints: [srcPath],
            outfile: destPath,
            format: "esm",
            platform: "node",
            target: "node18",
            bundle: false,
        });

        // Post-process to fix internal import paths from .js to .mjs
        let content = fs.readFileSync(destPath, "utf-8");
        content = content.replace(/from "\.\/(.+?)\.js"/g, 'from "./$1.mjs"');
        fs.writeFileSync(destPath, content);

        console.log(`Built ${file} to dist/esm/${file.replace(".js", ".mjs")}`);
    }),
);

console.log("ESM build complete");
