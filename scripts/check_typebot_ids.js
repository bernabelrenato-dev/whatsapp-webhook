const pool = require('../src/utils/db');

async function checkIds() {
  const tRows = await pool.query(`SELECT id, name FROM "Typebot";`);
  console.log('📌 TYPEBOT ROWS:');
  console.log(tRows.rows);

  const ptRows = await pool.query(`SELECT id, "typebotId" FROM "PublicTypebot";`);
  console.log('📌 PUBLICTYPEBOT ROWS:');
  console.log(ptRows.rows);
}

checkIds();
