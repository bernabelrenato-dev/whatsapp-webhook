const fs = require('fs');

try {
  const content = fs.readFileSync('/app/apps/viewer/.next/server/chunks/[root-of-the-server]__04138720._.js', 'utf8');
  
  // Find module 343570
  const keyword = '343570,e=>';
  const idx = content.indexOf(keyword);
  if (idx === -1) {
    console.log('Module 343570 not found');
    return;
  }
  
  // Extract 15000 characters from this index
  const length = 15000;
  const chunk = content.slice(idx, idx + length);
  const formatted = chunk
    .replace(/;/g, ';\n')
    .replace(/{/g, '{\n')
    .replace(/}/g, '\n}\n');
    
  const lines = formatted.split('\n');
  console.log(`Total lines extracted: ${lines.length}`);
  
  // Print the first 250 lines
  for (let i = 0; i < Math.min(lines.length, 250); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
  
} catch (err) {
  console.error(err.message);
}
