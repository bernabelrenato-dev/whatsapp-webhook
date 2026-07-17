const fs = require('fs');

try {
  const content = fs.readFileSync('/app/apps/viewer/.next/server/chunks/[root-of-the-server]__04138720._.js', 'utf8');
  
  const keyword = 'getStartingPoint';
  let idx = content.indexOf(keyword);
  while (idx !== -1) {
    console.log(`\nFound "getStartingPoint" at index ${idx}`);
    console.log('Context:\n', content.slice(Math.max(0, idx - 150), idx + 250));
    idx = content.indexOf(keyword, idx + 1);
  }
} catch (err) {
  console.error(err.message);
}
