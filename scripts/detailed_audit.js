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

// Helper to check if a value is a cell coordinate or a header-like text
function isHeader(cellValue) {
  if (!cellValue) return false;
  const val = String(cellValue).trim().toLowerCase();
  return val.includes('código') || val.includes('codigo') || val.includes('producto') || val.includes('descrip') || val.includes('stock');
}

// Function to clean cell values
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
    
    // Find header row
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (row.some(cell => isHeader(cell))) {
        headerRowIndex = i;
        break;
      }
    }
    
    // Default to index 0 if not found
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }

    const headers = (rows[headerRowIndex] || []).map(clean);
    const colMap = {};
    headers.forEach((header, index) => {
      if (header) {
        colMap[getColumnLetter(index)] = header;
      }
    });

    // Detect columns indices for product code, name, and stock
    let codeColIdx = -1;
    let nameColIdx = -1;
    let stockColIdx = -1;
    let descColIdx = -1;

    headers.forEach((h, idx) => {
      const lowerH = h.toLowerCase();
      if (lowerH.includes('código') || lowerH.includes('codigo') || lowerH.includes('artículo') && codeColIdx === -1) {
        codeColIdx = idx;
      }
      if ((lowerH.includes('producto') || lowerH.includes('artículo') || lowerH.includes('descrip')) && nameColIdx === -1) {
        nameColIdx = idx;
      }
      if (lowerH.includes('stock') || lowerH.includes('cant') || lowerH.includes('final')) {
        stockColIdx = idx;
      }
      if (lowerH.includes('descrip') || lowerH.includes('detalle')) {
        descColIdx = idx;
      }
    });

    // If name and code are same or still not found, guess
    if (nameColIdx === -1) nameColIdx = codeColIdx !== -1 ? codeColIdx : 2;
    if (codeColIdx === -1) codeColIdx = 0;

    let validRows = 0;
    let productsCount = 0;
    let totalStock = 0;
    const sampleProducts = [];

    // Analyze rows after header
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      // Check if row is completely empty
      const isRowEmpty = row.every(cell => clean(cell) === '');
      if (isRowEmpty) continue;

      validRows++;

      // A new product is usually started if code or name is present
      const codeVal = clean(row[codeColIdx]);
      const nameVal = clean(row[nameColIdx]);
      const isNewProduct = codeVal !== '' || nameVal !== '';

      if (isNewProduct) {
        productsCount++;
        if (sampleProducts.length < 3 && (nameVal || codeVal)) {
          sampleProducts.push({
            code: codeVal,
            name: nameVal || clean(row[descColIdx]) || 'Unspecified',
            desc: descColIdx !== -1 ? clean(row[descColIdx]).slice(0, 100) : ''
          });
        }
      }

      // Parse stock
      if (stockColIdx !== -1) {
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
      sampleProducts
    });
  }

  return {
    fileName,
    fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
    sheets: sheetsResult
  };
}

async function auditDocx(fileName) {
  const filePath = path.join(dirPath, fileName);
  const stats = fs.statSync(filePath);
  
  const resultText = await mammoth.extractRawText({ path: filePath });
  const text = resultText.value;
  const resultHtml = await mammoth.convertToHtml({ path: filePath });
  const html = resultHtml.value;

  const tableMatches = html.match(/<table/g) || [];
  
  // Find product codes like AD-01, SMR-01, ZJ-A, etc.
  // Using a regex to match common product code formats
  const codeRegex = /\b[A-Za-z]+-[0-9A-Za-z]+\b/g;
  const codes = text.match(codeRegex) || [];
  const uniqueCodes = [...new Set(codes)];

  // Try to estimate stock sums
  // In the raw text, numbers followed by prices or alone in table cells are stocks.
  // Let's do a simple count of table rows.
  const trMatches = html.match(/<tr/g) || [];
  const estimatedRows = trMatches.length - tableMatches.length; // rough estimate of data rows

  return {
    fileName,
    fileSizeKB: (stats.size / 1024).toFixed(2),
    textLength: text.length,
    tablesCount: tableMatches.length,
    estimatedRows,
    uniqueCodesCount: uniqueCodes.length,
    sampleCodes: uniqueCodes.slice(0, 15),
    previewText: text.slice(0, 1000)
  };
}

async function auditPdf(fileName) {
  const filePath = path.join(dirPath, fileName);
  const stats = fs.statSync(filePath);

  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  const infoResult = await parser.getInfo({ parsePageInfo: true });
  await parser.destroy();

  const codeRegex = /\b[A-Za-z]+-[0-9A-Za-z]+\b/g;
  const codes = result.text.match(codeRegex) || [];
  const uniqueCodes = [...new Set(codes)];

  return {
    fileName,
    fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
    totalPages: infoResult.total,
    textLength: result.text.length,
    uniqueCodesCount: uniqueCodes.length,
    sampleCodes: uniqueCodes.slice(0, 15),
    previewText: result.text.slice(0, 1000)
  };
}

async function run() {
  const results = {
    excelFiles: [],
    docxFiles: [],
    pdfFiles: []
  };

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

  console.log('Auditing Word file...');
  try {
    const res = await auditDocx('COMPANY.docx');
    results.docxFiles.push(res);
    console.log(`Audited DOCX: COMPANY.docx`);
  } catch (err) {
    console.error(`Error auditing DOCX:`, err);
  }

  console.log('Auditing PDF file...');
  try {
    const res = await auditPdf('COMPANY.pdf');
    results.pdfFiles.push(res);
    console.log(`Audited PDF: COMPANY.pdf`);
  } catch (err) {
    console.error(`Error auditing PDF:`, err);
  }

  fs.writeFileSync('scripts/detailed_audit_results.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('Done! Wrote detailed audit results to scripts/detailed_audit_results.json');
}

run();
