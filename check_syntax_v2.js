const fs = require('fs');
const content = fs.readFileSync('c:/Users/koush/antigravity/www/app.js', 'utf8');

let stack = [];
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let j = 0; j < line.length; j++) {
        let char = line[j];
        if (char === '{' || char === '(' || char === '[') {
            stack.push({ char, line: i + 1, col: j + 1 });
        } else if (char === '}' || char === ')' || char === ']') {
            if (stack.length === 0) {
                console.log(`STRAY '${char}' at line ${i + 1}, col ${j + 1}`);
                continue;
            }
            let last = stack.pop();
            if ((char === '}' && last.char !== '{') ||
                (char === ')' && last.char !== '(') ||
                (char === ']' && last.char !== '[')) {
                console.log(`MISMATCH: '${char}' at line ${i + 1}, col ${j + 1} pops '${last.char}' from line ${last.line}`);
            }
        }
    }
}
if (stack.length > 0) {
    stack.forEach(s => console.log(`UNCLOSED '${s.char}' at line ${s.line}, col ${s.col}`));
} else {
    console.log('--- ALL BALANCED ---');
}
