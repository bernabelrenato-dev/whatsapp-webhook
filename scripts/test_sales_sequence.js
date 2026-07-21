const messageService = require('../src/services/message.service');

async function testSequence() {
  console.log('🧪 Probando la secuencia de 3 pasos para Mensajes Directos (desde teléfono) y Anuncios...');

  const sentMessages = [];
  messageService.sendTextMessage = async function(to, text) {
    sentMessages.push({ type: 'text', content: text });
  };
  messageService.sendImageMessage = async function(to, url) {
    sentMessages.push({ type: 'image', url });
  };
  messageService.syncReferralToChatwoot = async function() {};

  // Caso 1: Mensaje Directo desde teléfono (sin objeto referral de Meta)
  const mockMessagesDirect = [{ type: 'text', text: { body: 'Hola, quisiera información de productos' } }];

  await messageService.processCombinedMessages('51999888777', 'Cliente Telefono Directo', mockMessagesDirect, {});

  console.log(`💬 Mensajes despachados para chat directo desde teléfono (${sentMessages.length}):`);
  sentMessages.forEach((msg, idx) => console.log(`  [${idx + 1}] Tipo: ${msg.type} -> ${msg.content ? msg.content.substring(0, 40) + '...' : msg.url}`));

  if (sentMessages.length < 3) {
    throw new Error('FALLO: El chat directo desde teléfono debe entregar los 3 mensajes (Foto + Plantilla + Notificación).');
  }

  if (sentMessages[0].type !== 'image') {
    throw new Error('FALLO: El primer mensaje debe ser la Foto de Producto.');
  }

  if (!sentMessages[1].content.includes('Datos de Pago')) {
    throw new Error('FALLO: El segundo mensaje debe ser la Plantilla de Pagos.');
  }

  if (!sentMessages[2].content.includes('Nos contactaremos contigo lo antes posible')) {
    throw new Error('FALLO: El tercer mensaje debe ser la notificación de contacto.');
  }

  console.log('✅ Prueba 1 - Chat Directo desde celular recibe Foto de Producto por defecto: ÉXITO');
  console.log('✅ Prueba 2 - Chat Directo recibe Plantilla de Pagos: ÉXITO');
  console.log('✅ Prueba 3 - Chat Directo recibe Notificación de Contacto: ÉXITO');
  console.log('🎉 PRUEBA DE CHATS DIRECTOS DESDE CELULAR VERIFICADA CON EXIT CODE 0.');
  process.exit(0);
}

testSequence();
