const fs = require('fs');

try {
  const content = fs.readFileSync('/app/apps/viewer/.next/server/chunks/[root-of-the-server]__04138720._.js', 'utf8');
  
  // Find handleStartChat
  const keyword = 'handleStartChat';
  const keywordIdx = content.indexOf(keyword);
  if (keywordIdx === -1) {
    console.log('Keyword not found');
    return;
  }
  
  // We want to find the start of this block. Let's look backward for the function pattern.
  // In Next.js/Turbopack, modules usually look like:
  // ,123456,e=>e.a(async(t,r)=>{try{...}
  // Let's search backwards from keywordIdx for something like "async(" or "e=>e.a(" or a number followed by commas.
  let startIdx = content.lastIndexOf(',e=>e.a(async(', keywordIdx);
  if (startIdx === -1) {
    startIdx = content.lastIndexOf('e.a(async(', keywordIdx);
  }
  if (startIdx === -1) {
    startIdx = Math.max(0, keywordIdx - 3000); // Fallback
  }
  
  // Find the end of this block by matching brackets or looking for the next module registration like e.s([
  let endIdx = content.indexOf('e.s([', keywordIdx);
  if (endIdx !== -1) {
    endIdx = content.indexOf('},', endIdx);
  }
  if (endIdx === -1) {
    endIdx = Math.min(content.length, keywordIdx + 3000); // Fallback
  }
  
  console.log(`Module code (from index ${startIdx} to ${endIdx}):`);
  console.log(content.slice(startIdx, endIdx + 20));
  
} catch (err) {
  console.error(err.message);
}
