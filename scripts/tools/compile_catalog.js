const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const LISTAS_DIR = 'C:\\Users\\USER\\Downloads\\LISTAS';
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'src', 'config', 'catalog.json');

const catalog = [];

function cleanPrice(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return val;
  
  // Clean string
  let str = val.toString().toUpperCase().trim();
  str = str.replace(/S\/\.?\s*/g, ''); // Remove S/
  str = str.replace(/S\/\.?/g, '');
  str = str.replace(/INCLUIDO\s*IGV/g, ''); // Remove IGV
  str = str.replace(/INCL.\s*IGV/g, '');
  str = str.replace(/C\/U/g, '');
  str = str.replace(/,/g, ''); // Remove commas
  
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function cleanStock(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Math.floor(val);
  const num = parseInt(val.toString().replace(/,/g, '').trim(), 10);
  return isNaN(num) ? 0 : num;
}

function cleanString(val) {
  if (val === undefined || val === null) return '';
  return val.toString().trim();
}

function parseFileCheaperChiper(filename) {
  const filePath = path.join(LISTAS_DIR, filename);
  if (!fs.existsSync(filePath)) return;

  const workbook = XLSX.readFile(filePath);
  workbook.SheetNames.forEach(sheetName => {
    if (sheetName === 'Datos Empresa') return;
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Find header row
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].includes('CODIGO') && rows[i].includes('PRODUCTO')) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) return;

    const headers = rows[headerIdx].map(h => cleanString(h).toUpperCase());
    const codeIdx = headers.indexOf('CODIGO');
    const productIdx = headers.indexOf('PRODUCTO');
    const colorIdx = headers.indexOf('COLOR');
    const stockIdx = headers.indexOf('STOCK FINAL');
    
    // Prices
    let priceMillarIdx = -1;
    let priceCientoIdx = -1;
    let priceMuestraIdx = -1;
    
    headers.forEach((h, idx) => {
      if (h.includes('MILLAR')) priceMillarIdx = idx;
      if (h.includes('CIENTO')) priceCientoIdx = idx;
      if (h.includes('MUESTRA')) priceMuestraIdx = idx;
    });
    
    const descIdx = headers.indexOf('DESCRIPCIÓN');

    let currentCode = '';
    let currentProduct = '';
    let currentDesc = '';

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const code = cleanString(row[codeIdx]);
      const product = cleanString(row[productIdx]);
      const desc = cleanString(row[descIdx]);

      if (code) currentCode = code;
      if (product) currentProduct = product;
      if (desc) currentDesc = desc;

      const color = cleanString(row[colorIdx]);
      const stock = cleanStock(row[stockIdx]);

      // Parse price per unit
      let pMillar = cleanPrice(row[priceMillarIdx]); // S/250 per millar -> S/0.25 unit
      let pCiento = cleanPrice(row[priceCientoIdx]); // S/27 per ciento -> S/0.27 unit
      let pMuestra = cleanPrice(row[priceMuestraIdx]);

      // If prices are stored as package prices (e.g. S/250 per millar), convert to unit price
      if (pMillar !== null) {
        if (pMillar > 50) {
          // If it's a large value, it's package price (e.g., S/250 per 1000 items)
          pMillar = pMillar / 1000;
        }
      }
      if (pCiento !== null) {
        if (pCiento > 15 && (currentCode.startsWith('3') || currentProduct.toUpperCase().includes('LAPICERO'))) {
          // If it's lapicero and high price, it's per hundred
          pCiento = pCiento / 100;
        }
      }

      if (!currentCode && !currentProduct) continue;

      catalog.push({
        code: currentCode,
        name: currentProduct,
        description: currentDesc,
        color: color || 'Varios',
        stock: stock,
        price_500: pMillar,
        price_50: pCiento,
        price_1: pMuestra,
        source: filename,
        category: sheetName
      });
    }
  });
}

function parseFileEFStock(filename) {
  const filePath = path.join(LISTAS_DIR, filename);
  if (!fs.existsSync(filePath)) return;

  const workbook = XLSX.readFile(filePath);
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Find header row (usually contains CODIGO and PRODUCTO)
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].includes('CODIGO') && rows[i].includes('PRODUCTO')) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) return;

    const headers = rows[headerIdx].map(h => cleanString(h).toUpperCase());
    const codeIdx = headers.indexOf('CODIGO');
    const productIdx = headers.indexOf('PRODUCTO');
    const colorIdx = headers.indexOf('COLOR');
    const stockIdx = headers.indexOf('STOCK FINAL');
    
    let priceMillarIdx = -1;
    let priceCientoIdx = -1;
    let priceMuestraIdx = -1;
    
    headers.forEach((h, idx) => {
      if (h.includes('MILLAR')) priceMillarIdx = idx;
      if (h.includes('CIENTO')) priceCientoIdx = idx;
      if (h.includes('MUESTRA')) priceMuestraIdx = idx;
    });
    
    const descIdx = headers.indexOf('DESCRIPCION');

    let currentCode = '';
    let currentProduct = '';
    let currentDesc = '';

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const code = cleanString(row[codeIdx]);
      const product = cleanString(row[productIdx]);
      const desc = cleanString(row[descIdx]);

      if (code) currentCode = code;
      if (product) currentProduct = product;
      if (desc) currentDesc = desc;

      const color = cleanString(row[colorIdx]);
      const stock = cleanStock(row[stockIdx]);

      let pMillar = cleanPrice(row[priceMillarIdx]);
      let pCiento = cleanPrice(row[priceCientoIdx]);
      let pMuestra = cleanPrice(row[priceMuestraIdx]);

      // Normalize package price
      if (pMillar !== null && pMillar > 50) pMillar = pMillar / 1000;
      if (pCiento !== null && pCiento > 15 && (currentProduct.toUpperCase().includes('LAPICERO') || sheetName.includes('LAPICEROS'))) pCiento = pCiento / 100;

      if (!currentCode && !currentProduct) continue;

      catalog.push({
        code: currentCode,
        name: currentProduct,
        description: currentDesc,
        color: color || 'Varios',
        stock: stock,
        price_500: pMillar,
        price_50: pCiento,
        price_1: pMuestra,
        source: filename,
        category: sheetName
      });
    }
  });
}

