const pool = require('../src/utils/db');

async function inspectRawJson() {
  const res = await pool.query(`SELECT id, events, edges FROM "PublicTypebot" WHERE id = 'jgis-publicidad-bot-f33vo50';`);
  if (res.rows.length === 0) {
    console.log('❌ No record in PublicTypebot');
    return;
  }

  const row = res.rows[0];
  console.log('📌 PUBLICTYPEBOT EVENTS & EDGES:');
  console.log('--- EVENTS ---');
  console.log(JSON.stringify(row.events, null, 2));
  console.log('--- EDGES ---');
  console.log(JSON.stringify(row.edges, null, 2));
}

inspectRawJson();
