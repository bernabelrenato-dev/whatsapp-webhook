// Extractor de catálogo real: Parsea CHEAPER.xlsx y genera filas en catalogo_borrador.csv
require('dotenv').config();
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const logger = require('../../src/utils/logger');

logger.level = 'debug';

const excelPath = path.join(process.env.LISTAS_DIR || path.join(__dirname, '..', '..', 'LISTAS'), 'CHEAPER.xlsx');
const csvPath = path.join(__dirname, '..', '..', 'catalogo_borrador.csv');

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  // Limpiar el string para extraer solo números y punto decimal
  const cleanStr = priceStr.replace(/[^\d.]/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

async function runExtraction() {
  logger.info(`📂 Iniciando extracción de catálogo desde Excel: ${excelPath}`);
  
  if (!fs.existsSync(excelPath)) {
    logger.error(`❌ No existe el archivo Excel en: ${excelPath}`);
    process.exit(1);
  }

  const workbook = xlsx.readFile(excelPath);
  const sheetName = 'TOMATODOS-MUG';
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    logger.error(`❌ No se encontró la hoja "${sheetName}" en el Excel.`);
    process.exit(1);
  }

  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  if (rows.length <= 1) {
    logger.warn('⚠️ La hoja de Excel está vacía.');
    process.exit(0);
  }

  logger.info(`📊 Procesando ${rows.length - 1} filas de la hoja "${sheetName}"...`);

  const extractedProducts = [];
  let currentProduct = null;

  // Recorrer filas (saltando cabecera en índice 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const codigo = row[0] ? String(row[0]).trim() : '';
    const producto = row[2] ? String(row[2]).trim() : '';
    const color = row[3] ? String(row[3]).trim() : 'Varios';
    const precioCientoStr = row[7] ? String(row[7]).trim() : '';
    
    // Si la fila tiene código, inicia un nuevo grupo de productos
    if (codigo) {
      const precioCiento = parsePrice(precioCientoStr);
      // Precio unitario por ciento = precio de ciento / 100
      const precioUnitario = precioCiento > 0 ? (precioCiento / 100).toFixed(2) : '0.00';

      currentProduct = {
        codigo: codigo,
        nombre: producto,
        precio_venta: precioUnitario,
        color: color,
        categoria: 'MUGS Y TAZAS',
        proveedor: 'CHEAPER',
        imagen_url: `images/${codigo}.png`
      };
      
      extractedProducts.push({ ...currentProduct });
    } else if (currentProduct && color && color !== 'HORARIO DE ATENCIÓN' && color !== 'SEDE LIMA') {
      // Es una fila variante de color del producto actual
      const variant = {
        ...currentProduct,
        codigo: `${currentProduct.codigo}-${color.replace(/\s+/g, '-')}`, // Código único para la variante
        color: color
      };
      extractedProducts.push(variant);
    }
  }

  logger.info(`✨ Extracción completada. Se obtuvieron ${extractedProducts.length} variantes de productos.`);

  // Escribir en catalogo_borrador.csv
  let csvContent = 'codigo,nombre,precio_venta,color,categoria,proveedor,imagen_url,aprobado,sincronizado\n';
  
  extractedProducts.forEach(p => {
    // Escapar comas en nombres por seguridad CSV
    const cleanNombre = p.nombre.replace(/,/g, ' ');
    csvContent += `${p.codigo},${cleanNombre},${p.precio_venta},${p.color},${p.categoria},${p.proveedor},${p.imagen_url},Approved,false\n`;
  });

  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  logger.info(`💾 catalogo_borrador.csv actualizado con los productos reales extraídos.`);
  console.log(`\n🎉 ¡Extracción exitosa! Archivo guardado con ${extractedProducts.length} productos listos para sincronizar.`);
}

runExtraction();
