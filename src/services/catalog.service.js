const catalog = require('../config/catalog.json');
const logger = require('../utils/logger');

class CatalogService {
  /**
   * Realiza una búsqueda de palabras clave en el catálogo consolidado de productos.
   * @param {string} query Término de búsqueda de producto.
   * @returns {Array} Listado de hasta 5 productos que coincidan.
   */
  searchCatalog(query) {
    if (!query || typeof query !== 'string') return [];
    
    logger.debug({ msg: 'Buscando en catálogo de precios', query });
    
    // Normalizar la consulta (quitar tildes, minúsculas, espacios)
    const cleanQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    if (cleanQuery.length < 2) return [];

    // 1. Intentar buscar por coincidencia exacta de código de producto (ej. "MUG-39")
    const codeMatches = catalog.filter(item => {
      const code = (item.code || '').toLowerCase().trim();
      return code === cleanQuery || code.includes(cleanQuery);
    });

    if (codeMatches.length > 0) {
      logger.info({ msg: 'Coincidencia de código encontrada', count: codeMatches.length, query });
      return codeMatches.slice(0, 5);
    }

    // 2. Coincidencia por palabras clave en nombre, descripción y categoría
    const words = cleanQuery.split(/\s+/).filter(w => w.length >= 2);
    if (words.length === 0) return [];

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

    const results = scoreMatches
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(m => m.item)
      .slice(0, 6);

    logger.info({ msg: 'Resultados de búsqueda de catálogo generados', count: results.length, query });
    return results;
  }
}

module.exports = new CatalogService();
