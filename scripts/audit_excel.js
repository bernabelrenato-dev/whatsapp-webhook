const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dirPath = 'C:\\Users\\USER\\Downloads\\LISTAS';
const files = [
  'CHEAPER.xlsx',
  'CHIPER.xlsx',
  'EFSTOCK.xlsx',
  'PROMOPRIME.xlsx',
  'PROMOS.xlsx',
  'TIENDA PUBLI.xlsx'
];

let output = '';
function log(msg, ...args) {
  const line = msg + ' ' + args.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' ');
  console.log(line);
  output += line + '\n';
}

async function auditExcel(fileName) {
  const filePath = path.join(dirPath, fileName);
  log(`\n==================================================`);
  log(`Auditing: ${fileName}`);
  const stats = fs.statSync(filePath);
  log(`Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

  const t0 = Date.now();
  const workbookHeadersOnly = XLSX.readFile(filePath, { bookSheets: true });
  log(`Sheet names:`, workbookHeadersOnly.SheetNames);
  
  log(`Loading full workbook data...`);
  const workbook = XLSX.readFile(filePath);
  log(`Loaded in ${((Date.now() - t0)/1000).toFixed(2)}s`);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const ref = sheet['!ref'];
    log(`  Sheet: "${sheetName}" | Range: ${ref || 'Empty'}`);
    if (!ref) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    log(`    Total rows found in array: ${rows.length}`);
    
    if (rows.length > 0) {
      let headerRowIndex = 0;
      let headers = rows[headerRowIndex];
      while (headerRowIndex < Math.min(10, rows.length) && headers.filter(x => x).length < 2) {
        headerRowIndex++;
        headers = rows[headerRowIndex] || [];
      }
      
      log(`    Header row index: ${headerRowIndex}`);
      log(`    Headers:`, headers.filter(x => x !== '').slice(0, 15));
      
      log(`    Sample rows:`);
      for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 5, rows.length); i++) {
        log(`      Row ${i}:`, rows[i].slice(0, 10));
      }
    }
  }
}

async function run() {
  for (const file of files) {
    try {
      await auditExcel(file);
    } catch (err) {
      log(`Error auditing ${file}: ${err.message}`);
    }
  }
  fs.writeFileSync('scripts/audit_excel_output_utf8.txt', output, 'utf-8');
  log(`\nWritten output to scripts/audit_excel_output_utf8.txt`);
}

run();
