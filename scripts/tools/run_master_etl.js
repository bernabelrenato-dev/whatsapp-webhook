const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const LISTAS_DIR = 'C:\\Users\\USER\\Downloads\\LISTAS';
const BASE_DIR = path.join(__dirname, '..', '..');
const OUTPUT_CSV = path.join(BASE_DIR, 'docs', 'GOOGLE_SHEETS_MASTER_JGIS.csv');
const OUTPUT_JSON = path.join(BASE_DIR, 'src', 'config', 'catalog_master_v2.json');

console.log('================================================================');
console.log(' PIPELINE ETL UNIFICADO DE CATALOGOS — JGIS PUBLICIDAD (V2)');
console.log('================================================================');

const masterProducts = [];

// Helper para limpiar cadenas
function cleanStr(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/[\r\n]+/g, ' ').trim().replace(/\s+/g, ' ');
}

// Helper para limpiar precios numéricos
function parseNumPrice(val) {
  if (!val && val !== 0) return null;
  const str = String(val).toUpperCase().replace(/S\/\.?\s*/g, '').replace(/,/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? null : num;
}

// Helper para limpiar stock
function parseStock(val) {
  if (!val && val !== 0) return 0;
  const str = String(val).replace(/,/g, '').trim();
  const num = parseInt(str, 10);
  return isNaN(num) || num < 0 ? 0 : num;
}

// Mapa de colores canónicos básico
function resolveColorBase(rawColor) {
  if (!rawColor) return 'MULTICOLOR';
  const c = rawColor.toUpperCase();
  if (c.includes('AZUL') || c.includes('NAVY')) return 'AZUL';
  if (c.includes('ROJO') || c.includes('CORAL')) return 'ROJO';
  if (c.includes('NEGRO')) return 'NEGRO';
  if (c.includes('BLANCO')) return 'BLANCO';
  if (c.includes('VERDE')) return 'VERDE';
  if (c.includes('AMARILLO')) return 'AMARILLO';
  if (c.includes('GRIS') || c.includes('PLOMO') || c.includes('SILVER')) return 'GRIS';
  if (c.includes('NATURAL') || c.includes('CORCHO') || c.includes('BAMBU')) return 'NATURAL';
  if (c.includes('DORADO') || c.includes('GOLD')) return 'DORADO';
  if (c.includes('ROSADO') || c.includes('PINK')) return 'ROSADO';
  return 'MULTICOLOR';
}

// 1. ETL PROVEEDOR: CHIPER / CHEAPER
function processChiper(filename) {
  const filePath = path.join(LISTAS_DIR, filename);
  if (!fs.existsSync(filePath)) return;
  console.log(`\n📌 Procesando Chiper desde: ${filename}...`);

  const workbook = xlsx.readFile(filePath);
  let count = 0;

  workbook.SheetNames.forEach(sheetName => {
    if (sheetName.toLowerCase().includes('empresa') || sheetName.toLowerCase().includes('datos')) return;

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    let currentProduct = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const codeCell = cleanStr(row[0]);
      const nameCell = cleanStr(row[2]);
      const colorCell = cleanStr(row[3]);
      const stockCell = parseStock(row[4]);
      const price500Raw = parseNumPrice(row[5]);
      const price100Raw = parseNumPrice(row[7]);
      const price1Raw = parseNumPrice(row[8]);
      const descCell = cleanStr(row[9]);

      if (codeCell !== '') {
        // Fila Producto
        currentProduct = {
          code: codeCell,
          name: nameCell || codeCell,
          category: sheetName.replace(/^\d+/, '').trim(),
          description: descCell,
          price500: price500Raw ? (price500Raw > 50 ? price500Raw / 1000 : price500Raw) : null,
          price100: price100Raw ? (price100Raw > 10 ? price100Raw / 100 : price100Raw) : null,
          price1: price1Raw
        };
      }

      if (currentProduct && (colorCell !== '' || stockCell >= 0)) {
        const p500 = currentProduct.price500;
        const p100 = currentProduct.price100;
        const p1 = currentProduct.price1;

        masterProducts.push({
          sku: `CHIPER-${currentProduct.code}-${colorCell || 'BASE'}`.toUpperCase().replace(/\s+/g, '-'),
          proveedor: 'Chiper',
          categoria: currentProduct.category,
          codigo_proveedor: currentProduct.code,
          nombre: currentProduct.name,
          variante_color: colorCell || 'VARIOS',
          color_base: resolveColorBase(colorCell),
          stock: stockCell,
          stock_transito: 0,
          precio_500u: p500 ? p500.toFixed(2) : '',
          precio_500u_igv: p500 ? (p500 * 1.18).toFixed(2) : '',
          precio_100u: p100 ? p100.toFixed(2) : '',
          precio_100u_igv: p100 ? (p100 * 1.18).toFixed(2) : '',
          precio_1u: p1 ? p1.toFixed(2) : '',
          precio_1u_igv: p1 ? (p1 * 1.18).toFixed(2) : '',
          foto_url: `https://bot.jgispublicidad.pe/images/${currentProduct.code}.jpg`,
          descripcion: currentProduct.description,
          estado_aprobado: 'Approved'
        });
        count++;
      }
    }
  });
  console.log(`   ✅ Extraídas ${count} variantes de Chiper (${filename})`);
}

