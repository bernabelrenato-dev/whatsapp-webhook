const messageService = require('../src/services/message.service');

async function runCapLoopTest() {
  console.log('🧪 Iniciando Bucle de Pruebas E2E (LOOP TEST) para el Flujo de Anuncio de Gorras...');

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

  // --- ESCENARIO 1: Referral de Anuncio Meta de Gorras ---
  const mockCapReferral = {
    ad_id: '963093566323818',
    headline: 'Gorras Trucker Personalizadas - S/ 15',
    media_url: 'https://bot.jgispublicidad.pe/images/3115.jpg',
    source_url: 'https://fb.me/gorras_trucker_3115'
  };

  const mockMessagesCap = [{ referral: mockCapReferral, type: 'text', text: { body: 'Hola, quiero información' } }];

  await messageService.processCombinedMessages('51999888777', 'Cliente Anuncio Gorras', mockMessagesCap, {});

  console.log(`\n💬 Mensajes despachados en la secuencia de Anuncio de Gorras (${sentMessages.length}):`);
  sentMessages.forEach((msg, idx) => console.log(`  [${idx + 1}] Tipo: ${msg.type} -> ${msg.content ? msg.content.substring(0, 45).replace(/\n/g, ' ') + '...' : msg.url}`));

  // Verificación 1: Sincronización de Metadata interna de Chatwoot
  if (!referralSynced) {
    throw new Error('FALLO: La metadata interna del referral no se sincronizó con Chatwoot.');
  }
  console.log('✅ Verificación 1 - Metadata interna de Referral preservada en Chatwoot: ÉXITO');

  // Verificación 2: Foto del anuncio original entregada primero como referencia
  if (sentMessages[0].type !== 'image' || sentMessages[0].url !== 'https://bot.jgispublicidad.pe/images/3115.jpg') {
    throw new Error('FALLO: El primer mensaje debe ser la foto del anuncio original como referencia.');
  }
  console.log('✅ Verificación 2 - Foto de referencia del anuncio original entregada primero: ÉXITO');

  // Verificación 3: Galería COMPLETA de imágenes del catálogo de gorras
  const imageMessages = sentMessages.filter(m => m.type === 'image');
  console.log(`🖼️ Total de imágenes enviadas (Ad Original + Galería Completa): ${imageMessages.length}`);
  if (imageMessages.length < 8) { // 1 foto original + 7 fotos de galería
    throw new Error('FALLO: No se envió la galería COMPLETA de variantes de gorras (mínimo 7 variantes).');
  }
  console.log('✅ Verificación 3 - Galería COMPLETA de variantes de gorras despachada: ÉXITO');

  // Verificación 4: Plantilla exacta de pago/entrega solicitada
  const templateMsg = sentMessages.find(m => m.type === 'text' && m.content.includes('¡Gracias por tu interés en nuestras gorras!'));
  if (!templateMsg) {
    throw new Error('FALLO: No se entregó la plantilla oficial de pago/entrega de gorras.');
  }

  const requiredPhrases = [
    '📦 ¡Gracias por tu interés en nuestras gorras! 🧢',
    '💰 Costo: S/. 15 por unidad',
    '🚚 Método de entrega:',
    '✅ Envíos a todo el Perú',
    '🏬 Recojo en tienda',
    '⏱️ Tiempo de entrega (producción): 48 horas',
    '💳 Datos de Pago',
    '🏦 Banco: BCP',
    '💳 Cuenta Corriente (Soles): 1912434894087',
    '🔢 CCI: 00219100243489408755',
    '📱 Yape / Plin: 969732451',
    '👤 Titular: Corporación JGIS',
    '📍 Dirección',
    '🏢 Galería Centro Comercial Centro Lima',
    '🔻 Sótano – Pasaje "H", Stand 560',
    '🚪 Referencia: cerca de la Puerta 7 (Boulevard)',
    '¿Cuántas unidades te gustaría llevar? 😊'
  ];

  for (const phrase of requiredPhrases) {
    if (!templateMsg.content.includes(phrase)) {
      throw new Error(`FALLO: La plantilla no contiene la cadena exacta esperada: "${phrase}"`);
    }
  }

  console.log('✅ Verificación 4 - Plantilla oficial exacta con emojis y datos BCP/CCI/Yape/Plin: ÉXITO');
  console.log('\n🎉 BUCLE DE PRUEBAS COMPLETADO CON EXIT CODE 0.');
  process.exit(0);
}

runCapLoopTest();
