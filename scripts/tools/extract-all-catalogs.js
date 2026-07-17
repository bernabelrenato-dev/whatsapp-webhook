// Extractor unificado para todos los catálogos de proveedores en la carpeta LISTAS
require('dotenv').config();
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const logger = require('../../src/utils/logger');

logger.level = 'debug';

const dirPath = process.env.LISTAS_DIR || path.join(__dirname, '..', '..', 'LISTAS');
const csvPath = path.join(__dirname, '..', '..', 'catalogo_borrador.csv');

const excelFiles = [
  { name: 'CHEAPER.xlsx', proveedor: 'CHEAPER' },
  { name: 'CHIPER.xlsx', proveedor: 'CHIPER' },
  { name: 'EFSTOCK.xlsx', proveedor: 'EFSTOCK' },
  { name: 'PROMOPRIME.xlsx', proveedor: 'PROMOPRIME' },
  { name: 'PROMOS.xlsx', proveedor: 'PROMOS' },
  { name: 'TIENDA PUBLI.xlsx', proveedor: 'TIENDA_PUBLI' }
];

function clean(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

function parsePriceToUnit(priceVal, headerStr) {
  if (!priceVal) return 0;
  const cleanStr = String(priceVal).replace(/[^\d.]/g, '');
  const num = parseFloat(cleanStr);
  if (isNaN(num) || num <= 0) return 0;

  const lowerHeader = headerStr.toLowerCase();
  
  // Heurística de conversión a precio unitario
  if ((lowerHeader.includes('ciento') || lowerHeader.includes('100')) && num > 50) {
    return num / 100;
  }
  if ((lowerHeader.includes('millar') || lowerHeader.includes('500') || lowerHeader.includes('1000')) && num > 200) {
    return num / 1000;
  }
  return num; // ya es unitario
}

// Búsqueda robusta de fila de cabecera
function findHeaderRow(rows) {
  const keywords = ['código', 'codigo', 'producto', 'stock', 'precio', 'color', 'detalle', 'item'];
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const row = rows[i] || [];
    let matchCount = 0;
    let nonEmptyCount = 0;
    row.forEach(cell => {
      const val = clean(cell).toLowerCase();
      if (val !== '') {
        nonEmptyCount++;
        if (keywords.some(k => val.includes(k))) matchCount++;
      }
    });
    if (nonEmptyCount >= 3 && matchCount >= 2) {
      const firstCell = clean(row[0] || row[1] || '').toLowerCase();
      if (!firstCell.includes('empresa') && !firstCell.includes('actualizado')) return i;
    }
  }
  return 0;
}

