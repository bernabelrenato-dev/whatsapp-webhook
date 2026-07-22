const messageService = require('../src/services/message.service');

async function runCapLoopTest() {
  console.log('🧪 Iniciando Bucle de Pruebas E2E (LOOP TEST) para el Flujo Comercial Renato Bernabel...');

  let referralSynced = false;
  const sentMessages = [];

  messageService.sendTextMessage = async function(to, text) {
    sentMessages.push({ type: 'text', content: text });
  };
  messageService.sendImageMessage = async function(to, url) {
    sentMessages.push({ type: 'image', url });
  };
  messageService.syncReferralToChatwoot = async function() {
    referralSynced = true;
  };

  // --- ESCENARIO: Referral de Anuncio Meta con Flujo Renato Bernabel ---
  const mockCapReferral = {
    ad_id: '963093566323818',
    headline: 'Gorras Trucker Personalizadas - S/ 15',
    media_url: 'https://bot.jgispublicidad.pe/images/gorra_01.jpg',
    source_url: 'https://fb.me/gorras_trucker_3115'
  };

  const mockMessagesCap = [{ referral: mockCapReferral, type: 'text', text: { body: 'Hola, quiero información' } }];

  await messageService.processCombinedMessages('51999888777', 'Cliente Renato Bernabel Test', mockMessagesCap, {});

  console.log(`\n💬 Mensajes despachados en la secuencia Renato Bernabel (${sentMessages.length}):`);
  sentMessages.forEach((msg, idx) => console.log(`  [${idx + 1}] Tipo: ${msg.type} -> ${msg.content ? msg.content.substring(0, 50).replace(/\n/g, ' ') + '...' : msg.url}`));

  // Verificación 1: Sincronización de Metadata interna de Chatwoot
  if (!referralSynced) {
    throw new Error('FALLO: La metadata interna del referral no se sincronizó con Chatwoot.');
  }
  console.log('✅ Verificación 1 - Metadata interna de Referral preservada en Chatwoot: ÉXITO');

  // Verificación 2: Saludo Comercial de Renato Bernabel como primer mensaje
  const firstTextMsg = sentMessages.find(m => m.type === 'text');
  if (!firstTextMsg || !firstTextMsg.content.includes('Renato Bernabel')) {
    throw new Error('FALLO: El primer mensaje de texto debe ser el saludo comercial de Renato Bernabel.');
  }
  console.log('✅ Verificación 2 - Saludo Comercial de Renato Bernabel entregado primero: ÉXITO');

  // Verificación 3: Galería COMPLETA de las 7 imágenes reales de gorras
  const imageMessages = sentMessages.filter(m => m.type === 'image');
  console.log(`🖼️ Total de imágenes enviadas (Galería Completa de Gorras Reales): ${imageMessages.length}`);
  if (imageMessages.length !== 7) {
    throw new Error(`FALLO: Se esperaban exactamente 7 imágenes reales de gorras, se enviaron ${imageMessages.length}.`);
  }
  console.log('✅ Verificación 3 - Galería COMPLETA de 7 gorras reales despachada: ÉXITO');

  // Verificación 4: Mensaje final de solicitud de número y aviso de contacto
  const lastTextMsg = sentMessages.filter(m => m.type === 'text').pop();
  if (!lastTextMsg || !lastTextMsg.content.includes('déjanos tu número de teléfono')) {
    throw new Error('FALLO: El mensaje final debe solicitar el número de contacto del cliente.');
  }
  console.log('✅ Verificación 4 - Notificación final de contacto y solicitud de número entregada: ÉXITO');

  console.log('\n🎉 BUCLE DE PRUEBAS RENATO BERNABEL COMPLETADO CON EXIT CODE 0.');
  process.exit(0);
}

runCapLoopTest();
