const catalogService = require('../../src/services/catalog.service');

async function runSearchTests() {
  console.log('================================================================');
  console.log(' TEST BUSQUEDA DE CATALOGO UNIFICADO (15,751 VARIANTES)');
  console.log('================================================================\n');

  const testQueries = ['lapiceros metalicos', 'taza', 'tomatodo', 'libreta'];
  let passed = 0;

  for (const q of testQueries) {
    console.log(`🔍 Probando consulta: "${q}"...`);
    const results = await catalogService.searchCatalog(q);
    console.log(`   Resultados encontrados: ${results.length}`);

    if (results.length > 0) {
      passed++;
      results.slice(0, 3).forEach((item, idx) => {
        console.log(`   [${idx + 1}] Código: ${item.codigo} | Nombre: ${item.nombre} | Color: ${item.color} | Imagen: ${item.link_imagen}`);
      });
    } else {
      console.error(`   ❌ No se encontraron resultados para "${q}"`);
    }
    console.log('----------------------------------------------------------------');
  }

  console.log(`\nPruebas completadas: ${passed}/${testQueries.length}`);

  if (passed === testQueries.length) {
    console.log('✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE (EXIT CODE 0)');
    process.exit(0);
  } else {
    console.error('❌ ALGUNAS PRUEBAS FALLARON');
    process.exit(1);
  }
}

runSearchTests();