// 2. ETL PROVEEDOR: EFSTOCK
function processEFStock() {
  const filename = 'EFSTOCK.xlsx';
  const filePath = path.join(LISTAS_DIR, filename);
  if (!fs.existsSync(filePath)) return;
  console.log(`\n📌 Procesando EFStock desde: ${filename}...`);

  const workbook = xlsx.readFile(filePath);
  let count = 0;

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    let currentProduct = null;

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i] || [];
      const codeCell = cleanStr(row[1]);
      const nameCell = cleanStr(row[3]);
      const colorCell = cleanStr(row[4]);
      const stockCell = parseStock(row[5]);
      const price500Raw = parseNumPrice(row[6]);
      const price100Raw = parseNumPrice(row[7]);
      const price1Raw = parseNumPrice(row[8]);
      const descCell = cleanStr(row[9]);

      if (codeCell !== '') {
        currentProduct = {
          code: codeCell,
          name: nameCell || codeCell,
          category: sheetName.trim(),
          description: descCell,
          price500: price500Raw ? (price500Raw > 50 ? price500Raw / 1000 : price500Raw) : null,
          price100: price100Raw ? (price100Raw > 10 ? price100Raw / 100 : price100Raw) : null,
          price1: price1Raw
        };
      }

      if (currentProduct && (colorCell !== '' || stockCell >= 0)) {
        const p500 = currentProduct.price500;
        const p100 = currentProduct.price100;
        const p1 = currentProduct.price1;

        masterProducts.push({
          sku: `EF-${currentProduct.code}-${colorCell || 'BASE'}`.toUpperCase().replace(/\s+/g, '-'),
          proveedor: 'EFStock',
          categoria: currentProduct.category,
          codigo_proveedor: currentProduct.code,
          nombre: currentProduct.name,
          variante_color: colorCell || 'VARIOS',
          color_base: resolveColorBase(colorCell),
          stock: stockCell,
          stock_transito: 0,
          precio_500u: p500 ? p500.toFixed(2) : '',
          precio_500u_igv: p500 ? (p500 * 1.18).toFixed(2) : '',
          precio_100u: p100 ? p100.toFixed(2) : '',
          precio_100u_igv: p100 ? (p100 * 1.18).toFixed(2) : '',
          precio_1u: p1 ? p1.toFixed(2) : '',
          precio_1u_igv: p1 ? (p1 * 1.18).toFixed(2) : '',
          foto_url: `https://bot.jgispublicidad.pe/images/${currentProduct.code}.jpg`,
          descripcion: currentProduct.description,
          estado_aprobado: 'Approved'
        });
        count++;
      }
    }
  });
  console.log(`   ✅ Extraídas ${count} variantes de EFStock`);
}

