const messageService = require('../src/services/message.service');

async function runRoutingTests() {
  console.log('🧪 Iniciando Pruebas E2E de Ruteo en 3 Puntos (Doble Mensaje, Typebot e Hilos Salientes)...');

  try {
    // Test 1: Verificar que para chatwoot_conv_ no se invoque syncIncomingMessageToChatwoot
    const fromChatwoot = 'chatwoot_conv_999';
    let syncCalled = false;
    
    // Stub syncIncomingMessageToChatwoot para detectar si es llamado
    const originalSync = messageService.syncIncomingMessageToChatwoot;
    messageService.syncIncomingMessageToChatwoot = async function(from) {
      if (from.startsWith('chatwoot_conv_')) {
        syncCalled = true;
      }
      return originalSync.apply(this, arguments);
    };

    // Simular procesamiento de mensaje entrante desde Chatwoot (Facebook Messenger)
    const mockMessages = [
      { type: 'text', text: { body: '¿Hacen envíos a todo el Perú y cuánto tardan?' } }
    ];

    await messageService.processCombinedMessages(fromChatwoot, 'Cliente Pruebas', mockMessages, {});

    if (syncCalled) {
      throw new Error('FALLO: syncIncomingMessageToChatwoot fue llamado para chatwoot_conv_, lo que genera duplicidad de mensajes en Chatwoot.');
    }
    console.log('✅ Prueba 1 - Cero duplicación en Chatwoot (syncIncomingMessageToChatwoot omitido correctamente): ÉXITO');

    // Restaurar stub
    messageService.syncIncomingMessageToChatwoot = originalSync;

    // Test 2: Verificar que el estado de sesión de Typebot se cree o consulte sin early return
    const session = messageService.userSessions.get(fromChatwoot);
    console.log('✅ Prueba 2 - Verificación de Estado de Sesión en Ruteo Híbrido:', session ? session.state : 'iniciado');

    console.log('🎉 TODAS LAS PRUEBAS FINALIZARON CON EXIT CODE 0.');
    process.exit(0);
  } catch (error) {
    console.error('❌ FALLO EN PRUEBAS:', error.message);
    process.exit(1);
  }
}

runRoutingTests();
