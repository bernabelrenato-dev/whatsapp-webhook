// Servicio de sincronización de catálogo desde archivo borrador (CSV/Sheets) a PostgreSQL
const fs = require('fs');
const path = require('path');
const db = require('../utils/db');
const logger = require('../utils/logger');

const csvPath = path.join(__dirname, '..', '..', 'catalogo_borrador.csv');

class DbSyncService {
  /**
   * Ejecuta el proceso de sincronización leyendo el CSV, inyectando en Postgres y marcando el CSV.
   */
  async syncCatalog() {
    logger.info('🔄 Iniciando ciclo de sincronización de catálogo...');

    if (!fs.existsSync(csvPath)) {
      logger.error(`❌ No se encontró el archivo borrador del catálogo en: ${csvPath}`);
      return { success: false, error: 'CSV file not found' };
    }

    const pool = db.getPool();
    if (!pool) {
      logger.error('❌ DATABASE_URL no está configurada en las variables de entorno.');
      return { success: false, error: 'DATABASE_URL not configured' };
    }

    let pgClient = null;

    try {
      pgClient = await pool.connect();
      logger.debug('🔌 Conexión del pool obtenida para sincronización.');

      // 1. Iniciar transacción SQL para garantizar atomicidad
      await pgClient.query('BEGIN');

      // 2. Leer y parsear el archivo CSV
      const csvData = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvData.split(/\r?\n/);
      if (lines.length <= 1) {
        logger.warn('⚠️ El archivo CSV está vacío o solo contiene la cabecera.');
        await pgClient.query('COMMIT');
        return { success: true, syncedCount: 0 };
      }

      const headers = lines[0].split(',');
      const rows = [];
      const updatedLines = [lines[0]]; // Mantener cabecera
      let syncedCount = 0;

      // Iterar sobre las filas (saltando la cabecera)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          updatedLines.push('');
          continue;
        }

        // Parseo simple de columnas por coma (adecuado para nuestro CSV controlado)
        const columns = line.split(',');
        if (columns.length < 10) {
          logger.warn(`⚠️ Fila ${i + 1} mal formateada, saltando (requiere 10 columnas): "${line}"`);
          updatedLines.push(line);
          continue;
        }

        const [codigo, nombre, precio_venta, color, categoria, proveedor, imagen_url, stock, aprobado, sincronizado] = columns;

        // Comprobar si está aprobado y no ha sido sincronizado aún
        if (aprobado.trim() === 'Approved' && sincronizado.trim() === 'false') {
          logger.info(`✨ Sincronizando producto [${codigo}] - ${nombre} (${proveedor})`);

          // 3. Ejecutar UPSERT query en PostgreSQL
          const query = `
            INSERT INTO "CatalogProducts" (codigo, nombre, precio_venta, color, categoria, proveedor, imagen_url, stock, sincronizado_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (codigo)
            DO UPDATE SET
              nombre = EXCLUDED.nombre,
              precio_venta = EXCLUDED.precio_venta,
              color = EXCLUDED.color,
              categoria = EXCLUDED.categoria,
              proveedor = EXCLUDED.proveedor,
              imagen_url = EXCLUDED.imagen_url,
              stock = EXCLUDED.stock,
              sincronizado_at = NOW();
          `;

          const parsedPrice = parseFloat(precio_venta.trim());
          if (isNaN(parsedPrice)) {
            logger.warn(`⚠️ Fila ${i + 1} tiene un precio inválido [${precio_venta}], saltando [${codigo}].`);
            updatedLines.push(line);
            continue;
          }

          const parsedStock = stock && stock.trim() ? parseInt(stock.trim(), 10) : null;

          await pgClient.query(query, [
            codigo.trim(),
            nombre.trim(),
            parsedPrice,
            color.trim(),
            categoria.trim(),
            proveedor.trim(),
            imagen_url.trim(),
            isNaN(parsedStock) ? null : parsedStock
          ]);

          syncedCount++;
          // Cambiar el estado de sincronizado a true en la línea actualizada
          columns[9] = 'true';
          updatedLines.push(columns.join(','));
        } else {
          // No requiere sincronización, se mantiene igual
          updatedLines.push(line);
        }
      }

      // 4. Reescribir el archivo CSV con las filas marcadas como sincronizadas
      if (syncedCount > 0) {
        fs.writeFileSync(csvPath, updatedLines.join('\n'), 'utf-8');
        logger.info(`💾 CSV actualizado. Se marcaron ${syncedCount} productos como sincronizados.`);
      } else {
        logger.info('💤 No se encontraron productos nuevos aprobados para sincronizar.');
      }

      // 5. Confirmar transacción
      await pgClient.query('COMMIT');
      logger.debug('💾 Transacción confirmada (COMMIT) con éxito.');

      return { success: true, syncedCount };

    } catch (error) {
      if (pgClient) {
        try {
          await pgClient.query('ROLLBACK');
          logger.warn('↩️ Transacción abortada y revertida (ROLLBACK) debido a un error de sincronización.');
        } catch (rollbackError) {
          logger.error('Error al ejecutar ROLLBACK en Postgres:', rollbackError.message);
        }
      }
      logger.error({ msg: '❌ Error durante el ciclo de sincronización', error: error.message });
      return { success: false, error: error.message };
    } finally {
      if (pgClient) {
        pgClient.release();
        logger.debug('🔌 Conexión devuelta al pool de PostgreSQL.');
      }
    }
  }
}

module.exports = new DbSyncService();
