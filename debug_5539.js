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
            if (stack.length > 0) {
                let last = stack.pop();
                if (i + 1 === 5539) {
                    console.log(`At 5539 col ${j + 1}: '${char}' pops '${last.char}' from line ${last.line}`);
                }
            } else {
                if (i + 1 === 5539) {
                    console.log(`At 5539 col ${j + 1}: '${char}' NOTHING TO POP`);
                }
            }
        }
    }
}
