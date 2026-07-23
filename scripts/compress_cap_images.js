const fs = require('fs');
const path = require('path');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

const imagesDir = path.join(__dirname, '..', 'src', 'public', 'images');

async function compressImages() {
  console.log('🖼️ Comprimiendo imágenes de gorras en src/public/images/...');

  const files = fs.readdirSync(imagesDir).filter(f => f.startsWith('gorra_') && (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')));

  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    if (!fs.existsSync(filePath)) continue;

    const originalSize = fs.statSync(filePath).size;
    
    if (sharp) {
      const buffer = fs.readFileSync(filePath);
      const compressedBuffer = await sharp(buffer)
        .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      fs.writeFileSync(filePath, compressedBuffer);
      const newSize = compressedBuffer.length;
      console.log(`  ✅ ${file}: ${Math.round(originalSize / 1024)} KB -> ${Math.round(newSize / 1024)} KB`);
    } else {
      console.log(`  ℹ️ sharp no disponible localmente para ${file} (${Math.round(originalSize / 1024)} KB)`);
    }
  }
  console.log('🎉 Compresión completada.');
}

compressImages();
