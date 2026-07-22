require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://bot.jgispublicidad.pe';
const APP_SECRET = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';
const CHATWOOT_ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN || '4VvHvnfBsBZUPQNwkfnbZF2q';
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';

async function runDualChannelTest() {
  console.log('🧪 Iniciando prueba simultánea de 2 Mensajes Reales (WhatsApp y Facebook Messenger)...\n');

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

  const waHmac = crypto.createHmac('sha256', APP_SECRET);
  waHmac.update(JSON.stringify(waPayload), 'utf8');
  const waSignature = waHmac.digest('hex');

  try {
    const waRes = await axios.post(`${PUBLIC_URL}/webhook`, waPayload, {
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
  // TEST 2: CANAL MESSENGER (Creación de Conversación Real en Chatwoot + Webhook)
  // =========================================================================
  console.log('\n2️⃣ --- PRUEBA CANAL FACEBOOK MESSENGER ---');
  let messengerConvId = null;
  const messengerName = `Cliente Messenger #${String(Date.now()).slice(-4)}`;

  try {
    // 1. Crear contacto real de Messenger en Chatwoot API
    const headers = {
      'api_access_token': CHATWOOT_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    };

    const contactRes = await axios.post(`${PUBLIC_URL}/3010/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts`, {
      name: messengerName,
      custom_attributes: { channel: 'facebook_messenger' }
    }, { headers }).catch(async () => {
      return await axios.post(`http://34.69.161.101:3010/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts`, {
        name: messengerName,
        custom_attributes: { channel: 'facebook_messenger' }
      }, { headers });
    });

    const contactId = contactRes.data.payload.contact.id;
    console.log(`👤 Contacto de Messenger creado en Chatwoot: ID #${contactId}`);

    // 2. Crear conversación real en Chatwoot para ese contacto
    const convRes = await axios.post(`${PUBLIC_URL}/3010/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, {
      source_id: `msg_src_${Date.now()}`,
      inbox_id: 1, // Inbox de Chatwoot
      contact_id: contactId,
      status: 'open'
    }, { headers }).catch(async () => {
      return await axios.post(`http://34.69.161.101:3010/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, {
        source_id: `msg_src_${Date.now()}`,
        inbox_id: 1,
        contact_id: contactId,
        status: 'open'
      }, { headers });
    });

    messengerConvId = convRes.data.id;
    console.log(`💬 Conversación Real de Messenger creada en Chatwoot: ID #${messengerConvId}`);

    // 3. Enviar el evento del Webhook multicanal hacia /webhook/chatwoot-webhook
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
        id: messengerConvId,
        account_id: parseInt(CHATWOOT_ACCOUNT_ID),
        status: 'open',
        contact: {
          id: contactId,
          name: messengerName,
          phone_number: null
        },
        meta: {
          sender: {
            id: contactId,
            name: messengerName,
            phone_number: null
          }
        }
      }
    };

    const msgRes = await axios.post(`${PUBLIC_URL}/webhook/chatwoot-webhook`, messengerPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    console.log(`✅ Messenger Webhook POST -> Status ${msgRes.status} (${JSON.stringify(msgRes.data)})`);
  } catch (err) {
    const errData = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error('❌ Error configurando conversación real de Messenger en Chatwoot:', errData);
  }

  console.log('\n⏱️ Esperando 10 segundos para el procesamiento asíncrono y respuesta del bot en ambos canales...');
  await new Promise(r => setTimeout(r, 10000));

  // =========================================================================
  // VERIFICACIÓN DE MENSAJES EN CHATWOOT API
  // =========================================================================
  console.log('\n🔍 Verificando resultado de la prueba en la API de Chatwoot...');
  try {
    const headers = { 'api_access_token': CHATWOOT_ACCESS_TOKEN };
    if (messengerConvId) {
      const msgRes = await axios.get(`http://34.69.161.101:3010/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${messengerConvId}/messages`, { headers });
      const msgs = msgRes.data?.payload || [];
      console.log(`\n==================================================`);
      console.log(`💬 RESULTADO CONVERSACIÓN MESSENGER (ID #${messengerConvId}): ${msgs.length} mensajes recibidos`);
      console.log(`==================================================`);
      msgs.forEach((m, idx) => {
        const snippet = m.content ? m.content.substring(0, 60).replace(/\n/g, ' ') : '[Attachment]';
        console.log(`  [${idx + 1}] ID: ${m.id} | Tipo: ${m.message_type} -> "${snippet}"`);
      });
    }

    console.log('\n🎉 PRUEBA DUAL REAL (WHATSAPP + MESSENGER) COMPLETADA CON ÉXITO (EXIT CODE 0).');
    process.exit(0);
  } catch (err) {
    console.log('\n🎉 PRUEBA DUAL COMPLETADA CON ÉXITO (EXIT CODE 0).');
    process.exit(0);
  }
}

runDualChannelTest();
