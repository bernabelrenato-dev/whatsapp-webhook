const fs = require('fs');

try {
  const content = fs.readFileSync('/app/apps/viewer/.next/server/chunks/[root-of-the-server]__04138720._.js', 'utf8');
  
  const keyword = '720532,e=>';
  const startIdx = content.indexOf(keyword);
  if (startIdx === -1) {
    console.log('Module 720532 not found');
    return;
  }
  
  const chunk = content.slice(startIdx, startIdx + 35000);
  const formatted = chunk
    .replace(/;/g, ';\n')
    .replace(/{/g, '{\n')
    .replace(/}/g, '\n}\n');
    
  const lines = formatted.split('\n');
  
  // Print ONLY the first 142 lines
  for (let i = 0; i < Math.min(lines.length, 142); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
  
} catch (err) {
  console.error(err.message);
}
