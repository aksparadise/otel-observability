// build-types.js - Copy TypeScript definitions
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Create dist directory
fs.mkdirSync(distDir, { recursive: true });

// Copy all .d.ts files from src to dist
const files = fs.readdirSync(srcDir);
files.forEach(file => {
  if (file.endsWith('.d.ts')) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(distDir, file);
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to dist/`);
  }
});

console.log('TypeScript definitions build complete');
