const pool = require('../src/utils/db');

async function inspectWorking() {
  const res = await pool.query(`SELECT id, events, edges, groups FROM "PublicTypebot" WHERE id = 'pub_ecd56eb52ac6744d';`);
  if (res.rows.length > 0) {
    const row = res.rows[0];
    console.log('📌 WORKING TYPEBOT (pub_ecd56eb52ac6744d) STRUCTURE:');
    console.log('--- EVENTS ---');
    console.log(JSON.stringify(row.events, null, 2));
    console.log('--- EDGES ---');
    console.log(JSON.stringify(row.edges, null, 2));
    console.log('--- GROUPS (FIRST 2) ---');
    console.log(JSON.stringify(row.groups.slice(0, 2), null, 2));
  }
}

inspectWorking();
