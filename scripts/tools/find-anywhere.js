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
      const idx = content.indexOf('950045,e=>');
      if (idx !== -1) {
        console.log(`Found module definition in: ${fullPath} at index ${idx}`);
        console.log('Context:\n', content.slice(idx, idx + 2000).replace(/;/g, ';\n').replace(/{/g, '{\n').replace(/}/g, '\n}\n'));
        return;
      }
    }
  }
}

try {
  search('/app/apps/viewer/.next/server/chunks');
} catch (err) {
  console.error(err.message);
}
