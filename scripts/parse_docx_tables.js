const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function run() {
  const filePath = 'C:\\Users\\USER\\Downloads\\LISTAS\\COMPANY.docx';
  const result = await mammoth.convertToHtml({ path: filePath });
  const html = result.value;

  // Simple HTML parsing to extract table data
  // Let's count tables and see what products they contain
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let match;
  let tableIndex = 0;
  console.log('Tables found in COMPANY.docx:');
  
  while ((match = tableRegex.exec(html)) !== null) {
    tableIndex++;
    const tableContent = match[1];
    
    // Extract row texts
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    const rows = [];
    while ((trMatch = trRegex.exec(tableContent)) !== null) {
      const tdContent = trMatch[1];
      const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let tdMatch;
      const cells = [];
      while ((tdMatch = tdRegex.exec(tdContent)) !== null) {
        // Strip tags
        const cellText = tdMatch[1].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
        cells.push(cellText);
      }
      rows.push(cells);
    }
    
    console.log(`Table ${tableIndex}: ${rows.length} rows`);
    // Print first data row description if available
    if (rows.length > 1) {
      console.log(`  Headers:`, rows[0]);
      // Search for code and description
      for (let r = 1; r < Math.min(5, rows.length); r++) {
        console.log(`  Row ${r}:`, rows[r].slice(0, 8));
      }
    }
  }
}

run().catch(console.error);
