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
    // Count how many cells contain at least one keyword
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
    
    // A valid header row should have at least 3 non-empty cells and at least 2 matching keywords
    if (nonEmptyCount >= 3 && matchCount >= 2) {
      // Check if it's not a sub-header or info row
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

    // Detect column indices
    let codeColIdx = -1;
    let nameColIdx = -1;
    let stockColIdx = -1;
    let colorColIdx = -1;
    let descColIdx = -1;
    let priceColIdx = -1;

    headers.forEach((h, idx) => {
      const lowerH = h.toLowerCase();
      if ((lowerH.includes('código') || lowerH.includes('codigo') || lowerH.includes('item') || lowerH.includes('cod')) && codeColIdx === -1) {
        codeColIdx = idx;
      }
      if ((lowerH.includes('producto') || lowerH.includes('artículo') || lowerH.includes('articulo') || lowerH.includes('descrip')) && nameColIdx === -1) {
        nameColIdx = idx;
      }
      if (lowerH.includes('stock') || lowerH.includes('cant') || lowerH.includes('final')) {
        stockColIdx = idx;
      }
      if (lowerH.includes('color')) {
        colorColIdx = idx;
      }
      if (lowerH.includes('descrip') || lowerH.includes('detalle') || lowerH.includes('producto')) {
        descColIdx = idx;
      }
      if (lowerH.includes('precio') || lowerH.includes('pu ') || lowerH.includes('x millar') || lowerH.includes('x ciento')) {
        priceColIdx = idx;
      }
    });

    // Fallbacks
    if (codeColIdx === -1) codeColIdx = 0;
    if (nameColIdx === -1) nameColIdx = descColIdx !== -1 ? descColIdx : (codeColIdx === 0 ? 1 : 0);
    if (stockColIdx === -1) {
      // search columns for stock-like headers in case it didn't match
      headers.forEach((h, idx) => {
        if (h.toLowerCase().includes('stock') || h.toLowerCase().includes('cant')) stockColIdx = idx;
      });
    }

    let validRows = 0;
    let productsCount = 0;
    let totalStock = 0;
    const sampleProducts = [];
    let currentProduct = null;

    // Helper to determine if a row represents a new product
    // rather than metadata or a variant
    function isNewProductRow(row, idx) {
      const codeVal = clean(row[codeColIdx]);
      const nameVal = clean(row[nameColIdx]);
      const descVal = descColIdx !== -1 ? clean(row[descColIdx]) : '';
      
      // If code is present, it's definitely a product
      if (codeVal !== '' && !codeVal.toLowerCase().includes('código') && !codeVal.toLowerCase().includes('codigo')) {
        return true;
      }

      // If code is empty but name/desc is present
      if (nameVal !== '') {
        const lowerName = nameVal.toLowerCase();
        // Check if it's metadata
        if (lowerName.startsWith('material:') || 
            lowerName.startsWith('medida:') || 
            lowerName.startsWith('medidas:') || 
            lowerName.startsWith('capacidad:') || 
            lowerName.startsWith('marca:') || 
            lowerName.startsWith('modelo:') || 
            lowerName.startsWith('caja x') || 
            lowerName.startsWith('presentación:') || 
            lowerName.startsWith('tinta:')) {
          return false;
        }
        
        // If it looks like actual description/metadata details rather than product name
        if (lowerName.includes('cm') && lowerName.includes('x') && lowerName.length < 30) {
          return false;
        }

        // If stock is present on the same row, it's highly likely to be a product or variant
        // but if code and name are empty and only color is present, it's a variant.
        // If name is present and not metadata, let's treat it as a product
        return true;
      }

      return false;
    }

    // Process rows after the header
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const isRowEmpty = row.every(cell => clean(cell) === '');
      if (isRowEmpty) continue;

      validRows++;

      const isNew = isNewProductRow(row, i);
      const codeVal = clean(row[codeColIdx]);
      const nameVal = clean(row[nameColIdx]);
      const descVal = descColIdx !== -1 ? clean(row[descColIdx]) : '';

      if (isNew) {
        productsCount++;
        currentProduct = {
          code: codeVal,
          name: nameVal || descVal,
          variants: []
        };
        if (sampleProducts.length < 3) {
          sampleProducts.push({
            code: codeVal || 'N/A',
            name: (nameVal || descVal).slice(0, 80),
            desc: descVal ? descVal.slice(0, 100) : ''
          });
        }
      }

      // Parse stock
      if (stockColIdx !== -1 && stockColIdx < row.length) {
        const stockStr = clean(row[stockColIdx]);
        if (stockStr !== '') {
          const stockNum = parseInt(stockStr.replace(/[^0-9-]/g, ''), 10);
          if (!isNaN(stockNum) && stockNum > 0) {
            totalStock += stockNum;
          }
        }
      }
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
        codeColIdx,
        nameColIdx,
        stockColIdx,
        colorColIdx,
        descColIdx,
        priceColIdx
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

  fs.writeFileSync('scripts/detailed_audit_results_v2.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('Done! Wrote v2 audit results to scripts/detailed_audit_results_v2.json');
}

run();
