require('dotenv').config();
const { Pool } = require('pg');

async function debugTypebotSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@jgis-postgres:5432/typebot'
  });

  try {
    const res = await pool.query(`SELECT id, name, groups, variables, edges, theme, settings, version, "createdAt", "updatedAt" FROM "Typebot";`);
    console.log(`📌 Total Typebots en DB: ${res.rows.length}`);

    res.rows.forEach((tb, i) => {
      console.log(`\n==================================================`);
      console.log(`🤖 Typebot [${i + 1}]: ID: ${tb.id} | Name: ${tb.name} | Version: ${tb.version}`);
      console.log(`   - Groups type: ${typeof tb.groups} | length/keys: ${Array.isArray(tb.groups) ? tb.groups.length : Object.keys(tb.groups || {})}`);
      console.log(`   - Variables: ${JSON.stringify(tb.variables)}`);
      console.log(`   - Sample Group 0:`, JSON.stringify(tb.groups?.[0] || tb.groups, null, 2).substring(0, 300));
    });
  } catch (err) {
    console.error('❌ Error leyendo esquema:', err.message);
  } finally {
    await pool.end();
  }
}

debugTypebotSchema();
