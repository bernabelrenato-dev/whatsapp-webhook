const pool = require('../src/utils/db');

async function inspectBuilderRecord() {
  const tRes = await pool.query(`SELECT * FROM "Typebot" WHERE id = 'tb_e94d31cb62545d1b';`);
  const ptRes = await pool.query(`SELECT * FROM "PublicTypebot" WHERE "typebotId" = 'tb_e94d31cb62545d1b';`);

  console.log('📌 TYPEBOT RECORD (tb_e94d31cb62545d1b):');
  console.log(JSON.stringify(tRes.rows[0], null, 2));

  console.log('\n📌 PUBLICTYPEBOT RECORD (tb_e94d31cb62545d1b):');
  console.log(JSON.stringify(ptRes.rows[0], null, 2));
}

inspectBuilderRecord();
