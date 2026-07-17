const fs = require('fs');

try {
  const content = fs.readFileSync('/app/apps/viewer/.next/server/chunks/[root-of-the-server]__04138720._.js', 'utf8');
  
  // Find module 101526
  const keyword = '101526,e=>';
  const idx = content.indexOf(keyword);
  if (idx === -1) {
    console.log('Module 101526 not found');
    return;
  }
  
  // Extract module code up to 100000 characters (or until next module starts)
  const moduleCode = content.slice(idx, idx + 50000);
  
  // Find all matches for "const D =" or "let D =" or "function D(" or "D ="
  const regex = /\b(let|const|function)?\s*D\s*=\s*[^,;]+/g;
  let match;
  console.log('Searching for declarations of D:');
  while ((match = regex.exec(moduleCode)) !== null) {
    console.log(`Found match: ${match[0]} at index ${match.index}`);
  }
  
} catch (err) {
  console.error(err.message);
}
