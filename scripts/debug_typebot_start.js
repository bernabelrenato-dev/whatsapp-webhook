const pool = require('../src/utils/db');

async function debugFlow() {
  const res = await pool.query(`SELECT groups, edges, events FROM "PublicTypebot" WHERE id = 'jgis-publicidad-bot-f33vo50';`);
  if (res.rows.length === 0) {
    console.log('❌ No record found in PublicTypebot');
    process.exit(1);
  }

  const row = res.rows[0];
  console.log('📌 DB PublicTypebot:');
  console.log('   - events:', JSON.stringify(row.events));
  console.log('   - edges:', JSON.stringify(row.edges));
  console.log('   - groups count:', row.groups ? row.groups.length : 0);
  process.exit(0);
}

debugFlow();
