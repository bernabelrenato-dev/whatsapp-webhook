const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const LISTAS_DIR = 'C:\\Users\\USER\\Downloads\\LISTAS';
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'public', 'images');
const CATALOG_FILE = path.join(__dirname, '..', 'src', 'config', 'catalog.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function extractImagesFromFile(filename, codeColIdx, imgColIdx, sheetSkipName) {
  const filePath = path.join(LISTAS_DIR, filename);
  if (!fs.existsSync(filePath)) return {};

  console.log(`\nExtracting images from: ${filename}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const imageMapping = {}; // maps code -> image filename

  for (const worksheet of workbook.worksheets) {
    if (worksheet.name === sheetSkipName) continue;
    console.log(`Analyzing sheet: ${worksheet.name}`);

    // Track active codes by row to match with floating images
    const rowCodes = {};
    let currentCode = '';

    worksheet.eachRow((row, rowNumber) => {
      const codeVal = row.getCell(codeColIdx + 1).value;
      if (codeVal) {
        // Clean code string
        currentCode = codeVal.toString().trim().replace(/\s+/g, '-');
      }
      rowCodes[rowNumber] = currentCode;
    });

    const images = worksheet.getImages();
    console.log(`Found ${images.length} images in sheet ${worksheet.name}`);

    images.forEach((image) => {
      try {
        const row = image.range.tl.nativeRow + 1; // 1-indexed row where image is anchored
        const code = rowCodes[row];

        if (!code) return;

        // Find the actual image buffer in workbook media
        const imgData = workbook.model.media.find(m => m.index === image.imageId);
        if (imgData && imgData.buffer) {
          const extension = imgData.extension || 'jpg';
          // Clean product code for filename
          const cleanCode = code.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
          if (!cleanCode) return;

          const fileName = `${cleanCode}.${extension}`;
          const destPath = path.join(OUTPUT_DIR, fileName);

          fs.writeFileSync(destPath, imgData.buffer);
          imageMapping[cleanCode] = fileName;
        }
      } catch (err) {
        console.error(`Error extracting an image:`, err.message);
      }
    });
  }

  return imageMapping;
}

async function run() {
  try {
    // 1. Extract images from Cheaper.xlsx
    // Column A (0) is Code, Column B (1) is Image
    const cheaperMap = await extractImagesFromFile('CHEAPER.xlsx', 0, 1, 'Datos Empresa');

    // 2. Extract images from Chiper.xlsx
    const chiperMap = await extractImagesFromFile('CHIPER.xlsx', 0, 1);

    // 3. Extract images from EFSTOCK.xlsx
    // Column B (1) is Code, Column C (2) is Image
    const efstockMap = await extractImagesFromFile('EFSTOCK.xlsx', 1, 2);

    // 4. Extract images from PROMOS.xlsx
    // Column B (1) is Code, Column E (4) is Image
    const promosMap = await extractImagesFromFile('PROMOS.xlsx', 1, 4);

    // Combine mappings
    const finalMapping = {
      ...cheaperMap,
      ...chiperMap,
      ...efstockMap,
      ...promosMap
    };

    console.log(`\nTotal unique mapped images extracted: ${Object.keys(finalMapping).length}`);

    // 5. Update catalog.json with the extracted image filenames
    if (fs.existsSync(CATALOG_FILE)) {
      console.log(`Updating catalog.json with image references...`);
      const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));

      catalog.forEach(item => {
        const cleanCode = (item.code || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (finalMapping[cleanCode]) {
          item.image = finalMapping[cleanCode];
        }
      });

      fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2));
      console.log(`Catalog file successfully updated!`);
    }

  } catch (err) {
    console.error('Error during image extraction:', err.message);
  }
}

run();
