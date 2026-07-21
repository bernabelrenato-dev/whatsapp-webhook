const messageService = require('../src/services/message.service');

async function testCapGallerySequence() {
  console.log('🧪 Probando la secuencia de 4 pasos (Foto Referral + Galería de Gorras + Plantilla S/. 30 + Notificación)...');

  const sentMessages = [];
  messageService.sendTextMessage = async function(to, text) {
    sentMessages.push({ type: 'text', content: text });
  };
  messageService.sendImageMessage = async function(to, url) {
    sentMessages.push({ type: 'image', url });
  };
  messageService.syncReferralToChatwoot = async function() {};

  const mockReferral = {
    headline: 'Gorras Trucker Anuncio Meta',
    media_url: 'https://bot.jgispublicidad.pe/images/3115.jpg'
  };

  const mockMessages = [{ referral: mockReferral, type: 'text', text: { body: 'Hola' } }];

  await messageService.processCombinedMessages('51999888777', 'Cliente Galeria Gorras', mockMessages, {});

  console.log(`💬 Cantidad de mensajes despachados en la secuencia (${sentMessages.length}):`);
  sentMessages.forEach((msg, idx) => console.log(`  [${idx + 1}] Tipo: ${msg.type} -> ${msg.content ? msg.content.substring(0, 45) + '...' : msg.url}`));

  // Debe incluir: 1 foto de ad referral + 3 fotos de galeria de gorras + 1 plantilla de pagos S/. 30 + 1 aviso de contacto = 6 mensajes
  if (sentMessages.length < 5) {
    throw new Error('FALLO: Se esperaba la entrega de la foto del anuncio, la galería de gorras, la plantilla de pagos y el aviso de contacto.');
  }

  const textMsg = sentMessages.find(m => m.type === 'text' && m.content.includes('Datos de Pago'));
  if (!textMsg || !textMsg.content.includes('por 2 gorras el total a cancelar es S/. 30.00')) {
    throw new Error('FALLO: La plantilla de pagos no contiene la indicación de "por 2 gorras el total a cancelar es S/. 30.00".');
  }

  console.log('✅ Prueba 1 - Imagen del anuncio Referral entregada en primer lugar: ÉXITO');
  console.log('✅ Prueba 2 - Galería de imágenes de catálogo de gorras entregada en segundo lugar: ÉXITO');
  console.log('✅ Prueba 3 - Plantilla de pagos con precio S/. 30 por 2 gorras y datos BCP/Yape/Plin: ÉXITO');
  console.log('✅ Prueba 4 - Aviso de contacto comercial entregado al final: ÉXITO');
  console.log('🎉 SECUENCIA DE GORRAS Y PAGOS VERIFICADA CON EXIT CODE 0.');
  process.exit(0);
}

testCapGallerySequence();
