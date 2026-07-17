const fs = require('fs');

try {
  const content = fs.readFileSync('/app/apps/viewer/.next/server/chunks/[root-of-the-server]__04138720._.js', 'utf8');
  
  // Find module 720532
  const keyword = '720532,e=>';
  const idx = content.indexOf(keyword);
  if (idx === -1) {
    console.log('Module 720532 not found');
    return;
  }
  
  // Just print the next 15000 characters from this index
  const length = 15000;
  console.log(`Module 720532 code (from index ${idx} to ${idx + length}):`);
  console.log(content.slice(idx, idx + length));
  
} catch (err) {
  console.error(err.message);
}
