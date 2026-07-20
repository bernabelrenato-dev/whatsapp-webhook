const db = require('../utils/db');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let imageFilesCache = null;
let lastImageCacheTime = 0;

function getImagesDirectoryFiles() {
  const now = Date.now();
  if (imageFilesCache && (now - lastImageCacheTime < 60000)) {
    return imageFilesCache;
  }
  try {
    const imagesDir = path.join(__dirname, '..', 'public', 'images');
    if (fs.existsSync(imagesDir)) {
      imageFilesCache = fs.readdirSync(imagesDir);
      lastImageCacheTime = now;
      return imageFilesCache;
    }
  } catch (err) {
    logger.warn({ msg: 'Error resolviendo directorio de imágenes estáticas', error: err.message });
  }
  imageFilesCache = [];
  lastImageCacheTime = now;
  return imageFilesCache;
}

function getRealImageUrl(codigo, fallbackUrl) {
  const files = getImagesDirectoryFiles();
  const cleanCode = (codigo || '').trim().toUpperCase();

  const match = files.find(f => {
    const baseName = path.basename(f, path.extname(f)).toUpperCase();
    return baseName === cleanCode;
  });

  if (match) {
    return `${process.env.PUBLIC_URL}/images/${match}`;
  }

  if (fallbackUrl) {
    return `${process.env.PUBLIC_URL}/${fallbackUrl}`;
  }
  return 'No disponible';
}

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
    if (!query || typeof query !== 'string') {
      return [];
    }

    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      return [];
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });

    try {
      await client.connect();

      // Normalizar tildes y caracteres especiales en la consulta
      const normQuery = cleanQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const words = normQuery.split(/\s+/).filter(w => w.length >= 2);

      // Expresión SQL para normalizar columnas en la DB a minúsculas y sin tildes
      const normCol = (col) => `translate(LOWER(${col}), 'áéíóúÁÉÍÓÚäëïöüÄËÏÖÜñÑ', 'aeiouaeiouaeiouaeiounn')`;

      const params = [`%${normQuery}%`];
      let selectScoreParts = [
        `(CASE WHEN (${normCol('codigo')} ILIKE $1) THEN 50 ELSE 0 END)`,
        `(CASE WHEN (${normCol('nombre')} ILIKE $1) THEN 30 ELSE 0 END)`
      ];
      let whereParts = [
        `(${normCol('codigo')} ILIKE $1 OR ${normCol('nombre')} ILIKE $1 OR ${normCol('categoria')} ILIKE $1 OR ${normCol('color')} ILIKE $1 OR ${normCol('proveedor')} ILIKE $1)`
      ];

      words.forEach((word, idx) => {
        const paramIdx = idx + 2;
        params.push(`%${word}%`);
        const p = `$${paramIdx}`;
        selectScoreParts.push(`(CASE WHEN (${normCol('codigo')} ILIKE ${p}) THEN 8 ELSE 0 END)`);
        selectScoreParts.push(`(CASE WHEN (${normCol('nombre')} ILIKE ${p}) THEN 10 ELSE 0 END)`);
        selectScoreParts.push(`(CASE WHEN (${normCol('categoria')} ILIKE ${p}) THEN 5 ELSE 0 END)`);
        selectScoreParts.push(`(CASE WHEN (${normCol('color')} ILIKE ${p}) THEN 3 ELSE 0 END)`);
        selectScoreParts.push(`(CASE WHEN (${normCol('proveedor')} ILIKE ${p}) THEN 2 ELSE 0 END)`);

        whereParts.push(`(${normCol('codigo')} ILIKE ${p} OR ${normCol('nombre')} ILIKE ${p} OR ${normCol('categoria')} ILIKE ${p} OR ${normCol('color')} ILIKE ${p} OR ${normCol('proveedor')} ILIKE ${p})`);
      });

      const scoreCalculation = selectScoreParts.join(' + ');
      const sqlQuery = `
        SELECT codigo, nombre, precio_venta, color, categoria, proveedor, imagen_url, stock,
               (${scoreCalculation}) as score
        FROM "CatalogProducts"
        WHERE ${whereParts.join(' OR ')}
        ORDER BY score DESC, nombre ASC
        LIMIT 6;
      `;

      const res = await client.query(sqlQuery, params);

      let processedResults = res.rows.map(item => {
        const prices = this.calculateSellingPrices(item.precio_venta);
        return {
          codigo: item.codigo,
          nombre: item.nombre,
          descripcion: `Color: ${item.color || 'Varios'}, Proveedor: ${item.proveedor || 'N/A'}, Categoría: ${item.categoria || 'General'}`,
          color: item.color,
          stock: item.stock !== null ? item.stock : 'Disponible en stock continuo',
          categoria: item.categoria,
          precios_venta_sin_igv: prices,
          link_imagen: getRealImageUrl(item.codigo, item.imagen_url)
        };
      });

      // Si no se encontraron modelos específicos, generar opciones por categoría para Meta Ads
      if (processedResults.length === 0) {
        const q = normQuery;
        if (q.includes('gorra')) {
          processedResults.push({
            codigo: 'GORRA-TRUCKER',
            nombre: 'GORRA TRUCKER PUBLICITARIA SUBLIMADA / BORDADA',
            descripcion: 'Gorras publicitarias modelo Trucker o Dril 100% personalizadas con logo.',
            color: 'Negro, Azul, Rojo, Blanco, Verde, Amarillo',
            stock: 'Disponible en stock continuo',
            categoria: 'GORRAS',
            precios_venta_sin_igv: this.calculateSellingPrices(5.00),
            link_imagen: getRealImageUrl('GORRA-TRUCKER', 'images/GORRA-TRUCKER.jpg')
          });
        } else if (q.includes('lanyard') || q.includes('cinta') || q.includes('fotocheck')) {
          processedResults.push({
            codigo: 'LANYARD-20MM',
            nombre: 'CINTA LANYARD DE FOTOCHECK SUBLIMADA 20MM',
            descripcion: 'Cintas de fotocheck sublimadas a full color con tiptop de seguridad y mosquetón.',
            color: 'Full Color Sublimado',
            stock: 'Disponible en stock continuo',
            categoria: 'CINTAS Y LANYARDS',
            precios_venta_sin_igv: this.calculateSellingPrices(1.50),
            link_imagen: getRealImageUrl('LANYARD-20MM', 'images/LANYARD-20MM.jpg')
          });
        } else if (q.includes('polo')) {
          processedResults.push({
            codigo: 'POLO-SPUN',
            nombre: 'POLO PUBLICITARIO 100% SPUN SUBLIMADO',
            descripcion: 'Polos publicitarios y corporativos personalizados con logo.',
            color: 'Blanco, Melange',
            stock: 'Disponible en stock continuo',
            categoria: 'TEXTIL',
            precios_venta_sin_igv: this.calculateSellingPrices(10.00),
            link_imagen: getRealImageUrl('POLO-SPUN', 'images/POLO-SPUN.jpg')
          });
        } else if (q.includes('mouse') || q.includes('pad')) {
          processedResults.push({
            codigo: 'MP01',
            nombre: 'MOUSE PAD PERSONALIZADO SUBLIMADO',
            descripcion: 'Mouse pad ergonómico antideslizante 3mm sublimado full color.',
            color: 'Full Color Sublimado',
            stock: 'Disponible en stock continuo',
            categoria: 'ART. ESCRITORIO',
            precios_venta_sin_igv: this.calculateSellingPrices(3.50),
            link_imagen: getRealImageUrl('MP01', 'images/MP01.jpg')
          });
        }
      }

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
   * @returns {Promise<Array>} Listado de hasta 40 productos candidatos.
   */
  async getCandidatesForImage(terms) {
    if (!terms || typeof terms !== 'string') return [];
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return [];

    const client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();
      
      // Separar los términos en palabras clave de búsqueda (quitar tildes, minúsculas, palabras de >= 2 letras)
      const normTerms = terms.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const words = normTerms.split(/\s+/).filter(w => w.length >= 2);
      if (words.length === 0) return [];

      const normCol = (col) => `translate(LOWER(${col}), 'áéíóúÁÉÍÓÚäëïöüÄËÏÖÜñÑ', 'aeiouaeiouaeiouaeiounn')`;

      let selectParts = [];
      let whereParts = [];
      const params = [];

      words.forEach((word, idx) => {
        const paramName = `$${idx + 1}`;
        params.push(`%${word}%`);
        
        // Sumar puntos si coincide en codigo (peso 8), nombre (peso 5), categoria (peso 3), color (peso 2), o proveedor (peso 1)
        selectParts.push(`
          (CASE WHEN (${normCol('codigo')} ILIKE ${paramName}) THEN 8 ELSE 0 END) +
          (CASE WHEN (${normCol('nombre')} ILIKE ${paramName}) THEN 5 ELSE 0 END) +
          (CASE WHEN (${normCol('categoria')} ILIKE ${paramName}) THEN 3 ELSE 0 END) +
          (CASE WHEN (${normCol('color')} ILIKE ${paramName}) THEN 2 ELSE 0 END) +
          (CASE WHEN (${normCol('proveedor')} ILIKE ${paramName}) THEN 1 ELSE 0 END)
        `);
        
        whereParts.push(`(${normCol('codigo')} ILIKE ${paramName} OR ${normCol('nombre')} ILIKE ${paramName} OR ${normCol('categoria')} ILIKE ${paramName} OR ${normCol('color')} ILIKE ${paramName} OR ${normCol('proveedor')} ILIKE ${paramName})`);
      });

      const scoreCalculation = selectParts.join(' + ');
      const queryStr = `
        SELECT codigo as code, nombre as name, categoria as category, color,
               (${scoreCalculation}) as score
        FROM "CatalogProducts"
        WHERE ${whereParts.join(' OR ')}
        ORDER BY score DESC, name ASC
        LIMIT 40;
      `;

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
