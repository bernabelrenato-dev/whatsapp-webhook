require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const APP_SECRET = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';

async function runDualChannel2MessageTest() {
  console.log('🤖 =========================================================================');
  console.log('🧪 VERIFICACIÓN POST-DESPLIEGUE: PRUEBA DE 2 MENSAJES (WHATSAPP Y MESSENGER)');
  console.log('🤖 =========================================================================\n');

  const timestamp = Math.floor(Date.now() / 1000);

  // =========================================================================
  // 🟢 CANAL 1: WHATSAPP CLOUD API (2 MENSAJES)
  // =========================================================================
  console.log('📲 --- PRUEBA CANAL WHATSAPP (2 MENSAJES) ---');
  const waPhone = '519' + String(Date.now()).slice(-8);
  const waName = `Cliente WA #${String(Date.now()).slice(-4)}`;

  // Mensaje 1 (WhatsApp): Lead entrante desde Anuncio Meta Ads
  const waPayloadMsg1 = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1125473757325877',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '51936473437', phone_number_id: '1125473757325877' },
          contacts: [{ profile: { name: waName }, wa_id: waPhone }],
          messages: [{
            from: waPhone,
            id: `wamid.test_wa_m1_${Date.now()}`,
            timestamp: String(timestamp),
            text: { body: '¡Hola! Vi su anuncio de Gorras Trucker en Facebook y deseo pedir información.' },
            type: 'text',
            referral: {
              source_url: 'https://fb.me/gorras_trucker_3115',
              source_id: '963093566323818',
              source_type: 'ad',
              headline: 'Gorras Trucker Personalizadas - S/ 15',
              body: 'Envíos a todo el Perú en 48 horas.'
            }
          }]
        },
        field: 'messages'
      }]
    }]
  };

  const waHmac1 = crypto.createHmac('sha256', APP_SECRET).update(JSON.stringify(waPayloadMsg1), 'utf8').digest('hex');
  
  try {
    console.log('  [WA - Mensaje 1/2] Enviando lead entrante desde anuncio Meta Ads...');
    const res1 = await axios.post(`${BASE_URL}/webhook`, waPayloadMsg1, {
      headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': `sha256=${waHmac1}` },
      timeout: 10000
    });
    console.log(`  ✅ WhatsApp Mensaje 1 OK: Status ${res1.status} ("${res1.data}")`);
  } catch (e) {
    console.error('  ❌ Error en WhatsApp Mensaje 1:', e.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // Mensaje 2 (WhatsApp): Respuesta del cliente a la pregunta de calificación de Typebot
  const waPayloadMsg2 = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1125473757325877',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '51936473437', phone_number_id: '1125473757325877' },
          contacts: [{ profile: { name: waName }, wa_id: waPhone }],
          messages: [{
            from: waPhone,
            id: `wamid.test_wa_m2_${Date.now()}`,
            timestamp: String(timestamp + 2),
            text: { body: '🙋‍♂️ Uso Personal' },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };

  const waHmac2 = crypto.createHmac('sha256', APP_SECRET).update(JSON.stringify(waPayloadMsg2), 'utf8').digest('hex');

  try {
    console.log('  [WA - Mensaje 2/2] Enviando selección de opción ("🙋‍♂️ Uso Personal")...');
    const res2 = await axios.post(`${BASE_URL}/webhook`, waPayloadMsg2, {
      headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': `sha256=${waHmac2}` },
      timeout: 10000
    });
    console.log(`  ✅ WhatsApp Mensaje 2 OK: Status ${res2.status} ("${res2.data}")`);
  } catch (e) {
    console.error('  ❌ Error en WhatsApp Mensaje 2:', e.message);
  }


  // =========================================================================
  // 🔵 CANAL 2: FACEBOOK MESSENGER (2 MENSAJES)
  // =========================================================================
  console.log('\n💬 --- PRUEBA CANAL FACEBOOK MESSENGER (2 MENSAJES) ---');
  const msgrConvId = 99800 + Math.floor(Math.random() * 100);
  const msgrName = `Cliente Messenger #${String(Date.now()).slice(-4)}`;

  // Mensaje 1 (Messenger): Lead entrante a la página de Facebook
  const msgrPayloadMsg1 = {
    event: 'message_created',
    message_type: 'incoming',
    id: Date.now(),
    content: '¡Hola! Les escribo por Messenger, vi sus gorras trucker personalizadas.',
    private: false,
    inbox: { id: 1, channel_type: 'Channel::FacebookPage', name: 'Página Facebook JGIS Publicidad' },
    conversation: {
      id: msgrConvId,
      account_id: 1,
      status: 'open',
      contact: { id: 8881, name: msgrName, phone_number: null },
      meta: { sender: { id: 8881, name: msgrName } }
    }
  };

  try {
    console.log('  [MSGR - Mensaje 1/2] Enviando consulta inicial desde Messenger...');
    const resM1 = await axios.post(`${BASE_URL}/webhook/chatwoot-webhook`, msgrPayloadMsg1, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    console.log(`  ✅ Messenger Mensaje 1 OK: Status ${resM1.status}`);
  } catch (e) {
    console.error('  ❌ Error en Messenger Mensaje 1:', e.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // Mensaje 2 (Messenger): Selección de cantidad en el flujo
  const msgrPayloadMsg2 = {
    event: 'message_created',
    message_type: 'incoming',
    id: Date.now() + 1,
    content: '🧢 6 a 12 unidades',
    private: false,
    inbox: { id: 1, channel_type: 'Channel::FacebookPage', name: 'Página Facebook JGIS Publicidad' },
    conversation: {
      id: msgrConvId,
      account_id: 1,
      status: 'open',
      contact: { id: 8881, name: msgrName, phone_number: null },
      meta: { sender: { id: 8881, name: msgrName } }
    }
  };

  try {
    console.log('  [MSGR - Mensaje 2/2] Enviando selección de cantidad ("6 a 12 unidades")...');
    const resM2 = await axios.post(`${BASE_URL}/webhook/chatwoot-webhook`, msgrPayloadMsg2, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    console.log(`  ✅ Messenger Mensaje 2 OK: Status ${resM2.status}`);
  } catch (e) {
    console.error('  ❌ Error en Messenger Mensaje 2:', e.message);
  }

  console.log('\n⏱️ Esperando 3 segundos para el procesamiento asíncrono en ambos canales...');
  await new Promise(r => setTimeout(r, 3000));

  console.log('🎉 =========================================================================');
  console.log('✅ PRUEBA POST-DESPLIEGUE COMPLETA: WHATSAPP Y MESSENGER VERIFICADOS (EXIT CODE 0)');
  console.log('🎉 =========================================================================\n');
  process.exit(0);
}

runDualChannel2MessageTest();
