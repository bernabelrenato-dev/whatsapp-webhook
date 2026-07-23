const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_DIR = path.join(__dirname, '..', '..');
const LISTAS_DIR = 'C:\\Users\\USER\\Downloads\\LISTAS';
const CATALOG_FILE = path.join(BASE_DIR, 'src', 'config', 'catalog.json');
const IMAGES_DIR = path.join(BASE_DIR, 'src', 'public', 'images');
const TEMP_DIR = path.join(BASE_DIR, 'temp_unzip');

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

let catalog = [];
if (fs.existsSync(CATALOG_FILE)) {
  catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
}

const codeMap = {};
function normalizeCode(str) {
  if (!str) return '';
  return str.toString().toUpperCase().replace(/[\r\n\s\-_()]/g, '');
}

catalog.forEach(p => {
  if (p.code) {
    const norm = normalizeCode(p.code);
    if (norm) codeMap[norm] = p;
  }
});

console.log('====================================================');
console.log(' AUDITORIA Y COMPARACION DE CATALOGO E IMAGENES (JGIS)');
console.log('====================================================');
console.log(`Total productos en catalog.json: ${catalog.length}`);

let existingImages = fs.readdirSync(IMAGES_DIR);
let existingCodesMap = {};
existingImages.forEach(img => {
  const norm = normalizeCode(path.basename(img, path.extname(img)));
  if (norm) existingCodesMap[norm] = img;
});

console.log(`Imágenes en src/public/images: ${existingImages.length}`);
let missingBefore = catalog.filter(p => !existingCodesMap[normalizeCode(p.code)]);
console.log(`Productos SIN imagen actualmente: ${missingBefore.length} (${((missingBefore.length / catalog.length) * 100).toFixed(1)}%)`);

const excelFiles = ['PROMOS.xlsx', 'PROMOPRIME.xlsx', 'TIENDA PUBLI.xlsx', 'EFSTOCK.xlsx', 'CHEAPER.xlsx', 'CHIPER.xlsx'];
let newlyExtracted = 0;

excelFiles.forEach(fileName => {
  const filePath = path.join(LISTAS_DIR, fileName);
  if (!fs.existsSync(filePath)) return;

  console.log(`\n📦 Descomprimiendo e inspeccionando: ${fileName}...`);
  if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const tempZipPath = path.join(TEMP_DIR, 'catalog.zip');
  fs.copyFileSync(filePath, tempZipPath);

  try {
    execSync(`powershell -Command "Expand-Archive -Path '${tempZipPath}' -DestinationPath '${TEMP_DIR}' -Force"`, { stdio: 'ignore' });
    const mediaDir = path.join(TEMP_DIR, 'xl', 'media');

    if (fs.existsSync(mediaDir)) {
      const mediaFiles = fs.readdirSync(mediaDir);
      console.log(`   Encontradas ${mediaFiles.length} imágenes raw en ${fileName}`);

      mediaFiles.forEach(mediaFile => {
        const ext = path.extname(mediaFile);
        const nameNoExt = path.basename(mediaFile, ext).toUpperCase();

        let matchedCode = null;
        if (codeMap[nameNoExt]) {
          matchedCode = nameNoExt;
        } else {
          // Check substring match against catalog product codes
          for (const code of Object.keys(codeMap)) {
            if (code.length >= 3 && (code === nameNoExt || nameNoExt.includes(code))) {
              matchedCode = code;
              break;
            }
          }
        }

        if (matchedCode) {
          const destPath = path.join(IMAGES_DIR, `${matchedCode}${ext}`);
          if (!fs.existsSync(destPath) || fs.statSync(destPath).size < 100) {
            fs.copyFileSync(path.join(mediaDir, mediaFile), destPath);
            existingCodes.add(matchedCode);
            newlyExtracted++;
          }
        }
      });
    }
  } catch (err) {
    console.error(`   ⚠️ Error en descompresión de ${fileName}:`, err.message);
  }
});

// Cleanup temp
if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true });

// Final Stats
const missingAfter = catalog.filter(p => !existingCodesMap[normalizeCode(p.code)]);

const summary = {
  total_products: catalog.length,
  images_in_folder: fs.readdirSync(IMAGES_DIR).length,
  products_with_image: catalog.length - missingAfter.length,
  products_missing_image: missingAfter.length,
  newly_extracted: newlyExtracted,
  coverage_percentage: `${(((catalog.length - missingAfter.length) / catalog.length) * 100).toFixed(1)}%`,
  missing_products: missingAfter.map(p => ({ code: p.code, name: p.name, source: p.source }))
};

const reportPath = path.join(BASE_DIR, 'docs', 'comparacion_catalogo_imagenes.json');
fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8');

console.log('\n====================================================');
console.log(' RESUMEN FINAL DE COMPARACION');
console.log('====================================================');
console.log(`Nuevas imágenes extraídas y mapeadas: ${newlyExtracted}`);
console.log(`Productos CON imagen: ${summary.products_with_image} (${summary.coverage_percentage})`);
console.log(`Productos FALTANTES de imagen: ${summary.products_missing_image}`);
console.log(`📄 Reporte guardado en: docs/comparacion_catalogo_imagenes.json`);
console.log('====================================================\n');
