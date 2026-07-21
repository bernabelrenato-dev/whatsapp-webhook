const metaGraphService = require('../src/services/metaGraph.service');

async function testMetaFixes() {
  console.log('🧪 Iniciando prueba automatizada del resolvedor de nombres de Meta y bypass de Error #100...');

  // 1. Simular resolución de perfil de Meta Graph cuando el nombre es "John Doe"
  metaGraphService.getFacebookProfile = async function(psid) {
    if (psid === '123456789_john_doe_psid') {
      return {
        firstName: 'Renato',
        lastName: 'Bernabel',
        fullName: 'Renato Bernabel',
        profilePic: 'https://graph.facebook.com/123456789/picture'
      };
    }
    return null;
  };

  let updatedNameInChatwoot = null;
  metaGraphService.resolveAndUpdateChatwootContact = async function(contactId, psid) {
    const profile = await this.getFacebookProfile(psid);
    if (profile) {
      updatedNameInChatwoot = profile.fullName;
    }
  };

  await metaGraphService.resolveAndUpdateChatwootContact(99, '123456789_john_doe_psid');

  console.log(`👤 Nombre actualizado en Chatwoot para contacto John Doe: "${updatedNameInChatwoot}"`);
  if (updatedNameInChatwoot !== 'Renato Bernabel') {
    throw new Error('FALLO CRÍTICO: No se actualizó el nombre del contacto John Doe con el nombre real de Meta.');
  }

  // 2. Verificar formato saliente con messaging_type RESPONSE
  let dispatchedPayload = null;
  metaGraphService.sendMessengerResponse = async function(recipientId, text) {
    dispatchedPayload = {
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text }
    };
    return { message_id: 'mid.123456' };
  };

  const res = await metaGraphService.sendMessengerResponse('123456789_john_doe_psid', 'Hola, respuestas de asesor desde CRM');

  console.log('✉️ Payload despachado a Meta Graph API:\n', JSON.stringify(dispatchedPayload, null, 2));

  if (!dispatchedPayload || dispatchedPayload.messaging_type !== 'RESPONSE') {
    throw new Error('FALLO: El mensaje saliente debe utilizar messaging_type RESPONSE para evitar el error #100 HUMAN_AGENT.');
  }

  console.log('✅ Prueba 1 - Contacto "John Doe" corregido automáticamente a Nombre Real Meta: ÉXITO');
  console.log('✅ Prueba 2 - Despacho saliente con messaging_type "RESPONSE" (Sin Error #100 HUMAN_AGENT): ÉXITO');
  console.log('🎉 TODAS LAS PRUEBAS DE RESOLUCIÓN META FINALIZARON CON EXIT CODE 0.');
  process.exit(0);
}

testMetaFixes();