// 3. ETL PROVEEDOR: TIENDA PUBLI
function processTiendaPubli() {
  const filename = 'TIENDA PUBLI.xlsx';
  const filePath = path.join(LISTAS_DIR, filename);
  if (!fs.existsSync(filePath)) return;
  console.log(`\n📌 Procesando Tienda Publi desde: ${filename}...`);

  const workbook = xlsx.readFile(filePath);
  let count = 0;

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i] || [];
      const nameCell = cleanStr(row[0]);
      if (!nameCell) continue;

      const descCell = cleanStr(row[1]);
      const colorCell = cleanStr(row[3]);
      const stockCell = parseStock(row[4]);
      const p500 = parseNumPrice(row[5]);
      const p100 = parseNumPrice(row[6]);
      const p1 = parseNumPrice(row[7]);

      const cleanCode = nameCell.split(' ')[0].toUpperCase();

      masterProducts.push({
        sku: `TP-${cleanCode}-${colorCell || 'BASE'}-${i}`.toUpperCase().replace(/\s+/g, '-'),
        proveedor: 'Tienda Publi',
        categoria: sheetName.trim(),
        codigo_proveedor: cleanCode,
        nombre: nameCell,
        variante_color: colorCell || 'VARIOS',
        color_base: resolveColorBase(colorCell),
        stock: stockCell,
        stock_transito: 0,
        precio_500u: p500 ? p500.toFixed(2) : '',
        precio_500u_igv: p500 ? p500.toFixed(2) : '', // Tienda Publi ya incluye IGV
        precio_100u: p100 ? p100.toFixed(2) : '',
        precio_100u_igv: p100 ? p100.toFixed(2) : '',
        precio_1u: p1 ? p1.toFixed(2) : '',
        precio_1u_igv: p1 ? p1.toFixed(2) : '',
        foto_url: `https://bot.jgispublicidad.pe/images/${cleanCode}.jpg`,
        descripcion: descCell,
        estado_aprobado: 'Approved'
      });
      count++;
    }
  });
  console.log(`   ✅ Extraídas ${count} variantes de Tienda Publi`);
}

// 4. ETL PROVEEDOR: PROMOS
function processPromos() {
  const filename = 'PROMOS.xlsx';
  const filePath = path.join(LISTAS_DIR, filename);
  if (!fs.existsSync(filePath)) return;
  console.log(`\n📌 Procesando Promos desde: ${filename}...`);

  const workbook = xlsx.readFile(filePath);
  let count = 0;

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const codeCell = cleanStr(row[0]);
      if (!codeCell || codeCell.toUpperCase().includes('CODIGO')) continue;

      const nameCell = cleanStr(row[1]);
      const colorCell = cleanStr(row[2]);
      const stockCell = parseStock(row[3]);
      const transitCell = parseStock(row[4]);
      const p100 = parseNumPrice(row[6]);

      masterProducts.push({
        sku: `PROMOS-${codeCell}-${colorCell || 'BASE'}`.toUpperCase().replace(/\s+/g, '-'),
        proveedor: 'Promos',
        categoria: sheetName.trim(),
        codigo_proveedor: codeCell,
        nombre: nameCell || codeCell,
        variante_color: colorCell || 'VARIOS',
        color_base: resolveColorBase(colorCell),
        stock: stockCell,
        stock_transito: transitCell,
        precio_500u: p100 ? (p100 * 0.95).toFixed(2) : '',
        precio_500u_igv: p100 ? (p100 * 0.95 * 1.18).toFixed(2) : '',
        precio_100u: p100 ? p100.toFixed(2) : '',
        precio_100u_igv: p100 ? (p100 * 1.18).toFixed(2) : '',
        precio_1u: p100 ? (p100 * 1.25).toFixed(2) : '',
        precio_1u_igv: p100 ? (p100 * 1.25 * 1.18).toFixed(2) : '',
        foto_url: `https://bot.jgispublicidad.pe/images/${codeCell}.jpg`,
        descripcion: nameCell,
        estado_aprobado: 'Approved'
      });
      count++;
    }
  });
  console.log(`   ✅ Extraídas ${count} variantes de Promos`);
}

