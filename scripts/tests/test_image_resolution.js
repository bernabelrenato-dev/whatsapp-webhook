const catalogService = require('../../src/services/catalog.service');

console.log('=== TEST RESOLUCION DE IMAGENES DE PRODUCTOS ===');

const testCodes = [
  'MUG-32',
  '2086-R\r\n(RP-2351)',
  'TM-23 MATE',
  '7229-R\r\n(RP-7229)',
  'FXA-01\r\n(TY-A01)'
];

let passed = 0;

testCodes.forEach(code => {
  const url = catalogService.getRealImageUrl(code);
  console.log(`Código: "${code.replace(/[\r\n]+/g, ' ')}" => URL: ${url}`);
  if (url && url !== 'No disponible') {
    passed++;
  } else {
    console.error(`❌ Falló la resolución de imagen para: ${code}`);
  }
});

console.log(`\nPruebas pasadas: ${passed}/${testCodes.length}`);

if (passed === testCodes.length) {
  console.log('✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE (EXIT CODE 0)');
  process.exit(0);
} else {
  console.error('❌ ALGUNAS PRUEBAS FALLARON');
  process.exit(1);
}
