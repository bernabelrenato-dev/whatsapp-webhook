const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@jgis-postgres:5432/typebot'
});

async function inspectPublic() {
  try {
    const res = await pool.query('SELECT id, "typebotId", groups FROM "PublicTypebot" WHERE id = \'jgis-publicidad-bot-f33vo50\'');
    if (res.rows.length === 0) {
      console.log('❌ No se encontró PublicTypebot jgis-publicidad-bot-f33vo50');
      return;
    }
    const groups = res.rows[0].groups;
    console.log(`Total grupos en PublicTypebot DB: ${groups.length}`);

    // Check all blocks for picture input or input missing fields
    groups.forEach((g, gIdx) => {
      g.blocks.forEach((b, bIdx) => {
        if (b.type === 'picture input' || b.type === 'file input') {
          console.log(`[PublicTypebot DB] Grupo ${gIdx} "${g.title}" Bloque ${bIdx} "${b.id}" -> type: ${b.type}, options:`, JSON.stringify(b.options));
        }
      });
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

inspectPublic();
