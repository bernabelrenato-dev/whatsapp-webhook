const fs = require('fs');
const path = require('path');
const admZip = require('adm-zip'); // standard built-in or node module if available, or we can use raw zip extraction

const LISTAS_DIR = 'C:\\Users\\USER\\Downloads\\LISTAS';
const CATALOG_FILE = path.join(__dirname, '..', '..', 'src', 'config', 'catalog.json');
const IMAGES_DIR = path.join(__dirname, '..', '..', 'src', 'public', 'images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

let catalog = [];
if (fs.existsSync(CATALOG_FILE)) {
  catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
}

console.log(`=== EXTRACCION ULTRA RAPIDA DE IMAGENES (ZIP NATIVO EXCEL) ===`);

const excelFiles = [
  'PROMOS.xlsx',
  'PROMOPRIME.xlsx',
  'TIENDA PUBLI.xlsx',
  'EFSTOCK.xlsx'
];

// Map product codes for quick lookup
const codeMap = {};
catalog.forEach(p => {
  if (p.code) {
    const cleanCode = p.code.trim().toUpperCase();
    codeMap[cleanCode] = p;
  }
});

let totalExtracted = 0;

excelFiles.forEach(file => {
  const filePath = path.join(LISTAS_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ No existe: ${file}`);
    return;
  }

  console.log(`\n📦 Procesando paquete ZIP de: ${file}...`);
  try {
    const zip = new admZip(filePath);
    const zipEntries = zip.getEntries();

    const mediaEntries = zipEntries.filter(e => e.entryName.startsWith('xl/media/'));
    console.log(`Encontradas ${mediaEntries.length} imágenes en xl/media/ de ${file}`);

    mediaEntries.forEach(entry => {
      const baseName = path.basename(entry.entryName);
      const ext = path.extname(baseName);
      const nameNoExt = path.basename(baseName, ext).toUpperCase();

      // Check if image filename or entry corresponds to a known catalog product code
      let matchedCode = null;
      if (codeMap[nameNoExt]) {
        matchedCode = nameNoExt;
      } else {
        // Search if code is embedded in media name (e.g. image1_MUG-32)
        for (const code of Object.keys(codeMap)) {
          if (nameNoExt.includes(code) || code.includes(nameNoExt)) {
            matchedCode = code;
            break;
          }
        }
      }

      if (matchedCode) {
        const destPath = path.join(IMAGES_DIR, `${matchedCode}${ext}`);
        if (!fs.existsSync(destPath) || fs.statSync(destPath).size < 100) {
          fs.writeFileSync(destPath, entry.getData());
          totalExtracted++;
          console.log(`  ➕ Extraída imagen para código: ${matchedCode}${ext}`);
        }
      }
    });
  } catch (err) {
    console.error(`Error descomprimiendo ${file}: ${err.message}`);
  }
});

console.log(`\n=======================================`);
console.log(`TOTAL IMAGENES EXTRAIDAS DIRECTAMENTE: ${totalExtracted}`);
console.log(`=======================================\n`);
