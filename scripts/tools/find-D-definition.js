const fs = require('fs');

try {
  const content = fs.readFileSync('/app/apps/viewer/.next/server/chunks/[root-of-the-server]__04138720._.js', 'utf8');
  
  const startIdx = 519500 - 3000;
  const length = 6000;
  const chunk = content.slice(startIdx, startIdx + length);
  const formatted = chunk
    .replace(/;/g, ';\n')
    .replace(/{/g, '{\n')
    .replace(/}/g, '\n}\n');
    
  const lines = formatted.split('\n');
  console.log(`Total lines extracted: ${lines.length}`);
  
  // Find where D is defined (e.g. let D= or const D= or D=)
  lines.forEach((line, i) => {
    if (line.includes('D=') || line.includes('function D') || line.includes('D =')) {
      console.log(`Line ${i + 1}: ${line}`);
    }
  });
  
} catch (err) {
  console.error(err.message);
}
