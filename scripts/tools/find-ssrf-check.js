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
      if (content.includes('ssrf') || content.includes('SSRF') || content.includes('isSafeUrl') || content.includes('safeUrl')) {
        console.log(`Potential SSRF check in file: ${fullPath}`);
        // Let's print some lines containing these keywords
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('ssrf') || line.includes('SSRF') || line.includes('isSafeUrl') || line.includes('safeUrl') || line.includes('localhost') || line.includes('docker.internal')) {
            console.log(`Line ${idx + 1}: ${line.slice(0, 300)}`);
          }
        });
      }
    }
  }
}

try {
  search('/app/apps/viewer/.next/server/chunks');
} catch (err) {
  console.error(err.message);
}
