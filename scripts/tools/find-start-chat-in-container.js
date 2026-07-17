const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      let idx = content.indexOf('startChat');
      while (idx !== -1) {
        console.log(`\nFound "startChat" in: ${fullPath} at index ${idx}`);
        console.log('Context:\n', content.slice(Math.max(0, idx - 150), idx + 250));
        idx = content.indexOf('startChat', idx + 1);
      }
    }
  }
}

try {
  searchDir('/app/apps/viewer/.next/server/chunks');
} catch (err) {
  console.error(err.message);
}
