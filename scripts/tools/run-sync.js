// Runner para ejecutar la sincronización de catálogo desde el archivo de staging a PostgreSQL
require('dotenv').config();
const dbSyncService = require('../../src/services/dbSync.service');

async function run() {
  console.log('🏁 Iniciando proceso de inyección a PostgreSQL...');
  const result = await dbSyncService.syncCatalog();
  console.log('\n----------------------------------------');
  console.log('Resultado de la Sincronización:', result);
  console.log('----------------------------------------');
  if (result.success) {
    console.log('🎉 Sincronización completada exitosamente.');
    process.exit(0);
  } else {
    console.error('❌ Error durante la sincronización:', result.error);
    process.exit(1);
  }
}

run();
