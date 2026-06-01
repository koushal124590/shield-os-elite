const fs = require('fs');

const content = fs.readFileSync('www/app.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
    // Look for non-ascii characters that are often part of mangled utf8
    if (/[^\x00-\x7F]/.test(line)) {
        console.log(`${i + 1}: ${line}`);
    }
});
