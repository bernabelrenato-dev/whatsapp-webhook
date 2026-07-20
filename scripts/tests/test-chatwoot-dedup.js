/**
 * Test de Integración Local — Deduplicación de Conversaciones en Chatwoot
 * Simula peticiones entrantes repetidas con distintas variaciones de formato de número telefónico
 * y verifica que el gestor de sesiones en memoria y resolución de API reutilice siempre el mismo ID.
 */

const assert = require('assert');
const messageService = require('../../src/services/message.service');

async function testDeduplication() {
  console.log('🧪 Iniciando prueba de deduplicación de conversaciones...');

  // Simular almacenamiento en la caché de Chatwoot
  const testPhoneClean = '51978966098';
  const expectedConvId = 999;

  // Inyectar entrada en la caché interna usando el teléfono limpio
  messageService.chatwootConversations.set(testPhoneClean, expectedConvId);

  // Intentar obtener ID con variantes de formato
  const id1 = await messageService.getOrCreateConversationId('+51978966098', 'Cliente Test');
  const id2 = await messageService.getOrCreateConversationId('51978966098', 'Cliente Test');
  const id3 = await messageService.getOrCreateConversationId('  +51 (978) 966-098  ', 'Cliente Test');

  assert.strictEqual(id1, expectedConvId, 'Fallo: +51978966098 generó un ID de conversación diferente');
  assert.strictEqual(id2, expectedConvId, 'Fallo: 51978966098 generó un ID de conversación diferente');
  assert.strictEqual(id3, expectedConvId, 'Fallo: número formateado con espacios generó un ID diferente');

  console.log('✅ Deduplicación en caché multiformato: PASADO (3/3 solicitudes devolvieron el mismo ID 999)');
  console.log('🎉 PRUEBA DE DEDUPLICACIÓN COMPLETADA CON ÉXITO (Exit Code 0).');
}

testDeduplication().catch(err => {
  console.error('❌ Error en test de deduplicación:', err);
  process.exit(1);
});
