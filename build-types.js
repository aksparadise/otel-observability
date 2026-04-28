// build-types.js - Copy TypeScript definitions to both dist/ and root/
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, "src");
const distDir = path.join(__dirname, "dist");
const rootDir = __dirname;

// Create dist directory
fs.mkdirSync(distDir, { recursive: true });

// Copy all .d.ts files from src to both dist/ and root/
// Also rename errorHandler.d.ts to error-handler.d.ts for export compatibility
const files = fs.readdirSync(srcDir);
files.forEach((file) => {
    if (file.endsWith(".d.ts")) {
        const srcPath = path.join(srcDir, file);
        let destFileName = file;
        let rootFileName = file;

        // Rename errorHandler.d.ts to error-handler.d.ts for export path compatibility
        if (file === "errorHandler.d.ts") {
            destFileName = "error-handler.d.ts";
            rootFileName = "error-handler.d.ts";
        }

        const destPath = path.join(distDir, destFileName);
        const rootPath = path.join(rootDir, rootFileName);

        fs.copyFileSync(srcPath, destPath);
        fs.copyFileSync(srcPath, rootPath);
        console.log(
            `Copied ${file} to dist/${destFileName} and root/${rootFileName}`,
        );
    }
});

console.log("TypeScript definitions build complete");
