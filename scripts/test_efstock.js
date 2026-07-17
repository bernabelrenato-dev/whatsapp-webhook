const XLSX = require('xlsx');
const path = require('path');
const wb = XLSX.readFile('C:\\Users\\USER\\Downloads\\LISTAS\\EFSTOCK.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
console.log('EFSTOCK Sheet 1, first 10 rows:');
for (let i = 0; i < 10; i++) {
  console.log(`Row ${i}:`, rows[i]);
}
