// Script para ejecutar la sincronización del catálogo real
require('dotenv').config();
const dbSyncService = require('./src/services/dbSync.service');
const logger = require('./src/utils/logger');

logger.level = 'debug';

async function run() {
  console.log('🔄 Iniciando la sincronización del catálogo real...');
  const result = await dbSyncService.syncCatalog();
  console.log(' Sincronización completada:', result);
  process.exit(result.success ? 0 : 1);
}

run().catch(err => {
  console.error('❌ Error de sincronización:', err);
  process.exit(1);
});
