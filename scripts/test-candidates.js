const { Client } = require('pg');
require('dotenv').config();

async function testScoring() {
  const dbUrl = process.env.DATABASE_URL;
  const client = new Client({ connectionString: dbUrl });
  
  const terms = "mug thermo metalico";
  console.log(`🔎 Probando nuevo algoritmo de scoring para: "${terms}"`);
  
  try {
    await client.connect();
    
    const words = terms.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(w => w.length >= 3);
    console.log("Palabras procesadas:", words);
    
    if (words.length === 0) {
      console.log("No hay palabras de longitud >= 3");
      return;
    }

    let selectParts = [];
    let whereParts = [];
    const params = [];

    words.forEach((word, idx) => {
      const paramName = `$${idx + 1}`;
      params.push(`%${word}%`);
      
      selectParts.push(`
        (CASE WHEN (nombre ILIKE ${paramName}) THEN 5 ELSE 0 END) +
        (CASE WHEN (categoria ILIKE ${paramName}) THEN 3 ELSE 0 END) +
        (CASE WHEN (color ILIKE ${paramName}) THEN 2 ELSE 0 END) +
        (CASE WHEN (proveedor ILIKE ${paramName}) THEN 1 ELSE 0 END)
      `);
      
      whereParts.push(`(nombre ILIKE ${paramName} OR categoria ILIKE ${paramName} OR color ILIKE ${paramName} OR proveedor ILIKE ${paramName})`);
    });

    const scoreCalculation = selectParts.join(' + ');
    const queryStr = `
      SELECT codigo as code, nombre as name, categoria as category, color,
             (${scoreCalculation}) as score
      FROM "CatalogProducts"
      WHERE ${whereParts.join(' OR ')}
      ORDER BY score DESC, name ASC
      LIMIT 40;
    `;

    const res = await client.query(queryStr, params);
    console.log(`Candidatos encontrados (${res.rows.length}):`);
    console.log(JSON.stringify(res.rows.slice(0, 15), null, 2));
    
  } catch (err) {
    console.error("Error running query:", err);
  } finally {
    await client.end();
  }
}

testScoring();
