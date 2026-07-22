const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\USER\\Downloads\\gorras';
const destDir = path.join(__dirname, '..', 'src', 'public', 'images');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));

console.log(`📸 Encontradas ${files.length} imágenes reales de gorras en C:\\Users\\USER\\Downloads\\gorras:`);

const targetImages = [];

files.slice(0, 7).forEach((file, index) => {
  const srcPath = path.join(srcDir, file);
  const newName = `gorra_0${index + 1}.jpg`;
  const destPath = path.join(destDir, newName);

  fs.copyFileSync(srcPath, destPath);
  targetImages.push(`https://bot.jgispublicidad.pe/images/${newName}`);
  console.log(`  [${index + 1}] ${file} -> src/public/images/${newName} (${Math.round(fs.statSync(destPath).size / 1024)} KB)`);
});

console.log('\n✅ Las 7 imágenes reales de gorras han sido copiadas exitosamente a src/public/images/');
