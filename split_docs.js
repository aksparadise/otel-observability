const fs = require('fs');

const readme = fs.readFileSync('README.md', 'utf-8');

function extractSection(text, startHeading, endHeading) {
    const startIndex = text.indexOf(startHeading);
    if (startIndex === -1) return '';
    let endIndex = text.length;
    if (endHeading) {
        const tempEnd = text.indexOf(endHeading, startIndex + startHeading.length);
        if (tempEnd !== -1) endIndex = tempEnd;
    }
    return text.substring(startIndex, endIndex);
}

const nestjsContent = extractSection(readme, '## NestJS Integration', '## Plain Node.js & Express Integration');
const expressContent = extractSection(readme, '## Plain Node.js & Express Integration', '## Backend Configuration');
const apiContent = extractSection(readme, '## API Reference', '## Framework-Specific Setup');
const nextjsContent = extractSection(readme, '### Next.js', '## SigNoz vs Grafana Cloud');

if (!fs.existsSync('docs')) fs.mkdirSync('docs');
if (nestjsContent) fs.writeFileSync('docs/NESTJS.md', nestjsContent);
if (expressContent) fs.writeFileSync('docs/EXPRESS.md', expressContent);
if (apiContent) fs.writeFileSync('docs/API.md', apiContent);
if (nextjsContent) fs.writeFileSync('docs/NEXTJS.md', nextjsContent);

console.log('Docs extracted successfully.');
