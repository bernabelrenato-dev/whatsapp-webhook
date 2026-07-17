const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const keyword = 'executeIntegration';
      let idx = content.indexOf(keyword);
      while (idx !== -1) {
        // Look for definition: executeIntegration = async ... or similar
        console.log(`\nFound "executeIntegration" in: ${fullPath} at index ${idx}`);
        console.log('Context:\n', content.slice(Math.max(0, idx - 150), idx + 250));
        idx = content.indexOf(keyword, idx + 1);
      }
    }
  }
}

try {
  search('/app/apps/viewer/.next/server/chunks');
} catch (err) {
  console.error(err.message);
}
