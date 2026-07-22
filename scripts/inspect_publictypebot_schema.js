const pool = require('../src/utils/db');

async function inspectSchema() {
  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'PublicTypebot';
  `);
  console.log('📋 Columnas de "PublicTypebot":');
  cols.rows.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));

  const row = await pool.query(`SELECT * FROM "PublicTypebot" WHERE id = 'jgis-publicidad-bot-f33vo50';`);
  if (row.rows.length > 0) {
    console.log('\n📄 REGISTRO PUBLICTYPEBOT LLAVES:');
    console.log(Object.keys(row.rows[0]));
  }
}

inspectSchema();
