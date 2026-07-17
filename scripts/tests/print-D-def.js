const fs = require('fs');

try {
  const content = fs.readFileSync('/app/apps/viewer/.next/server/chunks/[root-of-the-server]__04138720._.js', 'utf8');
  const keyword = '101526,e=>';
  const idx = content.indexOf(keyword);
  
  const targetIdx = idx + 5520;
  console.log('Context of D definition:\n', content.slice(targetIdx, targetIdx + 300));
  
} catch (err) {
  console.error(err.message);
}
