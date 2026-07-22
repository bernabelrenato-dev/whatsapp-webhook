const pool = require('../src/utils/db');

async function inspectRawJson() {
  const res = await pool.query(`SELECT id, events, edges, groups FROM "Typebot" WHERE id = 'jgis-publicidad-bot-f33vo50';`);
  if (res.rows.length === 0) {
    console.log('❌ No record in Typebot');
    process.exit(1);
  }

  const row = res.rows[0];
  console.log('📌 TYPEBOT RAW JSON:');
  console.log('--- EVENTS ---');
  console.log(JSON.stringify(row.events, null, 2));
  console.log('--- EDGES ---');
  console.log(JSON.stringify(row.edges, null, 2));
  console.log('--- GROUPS ---');
  console.log(JSON.stringify(row.groups, null, 2));
  process.exit(0);
}

inspectRawJson();
