const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@jgis-postgres:5432/typebot'
});

async function inspect() {
  try {
    const res = await pool.query('SELECT id, name, "publicId" FROM "Typebot"');
    console.log('--- TYPEBOTS EN BASE DE DATOS ---');
    console.table(res.rows);

    const pubRes = await pool.query('SELECT id, "typebotId" FROM "PublicTypebot"');
    console.log('--- PUBLICTYPEBOTS EN BASE DE DATOS ---');
    console.table(pubRes.rows);
  } catch (e) {
    console.error('Error inspeccionando DB:', e.message);
  } finally {
    await pool.end();
  }
}

inspect();
