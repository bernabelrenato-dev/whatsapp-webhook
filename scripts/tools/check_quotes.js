const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'create_gcp_resources.ps1');
const content = fs.readFileSync(filePath, 'utf8');

let inDoubleQuote = false;
let inSingleQuote = false;
let escape = false;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  
  if (escape) {
    escape = false;
    continue;
  }
  
  if (char === '`') {
    escape = true;
    continue;
  }
  
  if (char === '"' && !inSingleQuote) {
    inDoubleQuote = !inDoubleQuote;
    if (inDoubleQuote) {
      // Find line number
      const lineNum = content.substring(0, i).split('\n').length;
      console.log(`[Quote Open] Line ${lineNum} at char ${i}`);
    } else {
      const lineNum = content.substring(0, i).split('\n').length;
      console.log(`[Quote Close] Line ${lineNum} at char ${i}`);
    }
  }
  
  if (char === "'" && !inDoubleQuote) {
    inSingleQuote = !inSingleQuote;
  }
}

console.log('Final State:');
console.log('inDoubleQuote:', inDoubleQuote);
console.log('inSingleQuote:', inSingleQuote);
