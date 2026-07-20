const { Pool } = require('pg');
const logger = require('./logger');

let pool = null;

/**
 * Obtiene o crea la instancia del pool de conexiones de PostgreSQL.
 * @returns {Pool|null}
 */
function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      logger.warn('DATABASE_URL no está configurada.');
      return null;
    }
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      logger.error({ msg: 'Error no esperado en cliente inactivo del pool de PostgreSQL', error: err.message });
    });
  }
  return pool;
}

/**
 * Ejecuta una consulta SQL usando el pool de conexiones.
 * @param {string} text Consulta SQL.
 * @param {Array} params Parámetros de la consulta.
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const p = getPool();
  if (!p) {
    throw new Error('DATABASE_URL no configurada para realizar consultas SQL');
  }
  return p.query(text, params);
}

module.exports = {
  getPool,
  query,
};