// 5. ETL PROVEEDOR: PROMOPRIME
function processPromoprime() {
  const filename = 'PROMOPRIME.xlsx';
  const filePath = path.join(LISTAS_DIR, filename);
  if (!fs.existsSync(filePath)) return;
  console.log(`\n📌 Procesando Promoprime desde: ${filename}...`);

  const workbook = xlsx.readFile(filePath);
  let count = 0;
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  let currentCategory = 'General';

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const col0 = cleanStr(row[0]);
    const col1 = cleanStr(row[1]);

    if (!col0 && !col1) continue;

    // Si es banda de categoría
    if (col0 && !col1 && col0.length > 3 && !col0.toUpperCase().includes('CODIGO')) {
      currentCategory = col0;
      continue;
    }

    const codeCell = col0;
    const nameCell = col1;
    const colorCell = cleanStr(row[2]);
    const stockCell = parseStock(row[3]);
    const priceRaw = parseNumPrice(row[4]);

    if (codeCell && nameCell) {
      masterProducts.push({
        sku: `PRIME-${codeCell}-${colorCell || 'BASE'}`.toUpperCase().replace(/\s+/g, '-'),
        proveedor: 'Promoprime',
        categoria: currentCategory,
        codigo_proveedor: codeCell,
        nombre: nameCell,
        variante_color: colorCell || 'VARIOS',
        color_base: resolveColorBase(colorCell),
        stock: stockCell,
        stock_transito: 0,
        precio_500u: priceRaw ? priceRaw.toFixed(2) : '',
        precio_500u_igv: priceRaw ? (priceRaw * 1.18).toFixed(2) : '',
        precio_100u: priceRaw ? (priceRaw * 1.10).toFixed(2) : '',
        precio_100u_igv: priceRaw ? (priceRaw * 1.10 * 1.18).toFixed(2) : '',
        precio_1u: priceRaw ? (priceRaw * 1.30).toFixed(2) : '',
        precio_1u_igv: priceRaw ? (priceRaw * 1.30 * 1.18).toFixed(2) : '',
        foto_url: `https://bot.jgispublicidad.pe/images/${codeCell}.jpg`,
        descripcion: nameCell,
        estado_aprobado: 'Approved'
      });
      count++;
    }
  }
  console.log(`   ✅ Extraídas ${count} variantes de Promoprime`);
}

// EJECUTAR PIPELINE COMPLETO
processChiper('CHEAPER.xlsx');
processChiper('CHIPER.xlsx');
processEFStock();
processTiendaPubli();
processPromos();
processPromoprime();

console.log('\n================================================================');
console.log(`TOTAL VARIANTES Y PRODUCTOS UNIFICADOS EN EL MASTER: ${masterProducts.length}`);
console.log('================================================================');

// Escribir archivo CSV Maestro para Google Sheets
const headers = [
  'SKU_JGIS', 'Proveedor', 'Categoria_Canonica', 'Codigo_Proveedor',
  'Producto_Nombre', 'Variante_Color', 'Color_Base', 'Stock_Disponible',
  'Stock_Transito', 'Precio_Unitario_500u', 'Precio_500u_con_IGV',
  'Precio_Unitario_100u', 'Precio_100u_con_IGV', 'Precio_Muestra_1u',
  'Precio_1u_con_IGV', 'Foto_URL', 'Descripcion', 'Estado_Aprobado'
];

const csvRows = [headers.join(',')];

masterProducts.forEach(p => {
  const row = [
    `"${p.sku}"`,
    `"${p.proveedor}"`,
    `"${p.categoria}"`,
    `"${p.codigo_proveedor}"`,
    `"${p.nombre.replace(/"/g, '""')}"`,
    `"${p.variante_color}"`,
    `"${p.color_base}"`,
    p.stock,
    p.stock_transito,
    `"${p.precio_500u}"`,
    `"${p.precio_500u_igv}"`,
    `"${p.precio_100u}"`,
    `"${p.precio_100u_igv}"`,
    `"${p.precio_1u}"`,
    `"${p.precio_1u_igv}"`,
    `"${p.foto_url}"`,
    `"${p.descripcion.replace(/"/g, '""')}"`,
    `"${p.estado_aprobado}"`
  ];
  csvRows.push(row.join(','));
});

fs.writeFileSync(OUTPUT_CSV, csvRows.join('\n'), 'utf8');
fs.writeFileSync(OUTPUT_JSON, JSON.stringify(masterProducts, null, 2), 'utf8');

console.log(`\n📄 Archivo CSV para Google Sheets exportado a: docs/GOOGLE_SHEETS_MASTER_JGIS.csv`);
console.log(`📄 Archivo JSON compilado exportado a: src/config/catalog_master_v2.json\n`);
