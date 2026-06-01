const fs = require('fs');
const content = fs.readFileSync('c:/Users/koush/antigravity/www/app.js', 'utf8');

const scanSegments = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5541];
let s = 0;
let lines = content.split('\n');

console.log('--- Segment Scan (Cumulative Brace Depth) ---');
for (let seg of scanSegments) {
    let start = seg - 500;
    if (start < 0) start = 0;
    for (let i = start; i < seg && i < lines.length; i++) {
        for (let c of lines[i]) {
            if (c === '{') s++;
            if (c === '}') s--;
        }
    }
    console.log(`Up to line ${seg}: depth = ${s}`);
}
