const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const srcDir = 'C:\\Users\\USER\\Downloads\\gorras';
const destDir = 'C:\\Users\\USER\\Downloads\\gorras_comprimidas';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.mp4') || f.endsWith('.mov') || f.endsWith('.avi'));

console.log(`🎬 Encontrados ${files.length} videos en ${srcDir}:\n`);

files.forEach((file, index) => {
  const srcPath = path.join(srcDir, file);
  const originalSize = fs.statSync(srcPath).size;

  const baseName = path.parse(file).name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  const outputName = `${baseName}_sin_audio.mp4`;
  const destPath = path.join(destDir, outputName);

  console.log(`⏳ Comprimiendo y removiendo audio de [${index + 1}/${files.length}]: ${file}...`);

  // ffmpeg command: -an (sin audio), -vcodec libx264, -crf 26, -vf scale='min(1080,iw)':-2, -movflags +faststart
  const cmd = `"${ffmpegPath}" -y -i "${srcPath}" -an -vcodec libx264 -crf 26 -preset medium -vf "scale='min(1080,iw)':-2" -movflags +faststart "${destPath}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    const newSize = fs.statSync(destPath).size;
    const origKB = Math.round(originalSize / 1024);
    const newKB = Math.round(newSize / 1024);
    const reduction = Math.round(((originalSize - newSize) / originalSize) * 100);

    console.log(`  ✅ Generado: ${outputName}`);
    console.log(`     Tamaño: ${origKB} KB -> ${newKB} KB (Reducción: ${reduction}%)\n`);
  } catch (err) {
    console.error(`  ❌ Error procesando ${file}:`, err.message);
  }
});

console.log('🎉 Todos los videos han sido comprimidos y guardados sin audio en:');
console.log(`📁 ${destDir}`);
