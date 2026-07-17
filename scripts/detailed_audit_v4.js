const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const { PDFParse } = require('pdf-parse');

const dirPath = 'C:\\Users\\USER\\Downloads\\LISTAS';
const excelFiles = [
  'CHEAPER.xlsx',
  'CHIPER.xlsx',
  'EFSTOCK.xlsx',
  'PROMOPRIME.xlsx',
  'PROMOS.xlsx',
  'TIENDA PUBLI.xlsx'
];

function clean(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

function getColumnLetter(colIndex) {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Robust header row detection
function findHeaderRow(rows) {
  const keywords = ['código', 'codigo', 'producto', 'descrip', 'stock', 'precio', 'color', 'detalle', 'artículo', 'articulo', 'item', 'imagen'];
  
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const row = rows[i] || [];
    let matchCount = 0;
    let nonEmptyCount = 0;
    
    row.forEach(cell => {
      const val = clean(cell).toLowerCase();
      if (val !== '') {
        nonEmptyCount++;
        if (keywords.some(k => val.includes(k))) {
          matchCount++;
        }
      }
    });
    
    if (nonEmptyCount >= 3 && matchCount >= 2) {
      const firstCell = clean(row[0] || row[1] || '').toLowerCase();
      if (!firstCell.includes('actualizado') && !firstCell.includes('empresa')) {
        return i;
      }
    }
  }
  return 0; // fallback
}

async function auditExcel(fileName) {
  const filePath = path.join(dirPath, fileName);
  const stats = fs.statSync(filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetsResult = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const ref = sheet['!ref'];
    if (!ref) {
      sheetsResult.push({ sheetName, range: 'Empty', rowCount: 0, validRows: 0, productsCount: 0, totalStock: 0, headers: [], colMap: {} });
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length === 0) {
      sheetsResult.push({ sheetName, range: ref, rowCount: 0, validRows: 0, productsCount: 0, totalStock: 0, headers: [], colMap: {} });
      continue;
    }

    const headerRowIndex = findHeaderRow(rows);
    const rawHeaders = rows[headerRowIndex] || [];
    const headers = rawHeaders.map(clean);
    
    const colMap = {};
    headers.forEach((header, index) => {
      if (header) {
        colMap[getColumnLetter(index)] = header;
      }
    });

    // Detect columns mapping
    const codeColumns = [];
    const nameColumns = [];
    const stockColumns = [];
    const colorColumns = [];
    const priceColumns = [];
    let descColIdx = -1;

    headers.forEach((h, idx) => {
      const lowerH = h.toLowerCase();
      if (lowerH.includes('código') || lowerH.includes('codigo') || lowerH.includes('item') || lowerH.includes('cod') || lowerH.includes('sku')) {
        codeColumns.push(idx);
      }
      if (lowerH.includes('producto') || lowerH.includes('artículo') || lowerH.includes('articulo') || lowerH.includes('descrip') || lowerH.includes('name') || lowerH.includes('nom')) {
        nameColumns.push(idx);
      }
      if (lowerH.includes('stock') || lowerH.includes('cant') || lowerH.includes('final') || lowerH.includes('qty') || lowerH.includes('unid')) {
        stockColumns.push(idx);
      }
      if (lowerH.includes('color')) {
        colorColumns.push(idx);
      }
      if (lowerH.includes('precio') || lowerH.includes('pu ') || lowerH.includes('x millar') || lowerH.includes('x ciento') || lowerH.includes('1 a 49') || lowerH.includes('50 a 499') || lowerH.includes('500 a 1000')) {
        priceColumns.push(idx);
      }
      if (lowerH.includes('descrip') || lowerH.includes('detalle')) {
        descColIdx = idx;
      }
    });

    // Fallbacks
    if (codeColumns.length === 0) codeColumns.push(0);
    if (nameColumns.length === 0) nameColumns.push(descColIdx !== -1 ? descColIdx : (codeColumns[0] === 0 ? 1 : 0));
    if (stockColumns.length === 0) {
      headers.forEach((h, idx) => {
        if (h.toLowerCase().includes('stock') || h.toLowerCase().includes('cant')) stockColumns.push(idx);
      });
    }

    let validRows = 0;
    let productsCount = 0;
    let totalStock = 0;
    const sampleProducts = [];

    // Process rows after the header
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const isRowEmpty = row.every(cell => clean(cell) === '');
      if (isRowEmpty) continue;

      validRows++;

      // Check if row has at least one transactional column populated (color, stock, or price)
      let hasStock = false;
      stockColumns.forEach(idx => {
        if (idx < row.length && clean(row[idx]) !== '') hasStock = true;
      });

      let hasColor = false;
      colorColumns.forEach(idx => {
        if (idx < row.length && clean(row[idx]) !== '') hasColor = true;
      });

      let hasPrice = false;
      priceColumns.forEach(idx => {
        if (idx < row.length && clean(row[idx]) !== '') hasPrice = true;
      });

      // If it doesn't have stock, color, or price, it is a text description row, skip it!
      if (!hasStock && !hasColor && !hasPrice) {
        continue;
      }

      // Check if it starts a new product
      let hasCode = false;
      let codeStr = '';
      codeColumns.forEach(idx => {
        if (idx < row.length) {
          const val = clean(row[idx]);
          if (val !== '' && !val.toLowerCase().includes('código') && !val.toLowerCase().includes('codigo')) {
            hasCode = true;
            codeStr = val;
          }
        }
      });

      let hasName = false;
      let nameStr = '';
      nameColumns.forEach(idx => {
        if (idx < row.length) {
          const val = clean(row[idx]);
          if (val !== '') {
            const lower = val.toLowerCase();
            if (!lower.startsWith('material:') && 
                !lower.startsWith('medida:') && 
                !lower.startsWith('medidas:') && 
                !lower.startsWith('capacidad:') && 
                !lower.startsWith('marca:') && 
                !lower.startsWith('modelo:') && 
                !lower.startsWith('caja x') && 
                !lower.startsWith('presentación:') && 
                !lower.startsWith('tinta:') &&
                !lower.startsWith('detalles:') &&
                !(lower.includes('cm') && lower.includes('x') && lower.length < 35)) {
              hasName = true;
              nameStr = val;
            }
          }
        }
      });

      // If it has code or name, and has transactional data, count it as a new product!
      if (hasCode || hasName) {
        productsCount++;
        if (sampleProducts.length < 3) {
          sampleProducts.push({
            code: codeStr || 'N/A',
            name: (nameStr || clean(row[descColIdx]) || 'Unspecified').slice(0, 80),
            desc: descColIdx !== -1 && descColIdx < row.length ? clean(row[descColIdx]).slice(0, 100) : ''
          });
        }
      }

      // Sum stock
      stockColumns.forEach(idx => {
        if (idx >= row.length) return;
        const stockStr = clean(row[idx]);
        if (stockStr !== '') {
          const stockNum = parseInt(stockStr.replace(/[^0-9-]/g, ''), 10);
          if (!isNaN(stockNum) && stockNum > 0) {
            totalStock += stockNum;
          }
        }
      });
    }

    sheetsResult.push({
      sheetName,
      range: ref,
      rowCount: rows.length,
      validRows,
      productsCount,
      totalStock,
      headers: headers.filter(h => h !== ''),
      colMap,
      sampleProducts,
      detectedCols: {
        codeColumns,
        nameColumns,
        stockColumns,
        colorColumns,
        priceColumns,
        descColIdx
      }
    });
  }

  return {
    fileName,
    fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
    sheets: sheetsResult
  };
}

async function run() {
  const results = { excelFiles: [] };
  console.log('Auditing Excel files...');
  for (const file of excelFiles) {
    try {
      const res = await auditExcel(file);
      results.excelFiles.push(res);
      console.log(`Audited Excel: ${file}`);
    } catch (err) {
      console.error(`Error auditing Excel ${file}:`, err);
    }
  }

  fs.writeFileSync('scripts/detailed_audit_results_v4.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('Done! Wrote v4 audit results to scripts/detailed_audit_results_v4.json');
}

run();
