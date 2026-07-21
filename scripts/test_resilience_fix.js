const aiService = require('../src/services/ai.service');

async function testResilience() {
  console.log('🧪 Iniciando prueba de resiliencia de IA (Prueba de no-pausa y fallback de ventas)...');

  aiService.initialize();

  const phone = '51999111222';
  const name = 'Renatogod Test';

  // Forzar error simulado borrando temporalmente el modelo
  aiService.geminiModel = null;
  delete process.env.DEEPSEEK_API_KEY;

  const response = await aiService.generateResponse(phone, name, 'Hola');
  console.log('💬 Respuesta devuelta por el fallback de resiliencia:\n', response);

  const isPaused = aiService.isConversationPaused(phone);
  console.log('⏸️ ¿Conversación pausada tras el fallo?:', isPaused);

  if (isPaused) {
    throw new Error('FALLO CRÍTICO: La conversación se pausó tras un error de IA. Esto bloquea las futuras respuestas.');
  }

  if (!response.includes('Corporación JGIS') || !response.includes('Datos de Pago')) {
    throw new Error('FALLO: La respuesta de fallback no contiene el speech de ventas esperado.');
  }

  console.log('✅ Prueba 1 - Cero pausa tras fallo de IA: ÉXITO');
  console.log('✅ Prueba 2 - Fallback directo a Cierre Comercial: ÉXITO');
  console.log('🎉 TODAS LAS PRUEBAS DE RESILIENCIA FINALIZARON CON EXIT CODE 0.');
  process.exit(0);
}

testResilience();
