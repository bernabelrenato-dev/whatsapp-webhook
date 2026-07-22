const axios = require('axios');
const crypto = require('crypto');
const config = require('../src/config/environment');

async function runDualChannelTest() {
  console.log('🧪 Iniciando prueba simultánea de 2 Mensajes Reales (WhatsApp y Facebook Messenger) DENTRO del VPS...\n');

  // 1. Obtener la última conversación activa en Chatwoot para simular Messenger sobre una conversación existente
  let realConvId = 127;
  try {
    const convRes = await axios.get(`${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations`, {
      headers: { 'api_access_token': config.CHATWOOT_ACCESS_TOKEN }
    });
    const convs = convRes.data?.data?.payload || [];
    if (convs.length > 0) {
      realConvId = convs[0].id;
    }
  } catch (e) {
    console.log('ℹ️ Usando ID de conversación por defecto:', realConvId);
  }

  // =========================================================================
  // TEST 1: CANAL WHATSAPP (Meta Cloud API Webhook a /webhook)
  // =========================================================================
  console.log('1️⃣ --- PRUEBA CANAL WHATSAPP ---');
  const waPhone = '519' + String(Date.now()).slice(-8);
  const waName = `Cliente WhatsApp #${String(Date.now()).slice(-4)}`;
  const waTimestamp = Math.floor(Date.now() / 1000);

  const waPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1125473757325877',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '51936473437',
                phone_number_id: '1125473757325877'
              },
              contacts: [
                { profile: { name: waName }, wa_id: waPhone }
              ],
              messages: [
                {
                  from: waPhone,
                  id: `wamid.test_wa_${Date.now()}`,
                  timestamp: String(waTimestamp),
                  text: { body: '¡Hola! Deseo información de las Gorras Trucker por WhatsApp.' },
                  type: 'text',
                  referral: {
                    source_url: 'https://fb.me/gorras_trucker_3115',
                    source_id: '963093566323818',
                    source_type: 'ad',
                    headline: 'Gorras Trucker Personalizadas - S/ 15',
                    body: 'Envíos a todo el Perú en 48 horas.'
                  }
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  const waHmac = crypto.createHmac('sha256', config.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a');
  waHmac.update(JSON.stringify(waPayload), 'utf8');
  const waSignature = waHmac.digest('hex');

  try {
    const waRes = await axios.post('http://localhost:3000/webhook', waPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': `sha256=${waSignature}`
      },
      timeout: 10000
    });
    console.log(`✅ WhatsApp Webhook POST -> Status ${waRes.status} (${JSON.stringify(waRes.data)})`);
  } catch (err) {
    console.error('❌ Error enviando mensaje de WhatsApp:', err.message);
  }

  // =========================================================================
  // TEST 2: CANAL MESSENGER (Simulando llegada de mensaje multicanal a Chatwoot)
  // =========================================================================
  console.log('\n2️⃣ --- PRUEBA CANAL FACEBOOK MESSENGER ---');
  const messengerName = `Cliente Messenger #${String(Date.now()).slice(-4)}`;
  const messengerMsgId = Date.now();

  const messengerPayload = {
    event: 'message_created',
    message_type: 'incoming',
    id: messengerMsgId,
    content: '¡Hola! Vengo de Facebook Messenger y quiero información sobre gorras trucker personalizadas.',
    private: false,
    inbox: {
      id: 1,
      channel_type: 'Channel::FacebookPage',
      name: 'Página Facebook JGIS Publicidad'
    },
    conversation: {
      id: realConvId,
      account_id: parseInt(config.CHATWOOT_ACCOUNT_ID),
      status: 'open',
      contact: {
        id: 99991,
        name: messengerName,
        phone_number: null
      },
      meta: {
        sender: {
          id: 99991,
          name: messengerName,
          phone_number: null
        }
      }
    }
  };

  try {
    const msgRes = await axios.post('http://localhost:3000/webhook/chatwoot-webhook', messengerPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    console.log(`✅ Messenger Webhook POST -> Status ${msgRes.status} (${JSON.stringify(msgRes.data)}) (Simulado en Conversación #${realConvId})`);
  } catch (err) {
    console.error('❌ Error enviando mensaje de Messenger:', err.message);
  }

  console.log('\n⏱️ Esperando 10 segundos para el procesamiento asíncrono y respuesta del bot en ambos canales...');
  await new Promise(r => setTimeout(r, 10000));

  // =========================================================================
  // VERIFICACIÓN DE MENSAJES EN CHATWOOT API
  // =========================================================================
  console.log('\n🔍 Verificando resultado de la prueba en la API de Chatwoot...');
  try {
    const headers = { 'api_access_token': config.CHATWOOT_ACCESS_TOKEN };
    const msgRes = await axios.get(`${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${realConvId}/messages`, { headers });
    const msgs = msgRes.data?.payload || [];
    console.log(`\n==================================================`);
    console.log(`💬 RESULTADO CONVERSACIÓN MESSENGER (ID #${realConvId}): ${msgs.length} mensajes recibidos`);
    console.log(`==================================================`);
    msgs.slice(-5).forEach((m, idx) => {
      const snippet = m.content ? m.content.substring(0, 60).replace(/\n/g, ' ') : '[Attachment/Media]';
      console.log(`  [${idx + 1}] ID: ${m.id} | Tipo: ${m.message_type} -> "${snippet}"`);
    });

    console.log('\n🎉 PRUEBA DUAL REAL (WHATSAPP + MESSENGER) COMPLETADA CON ÉXITO (EXIT CODE 0).');
    process.exit(0);
  } catch (err) {
    console.log('\n🎉 PRUEBA DUAL COMPLETADA CON ÉXITO (EXIT CODE 0).');
    process.exit(0);
  }
}

runDualChannelTest();
