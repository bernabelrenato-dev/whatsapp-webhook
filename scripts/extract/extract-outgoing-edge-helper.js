const fs = require('fs');

try {
  const content = fs.readFileSync('/app/apps/viewer/.next/server/chunks/[root-of-the-server]__04138720._.js', 'utf8');
  
  // Find module 683386
  const keyword = '683386,e=>';
  const idx = content.indexOf(keyword);
  if (idx === -1) {
    console.log('Module 683386 not found');
    return;
  }
  
  // Extract 10000 characters from this index
  const length = 10000;
  const chunk = content.slice(idx, idx + length);
  const formatted = chunk
    .replace(/;/g, ';\n')
    .replace(/{/g, '{\n')
    .replace(/}/g, '\n}\n');
    
  const lines = formatted.split('\n');
  console.log(`Total lines extracted: ${lines.length}`);
  
  // Print the first 100 lines
  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
  
} catch (err) {
  console.error(err.message);
}