function parseFilePromos(filename) {
  const filePath = path.join(LISTAS_DIR, filename);
  if (!fs.existsSync(filePath)) return;

  const workbook = XLSX.readFile(filePath);
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Find header row (usually contains LINEA, CÓDIGO, ARTÍCULO)
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].includes('CÓDIGO') && rows[i].includes('ARTÍCULO')) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) return;

    const headers = rows[headerIdx].map(h => cleanString(h).toUpperCase());
    const lineIdx = headers.indexOf('LINEA');
    const codeIdx = headers.indexOf('CÓDIGO');
    const articleIdx = headers.indexOf('ARTÍCULO');
    const sysCodeIdx = headers.indexOf('CÓDIGO SISTEMA');
    const colorIdx = headers.indexOf('COLOR');
    const stockIdx = headers.indexOf('STOCK');
    const price500Idx = headers.indexOf('A PARTIR DE 500 UND');
    const price50Idx = headers.indexOf('A PARTIR DE 50 UNID');
    const price1Idx = headers.indexOf('DE 1 A 49 UNID');
    const descIdx = headers.indexOf('DESCRIPCION');

    let currentLine = '';
    let currentCode = '';
    let currentArticle = '';
    let currentSysCode = '';
    let currentDesc = '';

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const line = cleanString(row[lineIdx]);
      const code = cleanString(row[codeIdx]);
      const article = cleanString(row[articleIdx]);
      const sysCode = cleanString(row[sysCodeIdx]);
      const desc = cleanString(row[descIdx]);

      if (line) currentLine = line;
      if (code) currentCode = code;
      if (article) currentArticle = article;
      if (sysCode) currentSysCode = sysCode;
      if (desc) currentDesc = desc;

      const color = cleanString(row[colorIdx]);
      const stock = cleanStock(row[stockIdx]);

      const p500 = cleanPrice(row[price500Idx]);
      const p50 = cleanPrice(row[price50Idx]);
      const p1 = cleanPrice(row[price1Idx]);

      if (!currentCode && !currentArticle) continue;

      catalog.push({
        code: currentCode,
        name: currentArticle,
        description: currentDesc || currentLine,
        color: color || 'Varios',
        stock: stock,
        price_500: p500,
        price_50: p50,
        price_1: p1,
        source: filename,
        category: sheetName
      });
    }
  });
}

function parseFileTiendaPubli(filename) {
  const filePath = path.join(LISTAS_DIR, filename);
  if (!fs.existsSync(filePath)) return;

  const workbook = XLSX.readFile(filePath);
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Find header row (usually contains PRODUCTO , DESCRIPCION x PRODUCTO)
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].some(cell => cleanString(cell).toUpperCase().includes('DESCRIPCION x PRODUCTO'))) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) return;

    const headers = rows[headerIdx].map(h => cleanString(h).toUpperCase());
    const prodIdx = headers.findIndex(h => h.includes('PRODUCTO'));
    const descIdx = headers.findIndex(h => h.includes('DESCRIPCION'));
    const detailIdx = headers.findIndex(h => h.includes('DETALLE'));
    const colorIdx = headers.indexOf('COLOR');
    const stockIdx = headers.indexOf('STOCK');
    const price500Idx = headers.findIndex(h => h.includes('500 A 1000') || h.includes('500 UND'));
    const price50Idx = headers.findIndex(h => h.includes('50 A 499') || h.includes('50 UNID'));
    const price1Idx = headers.findIndex(h => h.includes('1 A 49'));

    let currentProd = '';
    let currentDesc = '';
    let currentDetail = '';

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const prod = cleanString(row[prodIdx]);
      const desc = cleanString(row[descIdx]);
      const detail = cleanString(row[detailIdx]);

      if (prod) currentProd = prod;
      if (desc) currentDesc = desc;
      if (detail) currentDetail = detail;

      const color = cleanString(row[colorIdx]);
      const stock = cleanStock(row[stockIdx]);

      const p500 = cleanPrice(row[price500Idx]);
      const p50 = cleanPrice(row[price50Idx]);
      const p1 = cleanPrice(row[price1Idx]);

      if (!currentProd && !currentDesc) continue;

      catalog.push({
        code: currentProd,
        name: currentDesc,
        description: currentDetail,
        color: color || 'Varios',
        stock: stock,
        price_500: p500,
        price_50: p50,
        price_1: p1,
        source: filename,
        category: sheetName
      });
    }
  });
}

console.log('Compiling catalog...');
parseFileCheaperChiper('CHEAPER.xlsx');
parseFileCheaperChiper('CHIPER.xlsx');
parseFileEFStock('EFSTOCK.xlsx');
parseFilePromos('PROMOS.xlsx');
parseFileTiendaPubli('TIENDA PUBLI.xlsx');

// Filter empty items
const finalCatalog = catalog.filter(item => item.name && (item.price_500 || item.price_50 || item.price_1));

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalCatalog, null, 2));
console.log(`Finished compiling!`);
console.log(`Total products parsed: ${catalog.length}`);
console.log(`Total active products with prices: ${finalCatalog.length}`);
console.log(`Catalog file saved to: src/config/catalog.json`);
