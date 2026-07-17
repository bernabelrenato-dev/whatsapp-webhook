const fs = require('fs');

try {
  const content = fs.readFileSync('/app/apps/viewer/.next/server/chunks/[root-of-the-server]__9d4e42df._.js', 'utf8');
  
  const keyword = 'ssrf';
  let idx = content.toLowerCase().indexOf(keyword);
  while (idx !== -1) {
    console.log(`\nFound "ssrf" at index ${idx}`);
    console.log('Context:\n', content.slice(Math.max(0, idx - 150), idx + 250));
    idx = content.toLowerCase().indexOf(keyword, idx + 1);
  }
} catch (err) {
  console.error(err.message);
}
