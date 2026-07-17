const { Client } = require('pg');
const logger = require('../utils/logger');

class CatalogService {
  /**
   * Calcula los precios de venta al público aplicando el margen de JGIS
   * en base a los precios de costo del Excel.
   * @param {string|number} costUnit Costo unitario base.
   */
  calculateSellingPrices(costUnit) {
    const cost = parseFloat(costUnit) || 0;

    return {
      precio_1_5_unidades: cost ? `S/ ${(cost * 1.85).toFixed(2)}` : 'No disponible',
      precio_6_12_unidades: cost ? `S/ ${(cost * 1.40).toFixed(2)}` : 'No disponible',
      precio_13_50_unidades: cost ? `S/ ${(cost * 1.35).toFixed(2)}` : 'No disponible',
      precio_51_499_unidades: cost ? `S/ ${(cost * 1.25).toFixed(2)}` : 'No disponible',
      precio_500_1000_unidades: cost ? `S/ ${(cost * 1.20).toFixed(2)}` : 'No disponible'
    };
  }

  /**
   * Realiza una búsqueda de palabras clave en la tabla "CatalogProducts" de PostgreSQL.
   * @param {string} query Término de búsqueda de producto.
   * @returns {Promise<Array>} Listado de hasta 6 productos que coincidan.
   */
  async searchCatalog(query) {
    if (!query || typeof query !== 'string') return [];
    
    logger.debug({ msg: 'Buscando en catálogo PostgreSQL', query });
    
    // Normalizar la consulta (quitar tildes, minúsculas, espacios)
    const cleanQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (cleanQuery.length < 2) return [];

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      logger.error('❌ DATABASE_URL no está configurada para el CatalogService.');
      return [];
    }

    const client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();

      // Buscamos productos que coincidan con el código, nombre o categoría
      const sqlQuery = `
        SELECT * FROM "CatalogProducts"
        WHERE codigo ILIKE $1 OR nombre ILIKE $1 OR categoria ILIKE $1
        ORDER BY (codigo ILIKE $2) DESC, nombre ASC
        LIMIT 6;
      `;
      const pattern = `%${cleanQuery}%`;
      const exactPattern = cleanQuery;
      
      const res = await client.query(sqlQuery, [pattern, exactPattern]);

      const processedResults = res.rows.map(item => {
        const prices = this.calculateSellingPrices(item.precio_venta);
        return {
          codigo: item.codigo,
          nombre: item.nombre,
          descripcion: `Color: ${item.color || 'Varios'}, Proveedor: ${item.proveedor || 'N/A'}, Categoría: ${item.categoria || 'General'}`,
          color: item.color,
          stock: item.stock !== null ? item.stock : 'Consultar disponibilidad',
          categoria: item.categoria,
          precios_venta_sin_igv: prices,
          link_imagen: item.imagen_url ? `${process.env.PUBLIC_URL || 'https://whatsapp-webhook-bilg.onrender.com'}/${item.imagen_url}` : 'No disponible'
        };
      });

      logger.info({ msg: 'Resultados de búsqueda de catálogo Postgres procesados', count: processedResults.length, query });
      return processedResults;
    } catch (error) {
      logger.error({ msg: '❌ Error en searchCatalog (PostgreSQL)', error: error.message });
      return [];
    } finally {
      await client.end();
    }
  }

  /**
   * Obtiene candidatos de productos similares desde PostgreSQL para el comparador visual.
   * @param {string} terms Frase descriptiva generada por Gemini Vision (ej. "taza ceramica").
   * @returns {Promise<Array>} Listado de hasta 25 productos candidatos.
   */
  async getCandidatesForImage(terms) {
    if (!terms || typeof terms !== 'string') return [];
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return [];

    const client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();
      
      // Separar los términos en palabras clave de búsqueda
      const words = terms.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(w => w.length >= 3);
      let queryStr = `SELECT codigo as code, nombre as name, categoria as category, color FROM "CatalogProducts"`;
      const conditions = [];
      const params = [];

      words.forEach((word, idx) => {
        conditions.push(`(nombre ILIKE $${idx + 1} OR categoria ILIKE $${idx + 1})`);
        params.push(`%${word}%`);
      });

      if (conditions.length > 0) {
        queryStr += ` WHERE ` + conditions.join(' AND ');
      }
      queryStr += ` LIMIT 25;`;

      const res = await client.query(queryStr, params);
      return res.rows;
    } catch (error) {
      logger.error({ msg: '❌ Error en getCandidatesForImage (PostgreSQL)', error: error.message });
      return [];
    } finally {
      await client.end();
    }
  }
}

module.exports = new CatalogService();
