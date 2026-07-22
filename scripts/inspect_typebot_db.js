require('dotenv').config();
const { Pool } = require('pg');

async function inspectTypebotDb() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@jgis-postgres:5432/typebot'
  });

  try {
    const colsRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Typebot';
    `);
    console.log('📋 Columnas de la tabla "Typebot":');
    colsRes.rows.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));

    const typebotsRes = await pool.query(`SELECT id, name, "publishedTypebotId", "workspaceId" FROM "Typebot" LIMIT 5;`);
    console.log('\n🤖 Flujos existentes en "Typebot":');
    console.log(typebotsRes.rows);

    const workspacesRes = await pool.query(`SELECT id, name FROM "Workspace" LIMIT 5;`);
    console.log('\n🏢 Workspaces existentes:');
    console.log(workspacesRes.rows);

  } catch (err) {
    console.error('❌ Error inspeccionando DB:', err.message);
  } finally {
    await pool.end();
  }
}

inspectTypebotDb();
