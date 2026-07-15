const catalog = require('../config/catalog.json');
const logger = require('../utils/logger');

class CatalogService {
  /**
   * Realiza una búsqueda de palabras clave en el catálogo consolidado de productos.
   * @param {string} query Término de búsqueda de producto.
   * @returns {Array} Listado de hasta 5 productos que coincidan.
   */
  /**
   * Calcula los precios de venta al público aplicando el margen de JGIS
   * en base a los precios de costo del Excel.
   */
  calculateSellingPrices(item) {
    const cost_500 = item.price_500;
    const cost_50 = item.price_50 || cost_500;
    const cost_1 = item.price_1 || cost_50 || cost_500;

    return {
      precio_1_5_unidades: cost_1 ? `S/ ${(cost_1 * 1.85).toFixed(2)}` : 'No disponible',
      precio_6_12_unidades: cost_1 ? `S/ ${(cost_1 * 1.40).toFixed(2)}` : 'No disponible',
      precio_13_50_unidades: cost_50 ? `S/ ${(cost_50 * 1.35).toFixed(2)}` : 'No disponible',
      precio_51_499_unidades: cost_50 ? `S/ ${(cost_50 * 1.25).toFixed(2)}` : 'No disponible',
      precio_500_1000_unidades: cost_500 ? `S/ ${(cost_500 * 1.20).toFixed(2)}` : 'No disponible'
    };
  }

  /**
   * Realiza una búsqueda de palabras clave en el catálogo consolidado de productos.
   * @param {string} query Término de búsqueda de producto.
   * @returns {Array} Listado de hasta 5 productos que coincidan con sus precios de venta calculados.
   */
  searchCatalog(query) {
    if (!query || typeof query !== 'string') return [];
    
    logger.debug({ msg: 'Buscando en catálogo de precios', query });
    
    // Normalizar la consulta (quitar tildes, minúsculas, espacios)
    const cleanQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    if (cleanQuery.length < 2) return [];

    let results = [];

    // 1. Intentar buscar por coincidencia exacta de código de producto (ej. "MUG-39")
    const codeMatches = catalog.filter(item => {
      const code = (item.code || '').toLowerCase().trim();
      return code === cleanQuery || code.includes(cleanQuery);
    });

    if (codeMatches.length > 0) {
      logger.info({ msg: 'Coincidencia de código encontrada', count: codeMatches.length, query });
      results = codeMatches.slice(0, 5);
    } else {
      // 2. Coincidencia por palabras clave en nombre, descripción y categoría
      const words = cleanQuery.split(/\s+/).filter(w => w.length >= 2);
      if (words.length > 0) {
        const scoreMatches = catalog.map(item => {
          const name = (item.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const desc = (item.description || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const category = (item.category || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

          let score = 0;
          words.forEach(word => {
            if (name.includes(word)) score += 5; // Mayor peso al nombre
            if (category.includes(word)) score += 3; // Peso medio a la categoría
            if (desc.includes(word)) score += 1; // Menor peso a la descripción
          });

          return { item, score };
        });

        results = scoreMatches
          .filter(m => m.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(m => m.item)
          .slice(0, 6);
      }
    }

    // Mapear resultados agregando los precios calculados
    const processedResults = results.map(item => {
      const prices = this.calculateSellingPrices(item);
      return {
        codigo: item.code,
        nombre: item.name,
        descripcion: item.description,
        color: item.color,
        stock: item.stock,
        categoria: item.category,
        precios_venta_sin_igv: prices,
        link_imagen: item.image ? `https://whatsapp-webhook-bilg.onrender.com/images/${item.image}` : 'No disponible'
      };
    });


    logger.info({ msg: 'Resultados de búsqueda de catálogo procesados', count: processedResults.length, query });
    return processedResults;
  }
}


module.exports = new CatalogService();
