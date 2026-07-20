// Script para resetear el estado de sincronización del CSV a false
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'catalogo_borrador.csv');

function run() {
  if (!fs.existsSync(csvPath)) {
    console.error('❌ No se encontró catalogo_borrador.csv en', csvPath);
    process.exit(1);
  }

  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvData.split(/\r?\n/);
  
  if (lines.length <= 1) {
    console.error('❌ El archivo CSV está vacío.');
    process.exit(1);
  }

  const updatedLines = [];
  // Mantener cabecera
  updatedLines.push(lines[0]);

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      updatedLines.push('');
      continue;
    }

    const columns = line.split(',');
    if (columns.length >= 10) {
      // El último elemento es "sincronizado" (columna de índice 9)
      if (columns[9].trim() === 'true') {
        columns[9] = 'false';
        count++;
      }
    }
    updatedLines.push(columns.join(','));
  }

  fs.writeFileSync(csvPath, updatedLines.join('\n'), 'utf-8');
  console.log(`🎉 Reseteado estado de sincronización para ${count} productos en el CSV.`);
  process.exit(0);
}

run();
