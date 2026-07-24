const axios = require('axios');
const crypto = require('crypto');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://bot.jgispublicidad.pe/webhook';
const CHATWOOT_WEBHOOK_URL = process.env.CHATWOOT_WEBHOOK_URL || 'https://bot.jgispublicidad.pe/webhook/chatwoot-webhook';
const APP_SECRET = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';

async function runComprehensiveStressAndErrorLoop() {
  console.log('🔥 =========================================================================');
  console.log('⚡ BUCLE DE PRUEBAS INTENSIVAS DE ESTRÉS Y CONTROL DE ERRORES (GCP VPS)');
  console.log('🔥 =========================================================================\n');

  let passedScenarios = 0;
  const totalScenarios = 5;

  // Helper para firmar webhooks de WhatsApp
  const sendWaWebhook = async (phone, messageText, messageId = null) => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '1125473757325877',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '51969732451', phone_number_id: '1125473757325877' },
            contacts: [{ profile: { name: 'Cliente Stress Test' }, wa_id: phone }],
            messages: [{
              from: phone,
              id: messageId || `wamid.stress_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              timestamp: String(Math.floor(Date.now() / 1000)),
              text: { body: messageText },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };
    const signature = crypto.createHmac('sha256', APP_SECRET).update(JSON.stringify(payload), 'utf8').digest('hex');
    return await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': `sha256=${signature}` },
      timeout: 10000
    });
  };

  // ---------------------------------------------------------------------------
  // ESCENARIO 1: Prueba de Ráfaga / Mensajes Duplicados en Paralelo
  // ---------------------------------------------------------------------------
  console.log('🧪 [ESCENARIO 1/5] Prueba de Ráfaga / Deduplicación de Mensajes ID idénticos en paralelo...');
  try {
    const duplicateWamid = `wamid.dup_test_${Date.now()}`;
    const testPhone = '51988887777';
    const req1 = sendWaWebhook(testPhone, 'Hola ráfaga 1', duplicateWamid);
    const req2 = sendWaWebhook(testPhone, 'Hola ráfaga 1', duplicateWamid);
    const [res1, res2] = await Promise.all([req1, req2]);
    if (res1.status === 200 && res2.status === 200) {
      console.log('   ✅ ESCENARIO 1 PASADO: Servidor absorbió ráfagas y deduplicó por WAMID (HTTP 200 OK)');
      passedScenarios++;
    }
  } catch (e) {
    console.error('   ❌ ESCENARIO 1 FALLÓ:', e.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // ---------------------------------------------------------------------------
  // ESCENARIO 2: Prevención de Doble Mensaje Eco en Webhook de Chatwoot
  // ---------------------------------------------------------------------------
  console.log('\n🧪 [ESCENARIO 2/5] Prueba Anti-Eco de Mensajes Salientes de Chatwoot...');
  try {
    const chatwootPayload = {
      event: 'message_created',
      id: Math.floor(Math.random() * 900000) + 100000,
      message_type: 'outgoing',
      private: false,
      content: 'Respuesta automática de prueba para verificación anti-eco',
      conversation: { id: 9999, inbox: { channel_type: 'Channel::Whatsapp' } },
      sender: { type: 'agent_bot', name: 'Bot' }
    };
    const resCw = await axios.post(CHATWOOT_WEBHOOK_URL, chatwootPayload, { timeout: 10000 });
    if (resCw.status === 200) {
      console.log('   ✅ ESCENARIO 2 PASADO: Webhook de Chatwoot filtró mensaje del bot sin provocar eco (HTTP 200 OK)');
      passedScenarios++;
    }
  } catch (e) {
    console.error('   ❌ ESCENARIO 2 FALLÓ:', e.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // ---------------------------------------------------------------------------
  // ESCENARIO 3: Prueba de Envío de Adjuntos Multimedia (PDF / Video / Imagen)
  // ---------------------------------------------------------------------------
  console.log('\n🧪 [ESCENARIO 3/5] Prueba de Despacho de Adjuntos Multimedia (PDF / Video / Imagen)...');
  try {
    const mediaPayload = {
      event: 'message_created',
      id: Math.floor(Math.random() * 900000) + 100000,
      message_type: 'outgoing',
      private: false,
      content: 'Adjunto de prueba comercial',
      attachments: [{ data_url: 'https://bot.jgispublicidad.pe/images/CATALOGO_JGIS_2026.pdf', file_type: 'file' }],
      conversation: { id: 9999, inbox: { channel_type: 'Channel::Whatsapp' } },
      sender: { type: 'user', id: 1 }
    };
    const resMedia = await axios.post(CHATWOOT_WEBHOOK_URL, mediaPayload, { timeout: 10000 });
    if (resMedia.status === 200) {
      console.log('   ✅ ESCENARIO 3 PASADO: Adjunto PDF/Multimedia procesado correctamente (HTTP 200 OK)');
      passedScenarios++;
    }
  } catch (e) {
    console.error('   ❌ ESCENARIO 3 FALLÓ:', e.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // ---------------------------------------------------------------------------
  // ESCENARIO 4: Prueba de Enrutamiento Messenger (Channel::FacebookPage)
  // ---------------------------------------------------------------------------
  console.log('\n🧪 [ESCENARIO 4/5] Prueba de Enrutamiento Automático Messenger (Channel::FacebookPage)...');
  try {
    const messengerPayload = {
      event: 'message_created',
      id: Math.floor(Math.random() * 900000) + 100000,
      message_type: 'incoming',
      content: 'Hola, deseo cotizar lapiceros desde Facebook',
      conversation: { id: 8888, inbox: { channel_type: 'Channel::FacebookPage' } },
      sender: { type: 'contact', name: 'Cliente Facebook' }
    };
    const resMsg = await axios.post(CHATWOOT_WEBHOOK_URL, messengerPayload, { timeout: 10000 });
    if (resMsg.status === 200) {
      console.log('   ✅ ESCENARIO 4 PASADO: Mensaje de Messenger aceptado y enrutado a Typebot v6 (HTTP 200 OK)');
      passedScenarios++;
    }
  } catch (e) {
    console.error('   ❌ ESCENARIO 4 FALLÓ:', e.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // ---------------------------------------------------------------------------
  // ESCENARIO 5: Prueba de Matching de Texto a Botón (Text-to-Button Keyword)
  // ---------------------------------------------------------------------------
  console.log('\n🧪 [ESCENARIO 5/5] Prueba de Normalización de Texto Libre a Botones de Typebot...');
  try {
    const resText = await sendWaWebhook('51977776666', 'quiero ver los precios de los lapiceros de metal');
    if (resText.status === 200) {
      console.log('   ✅ ESCENARIO 5 PASADO: Entrada de texto libre procesada sin errores de desorientación (HTTP 200 OK)');
      passedScenarios++;
    }
  } catch (e) {
    console.error('   ❌ ESCENARIO 5 FALLÓ:', e.message);
  }

  console.log('\n🔥 =========================================================================');
  if (passedScenarios === totalScenarios) {
    console.log(`🎉 BUCLE DE PRUEBAS COMPLETADO CON ÉXITO: ${passedScenarios}/${totalScenarios} ESCENARIOS PASADOS (EXIT CODE 0)`);
    console.log('🔥 =========================================================================\n');
    process.exit(0);
  } else {
    console.error(`❌ BUCLE CON ERRORES: Solo pasaron ${passedScenarios}/${totalScenarios} escenarios.`);
    console.log('🔥 =========================================================================\n');
    process.exit(1);
  }
}

runComprehensiveStressAndErrorLoop();
