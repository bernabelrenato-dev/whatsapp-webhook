const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const LISTAS_DIR = 'C:\\Users\\USER\\Downloads\\LISTAS';
const files = [
  'CHEAPER.xlsx',
  'CHIPER.xlsx',
  'EFSTOCK.xlsx',
  'PROMOPRIME.xlsx',
  'PROMOS.xlsx',
  'TIENDA PUBLI.xlsx'
];

let logContent = '';
function log(msg) {
  console.log(msg);
  logContent += msg + '\n';
}

function analyzeFile(filename) {
  const filePath = path.join(LISTAS_DIR, filename);
  log(`\n========================================`);
  log(`Analyzing: ${filename}`);
  log(`========================================`);
  
  if (!fs.existsSync(filePath)) {
    log(`File not found: ${filePath}`);
    return;
  }

  try {
    const start = Date.now();
    const workbook = XLSX.readFile(filePath, { sheetRows: 20 }); // Read 20 rows
    const end = Date.now();
    log(`Loaded in ${end - start}ms`);
    log(`Sheets in workbook: ${JSON.stringify(workbook.SheetNames)}`);

    workbook.SheetNames.forEach(sheetName => {
      log(`\n--- Sheet: ${sheetName} ---`);
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (rows.length === 0) {
        log('Sheet is empty');
        return;
      }

      // Find first non-empty row
      let firstNonEmptyRowIdx = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].length > 0 && rows[i].some(cell => cell !== null && cell !== '')) {
          firstNonEmptyRowIdx = i;
          break;
        }
      }

      if (firstNonEmptyRowIdx === -1) {
        log('Sheet has only empty rows (checked first 20 rows)');
        return;
      }

      log(`First non-empty row index: ${firstNonEmptyRowIdx + 1}`);
      log(`Columns count: ${rows[firstNonEmptyRowIdx].length}`);

      const rowsToShow = rows.slice(firstNonEmptyRowIdx, firstNonEmptyRowIdx + 5);
      rowsToShow.forEach((row, i) => {
        log(`Row ${firstNonEmptyRowIdx + i + 1}: ${JSON.stringify(row.slice(0, 10))}`);
      });
    });
  } catch (err) {
    log(`Error reading ${filename}: ${err.message}`);
  }
}

files.forEach(analyzeFile);

fs.writeFileSync('C:\\Users\\USER\\.gemini\\antigravity\\brain\\18e35724-c39c-4b1a-870c-9daef7dd5329\\scratch\\analysis_summary.txt', logContent);
console.log('Analysis finished! Written to scratch/analysis_summary.txt');
