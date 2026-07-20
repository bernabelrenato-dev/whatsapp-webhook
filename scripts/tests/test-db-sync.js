// Test de validación para la sincronización Sheets/CSV ➔ PostgreSQL
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dbSyncService = require(path.join(__dirname, '..', '..', 'src', 'services', 'dbSync.service'));
const logger = require('../../src/utils/logger');

logger.level = 'debug';

const csvPath = path.join(__dirname, '..', '..', 'catalogo_borrador.csv');

async function runTest() {
  console.log('🧪 Iniciando prueba de integración de sincronización Sheets/CSV ➔ PostgreSQL...');

  // 1. Restaurar el CSV de prueba para asegurar un estado conocido
  const originalCsvContent = 
`codigo,nombre,precio_venta,color,categoria,proveedor,imagen_url,stock,aprobado,sincronizado
MUG-32,Mug Termico Acero con Asa,15.50,Negro,MUGS Y TAZAS,Importadora JGIS,images/MUG-32.png,100,Approved,false
SET-1,Set Libreta y Lapicero Corcho,22.00,Natural,SETS ECOLOGICOS,Proveedor Express,images/SET-1.jpg,50,Draft,false`;
  
  fs.writeFileSync(csvPath, originalCsvContent.trim() + '\n', 'utf-8');
  console.log('📂 Archivo de prueba catalogo_borrador.csv restaurado.');

  // 2. Ejecutar la sincronización
  const result = await dbSyncService.syncCatalog();
  console.log(' Sincronización finalizada:', result);

  if (!result.success) {
    console.error('❌ Error ejecutando sincronización:', result.error);
    process.exit(1);
  }

  // 3. Validar en PostgreSQL
  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  await pgClient.connect();

  try {
    console.log('👁️ Validando registros insertados en la base de datos...');
    
    // Verificar si MUG-32 existe
    const resMug = await pgClient.query('SELECT * FROM "CatalogProducts" WHERE codigo = $1', ['MUG-32']);
    if (resMug.rows.length === 0) {
      console.error('❌ MUG-32 no fue insertado en PostgreSQL.');
      process.exit(1);
    }
    const product = resMug.rows[0];
    console.log('✅ MUG-32 verificado en base de datos:', {
      codigo: product.codigo,
      nombre: product.nombre,
      precio: product.precio_venta,
      proveedor: product.proveedor,
      imagen_url: product.imagen_url
    });

    // Verificar si SET-1 fue excluido
    const resSet = await pgClient.query('SELECT * FROM "CatalogProducts" WHERE codigo = $1', ['SET-1']);
    if (resSet.rows.length > 0) {
      console.error('❌ SET-1 (Borrador) fue incorrectamente insertado en PostgreSQL.');
      process.exit(1);
    }
    console.log('✅ SET-1 verificado correctamente como EXCLUIDO (estado Draft).');

    // 4. Validar actualización en el CSV
    console.log('📂 Validando actualizaciones en el archivo CSV...');
    const updatedCsv = fs.readFileSync(csvPath, 'utf-8');
    console.log('\nContenido actual del CSV:');
    console.log(updatedCsv);

    if (updatedCsv.includes('MUG-32,Mug Termico Acero con Asa,15.50,Negro,MUGS Y TAZAS,Importadora JGIS,images/MUG-32.png,100,Approved,true') &&
        updatedCsv.includes('SET-1,Set Libreta y Lapicero Corcho,22.00,Natural,SETS ECOLOGICOS,Proveedor Express,images/SET-1.jpg,50,Draft,false')) {
      console.log('🎉 PRUEBA DE INTEGRACIÓN EXITOSA. Sincronizó e inyectó los metadatos correctamente. 🏆');
      process.exit(0);
    } else {
      console.error('❌ Error: El archivo CSV no fue actualizado correctamente con los estados de sincronización.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error de consulta:', error.message);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

runTest();
