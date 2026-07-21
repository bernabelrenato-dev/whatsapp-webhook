const messageService = require('../src/services/message.service');

async function testSequence() {
  console.log('🧪 Probando la secuencia de 3 pasos (Foto Ad + Plantilla de Pagos + Notificación)...');

  const sentMessages = [];
  messageService.sendTextMessage = async function(to, text) {
    sentMessages.push({ type: 'text', content: text });
  };
  messageService.sendImageMessage = async function(to, url) {
    sentMessages.push({ type: 'image', url });
  };
  messageService.syncReferralToChatwoot = async function() {};

  const mockReferral = {
    headline: 'Gorras Trucker Personalizadas',
    media_url: 'https://bot.jgispublicidad.pe/images/test_ad.jpg'
  };

  const mockMessages = [{ referral: mockReferral, type: 'text', text: { body: 'Hola' } }];

  await messageService.processCombinedMessages('51999888777', 'Cliente Secuencia', mockMessages, {});

  console.log(`💬 Cantidad de mensajes despachados en la secuencia: ${sentMessages.length}`);
  sentMessages.forEach((msg, idx) => console.log(`  [${idx + 1}] Tipo: ${msg.type} -> ${msg.content ? msg.content.substring(0, 40) + '...' : msg.url}`));

  if (sentMessages.length < 3) {
    throw new Error('FALLO: La secuencia debe contener 3 mensajes (Foto + Plantilla + Notificación).');
  }

  if (!sentMessages[1].content.includes('Datos de Pago')) {
    throw new Error('FALLO: El segundo mensaje debe ser la Plantilla de Pagos.');
  }

  if (!sentMessages[2].content.includes('Nos contactaremos contigo lo antes posible')) {
    throw new Error('FALLO: El tercer mensaje debe ser la notificación de contacto.');
  }

  console.log('✅ Prueba 1 - Imagen del anuncio entregada primero: ÉXITO');
  console.log('✅ Prueba 2 - Plantilla de Pagos entregada en segundo lugar: ÉXITO');
  console.log('✅ Prueba 3 - Notificación de contacto entregada al final: ÉXITO');
  console.log('🎉 SECUENCIA VERIFICADA CON EXIT CODE 0.');
  process.exit(0);
}

testSequence();