function extractFile(fileObj) {
  const filePath = path.join(dirPath, fileObj.name);
  if (!fs.existsSync(filePath)) {
    logger.warn(`⚠️ No se encontró el archivo del proveedor: ${fileObj.name}, saltando...`);
    return [];
  }

  logger.info(`📖 Leyendo catálogo de ${fileObj.proveedor} (${fileObj.name})...`);
  const workbook = xlsx.readFile(filePath);
  const products = [];

  for (const sheetName of workbook.SheetNames) {
    // Ignorar hojas informativas
    if (sheetName.toLowerCase().includes('empresa') || sheetName.toLowerCase().includes('datos')) continue;

    const sheet = workbook.Sheets[sheetName];
    const ref = sheet['!ref'];
    if (!ref) continue;

    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length <= 1) continue;

    const headerIdx = findHeaderRow(rows);
    const headers = (rows[headerIdx] || []).map(clean);

    // Mapear columnas dinámicas
    let codeColIdx = -1;
    let nameColIdx = -1;
    let colorColIdx = -1;
    let priceColIdx = -1;
    let descColIdx = -1;

    headers.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (codeColIdx === -1 && (lower.includes('código') || lower.includes('codigo') || lower.includes('item') || lower.includes('cod'))) {
        codeColIdx = idx;
      }
      if (nameColIdx === -1 && (lower.includes('producto') || lower.includes('artículo') || lower.includes('articulo') || lower.includes('name'))) {
        nameColIdx = idx;
      }
      if (colorColIdx === -1 && lower.includes('color')) {
        colorColIdx = idx;
      }
      if (priceColIdx === -1 && (lower.includes('precio') || lower.includes('pu ') || lower.includes('x ciento') || lower.includes('x millar'))) {
        priceColIdx = idx;
      }
      if (descColIdx === -1 && (lower.includes('descrip') || lower.includes('detalle'))) {
        descColIdx = idx;
      }
    });

    // Validación estricta de presencia de columnas mínimas requeridas
    if (codeColIdx === -1 && nameColIdx === -1 && descColIdx === -1) {
      logger.warn(`⚠️ Omitiendo hoja "${sheetName}" por falta de columnas críticas de identificación de productos.`);
      continue;
    }

    // Fallbacks por posición de columnas comunes si no se detectaron explícitamente
    if (codeColIdx === -1) codeColIdx = 0;
    if (nameColIdx === -1) nameColIdx = descColIdx !== -1 ? descColIdx : (codeColIdx === 0 ? 1 : 0);
    if (priceColIdx === -1) {
      // Buscar cualquier columna que diga precio
      headers.forEach((h, idx) => {
        if (h.toLowerCase().includes('precio') && priceColIdx === -1) priceColIdx = idx;
      });
    }

    let currentProduct = null;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const isRowEmpty = row.every(cell => clean(cell) === '');
      if (isRowEmpty) continue;

      const codigo = codeColIdx < row.length ? clean(row[codeColIdx]) : '';
      const producto = nameColIdx < row.length ? clean(row[nameColIdx]) : '';
      const color = colorColIdx !== -1 && colorColIdx < row.length ? clean(row[colorColIdx]) : 'Varios';
      const precioVal = priceColIdx !== -1 && priceColIdx < row.length ? row[priceColIdx] : '';

      // Si tiene código o nombre de producto, inicia un nuevo grupo
      if (codigo || (producto && producto.length > 3 && !producto.toLowerCase().startsWith('medida') && !producto.toLowerCase().startsWith('material'))) {
        const headerName = priceColIdx !== -1 ? headers[priceColIdx] : 'Precio';
        const precioUnitario = parsePriceToUnit(precioVal, headerName);

        // Si el precio es 0 o menor, asumimos que es una fila descriptiva/nota del Excel y la omitimos de forma segura
        if (isNaN(precioUnitario) || precioUnitario <= 0) {
          continue;
        }

        const cleanCodigo = codigo || `PROD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const cleanNombre = producto || clean(row[descColIdx]) || 'Artículo sin nombre';

        // Evitar registrar filas descriptivas como productos principales
        if (cleanNombre.toLowerCase().startsWith('medida') || cleanNombre.toLowerCase().startsWith('material') || cleanNombre.length < 3) {
          continue;
        }

        currentProduct = {
          codigo: cleanCodigo,
          nombre: cleanNombre.replace(/,/g, ' '), // limpiar comas para CSV
          precio_venta: precioUnitario.toFixed(2),
          color: color || 'Varios',
          categoria: sheetName.replace(/\d+/g, '').trim(), // Limpiar números de la hoja
          proveedor: fileObj.proveedor,
          imagen_url: `images/${cleanCodigo}.png`
        };

        products.push({ ...currentProduct });
      } else if (currentProduct && color && color !== 'HORARIO DE ATENCIÓN' && color !== 'SEDE LIMA' && color.length < 30) {
        // Variante del color
        const variantCode = `${currentProduct.codigo}-${color.replace(/\s+/g, '-')}`;
        products.push({
          ...currentProduct,
          codigo: variantCode,
          color: color
        });
      }
    }
  }

  logger.info(`✔️ Extracción completada para ${fileObj.proveedor}: se encontraron ${products.length} productos/variantes.`);
  return products;
}

async function extractAll() {
  logger.info('🚀 Iniciando extracción unificada de todos los catálogos de la carpeta listas...');
  let allProducts = [];

  for (const fileObj of excelFiles) {
    try {
      const fileProducts = extractFile(fileObj);
      allProducts = allProducts.concat(fileProducts);
    } catch (err) {
      logger.error(`❌ Error extrayendo ${fileObj.name}: ${err.message}`);
    }
  }

  logger.info(`✨ Extracción consolidada terminada. Total acumulado: ${allProducts.length} productos y variantes.`);

  // Escribir en catalogo_borrador.csv (10 columnas, stock vacío)
  let csvContent = 'codigo,nombre,precio_venta,color,categoria,proveedor,imagen_url,stock,aprobado,sincronizado\n';
  allProducts.forEach(p => {
    csvContent += `${p.codigo},${p.nombre},${p.precio_venta},${p.color},${p.categoria},${p.proveedor},${p.imagen_url},,Approved,false\n`;
  });

  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`\n🎉 PROCESO COMPLETADO. Archivo catalogo_borrador.csv generado con ${allProducts.length} productos.`);
}

extractAll();
