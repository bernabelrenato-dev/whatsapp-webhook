// Script para validar las optimizaciones del buscador del catálogo y de imágenes
require('dotenv').config();
const catalogService = require('./src/services/catalog.service');
const logger = require('./src/utils/logger');

logger.level = 'debug';

async function runTest() {
  console.log('🧪 Iniciando prueba de catálogo e imágenes...');
  
  // Prueba 1: Búsqueda regular
  console.log('\n🔎 Prueba 1: Buscando "taza" en catálogo regular...');
  const searchResults = await catalogService.searchCatalog('taza');
  console.log(`   Resultados encontrados: ${searchResults.length}`);
  if (searchResults.length > 0) {
    console.log(`   Primer resultado: ${searchResults[0].nombre} (${searchResults[0].codigo})`);
  }

  // Prueba 2: Búsqueda de candidatos de imagen (antes fallaba con AND estricto)
  console.log('\n📸 Prueba 2: Solicitando candidatos para "taza roja" (usa OR y múltiples campos)...');
  const candidatesRoja = await catalogService.getCandidatesForImage('taza roja');
  console.log(`   Candidatos encontrados para "taza roja": ${candidatesRoja.length}`);
  if (candidatesRoja.length > 0) {
    console.log('   Muestra de candidatos:');
    candidatesRoja.slice(0, 5).forEach(c => {
      console.log(`     - [${c.code}] ${c.name} (Categoría: ${c.category}, Color: ${c.color})`);
    });
  } else {
    console.error('❌ Error: No se encontraron candidatos para "taza roja".');
  }

  console.log('\n📸 Prueba 3: Solicitando candidatos para "tomatodo metal azul"...');
  const candidatesAzul = await catalogService.getCandidatesForImage('tomatodo metal azul');
  console.log(`   Candidatos encontrados para "tomatodo metal azul": ${candidatesAzul.length}`);
  if (candidatesAzul.length > 0) {
    console.log('   Muestra de candidatos:');
    candidatesAzul.slice(0, 5).forEach(c => {
      console.log(`     - [${c.code}] ${c.name} (Categoría: ${c.category}, Color: ${c.color})`);
    });
  }

  console.log('\n🎉 Pruebas completadas exitosamente.');
  process.exit(0);
}

runTest().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
