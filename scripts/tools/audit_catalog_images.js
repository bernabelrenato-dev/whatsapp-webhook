const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const LISTAS_DIR = 'C:\\Users\\USER\\Downloads\\LISTAS';
const CATALOG_FILE = path.join(__dirname, '..', '..', 'src', 'config', 'catalog.json');
const IMAGES_DIR = path.join(__dirname, '..', '..', 'src', 'public', 'images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Read current catalog
let catalog = [];
if (fs.existsSync(CATALOG_FILE)) {
  catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
}

const existingImages = new Set(
  fs.readdirSync(IMAGES_DIR).map(f => path.basename(f, path.extname(f)).toUpperCase())
);

console.log(`=== AUDIT CATALOGO E IMAGENES ===`);
console.log(`Productos en catalog.json: ${catalog.length}`);
console.log(`Archivos de imágenes en src/public/images: ${existingImages.size}`);

const missingBefore = catalog.filter(p => !existingImages.has((p.code || '').toUpperCase()));
console.log(`Productos SIN imagen actualmente: ${missingBefore.length} (${((missingBefore.length / catalog.length) * 100).toFixed(1)}%)`);

// Structure comparison by source file
const bySource = {};
catalog.forEach(p => {
  const src = p.source || 'Desconocido';
  if (!bySource[src]) bySource[src] = { total: 0, hasImage: 0, missing: 0 };
  bySource[src].total++;
  if (existingImages.has((p.code || '').toUpperCase())) {
    bySource[src].hasImage++;
  } else {
    bySource[src].missing++;
  }
});

console.log('\n--- Cobertura por Archivo Proveedor ---');
console.table(bySource);

// Function to perform enhanced re-extraction
async function extractAllImagesFromExcel(filename, codeColIdx = 1) {
  const filePath = path.join(LISTAS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Archivo no encontrado: ${filename}`);
    return 0;
  }

  console.log(`\n🔍 Re-analizando y extrayendo de: ${filename}...`);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(filePath);
  } catch (err) {
    console.error(`Error leyendo ${filename}: ${err.message}`);
    return 0;
  }

  let extractedCount = 0;

  for (const worksheet of workbook.worksheets) {
    if (worksheet.name.toLowerCase().includes('empresa') || worksheet.name.toLowerCase().includes('datos')) continue;

    const rowCodes = {};
    let currentCode = '';

    worksheet.eachRow((row, rowNumber) => {
      // Find code cell across first 5 columns if codeColIdx default fails
      for (let c = 1; c <= 5; c++) {
        const val = row.getCell(c).value;
        if (val) {
          const str = String(val).trim();
          if (str.length >= 2 && str.length <= 30 && /^[A-Z0-9_\-\.]+$/i.test(str)) {
            currentCode = str.toUpperCase().replace(/\s+/g, '-');
            break;
          }
        }
      }
      rowCodes[rowNumber] = currentCode;
    });

    const images = worksheet.getImages();

    images.forEach((image) => {
      try {
        const row = (image.range && image.range.tl) ? image.range.tl.nativeRow + 1 : null;
        let code = row ? rowCodes[row] : null;

        // Fallback: search surrounding rows (+/- 3) if exact row code was blank
        if (!code && row) {
          for (let offset = -3; offset <= 3; offset++) {
            if (rowCodes[row + offset]) {
              code = rowCodes[row + offset];
              break;
            }
          }
        }

        if (!code) return;

        const imgData = workbook.model.media.find(m => m.index === image.imageId);
        if (imgData && imgData.buffer) {
          const extension = imgData.extension || 'jpg';
          const cleanCode = code.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
          if (!cleanCode) return;

          const fileName = `${cleanCode}.${extension}`;
          const destPath = path.join(IMAGES_DIR, fileName);

          // Save image if not existing or small placeholder
          if (!fs.existsSync(destPath) || fs.statSync(destPath).size < 100) {
            fs.writeFileSync(destPath, imgData.buffer);
            extractedCount++;
            existingImages.add(cleanCode);
          }
        }
      } catch (err) {
        // Suppress individual image parse error
      }
    });
  }

  console.log(`✅ Nuevas imágenes extraídas de ${filename}: ${extractedCount}`);
  return extractedCount;
}

async function runFullAuditAndExtraction() {
  const excelFiles = [
    'CHEAPER.xlsx',
    'CHIPER.xlsx',
    'EFSTOCK.xlsx',
    'PROMOPRIME.xlsx',
    'PROMOS.xlsx',
    'TIENDA PUBLI.xlsx'
  ];

  let totalNew = 0;
  for (const file of excelFiles) {
    totalNew += await extractAllImagesFromExcel(file);
  }

  console.log('\n=======================================');
  console.log(`TOTAL NUEVAS IMAGENES RECUPERADAS: ${totalNew}`);
  const finalImages = new Set(
    fs.readdirSync(IMAGES_DIR).map(f => path.basename(f, path.extname(f)).toUpperCase())
  );

  const missingAfter = catalog.filter(p => !finalImages.has((p.code || '').toUpperCase()));
  console.log(`Productos SIN imagen despues de re-extracción: ${missingAfter.length} (${((missingAfter.length / catalog.length) * 100).toFixed(1)}%)`);
  console.log('=======================================\n');
}

runFullAuditAndExtraction();
