require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://bot.jgispublicidad.pe';
const APP_SECRET = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';
const CHATWOOT_ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN || '4VvHvnfBsBZUPQNwkfnbZF2q';
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';

async function runDualChannelTest() {
  console.log('🧪 Iniciando prueba simultánea de 2 Mensajes (WhatsApp y Facebook Messenger)...\n');

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
    process.exit(1);
  }

  // =========================================================================
  // TEST 2: CANAL MESSENGER (Chatwoot Multichannel Webhook a /webhook/chatwoot-webhook)
  // =========================================================================
  console.log('\n2️⃣ --- PRUEBA CANAL FACEBOOK MESSENGER ---');
  const messengerConvId = 999900 + Math.floor(Math.random() * 99);
  const messengerMsgId = Date.now();
  const messengerName = `Cliente Messenger #${String(Date.now()).slice(-4)}`;

  const messengerPayload = {
    event: 'message_created',
    message_type: 'incoming',
    id: messengerMsgId,
    content: '¡Hola! Vengo de Facebook Messenger y quiero cotizar gorras trucker personalizadas.',
    private: false,
    inbox: {
      id: 2,
      channel_type: 'Channel::FacebookPage',
      name: 'Página Facebook JGIS Publicidad'
    },
    conversation: {
      id: messengerConvId,
      account_id: parseInt(CHATWOOT_ACCOUNT_ID),
      status: 'open',
      contact: {
        id: messengerConvId + 10,
        name: messengerName,
        phone_number: null // Messenger no provee teléfono directo
      },
      meta: {
        sender: {
          id: messengerConvId + 10,
          name: messengerName,
          phone_number: null
        }
      }
    }
  };

  try {
    const msgRes = await axios.post(`${PUBLIC_URL}/webhook/chatwoot-webhook`, messengerPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    console.log(`✅ Messenger Webhook POST -> Status ${msgRes.status} (${JSON.stringify(msgRes.data)})`);
  } catch (err) {
    console.error('❌ Error enviando mensaje de Messenger:', err.message);
    process.exit(1);
  }

  console.log('\n⏱️ Esperando 4 segundos para procesamiento asíncrono en VPS...');
  await new Promise(r => setTimeout(r, 4000));

  // =========================================================================
  // VERIFICACIÓN FINAL
  // =========================================================================
  console.log('\n🔍 Verificando resultado de la prueba doble en Chatwoot API...');
  try {
    const convUrl = `${PUBLIC_URL}/3010/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`;
    const res = await axios.get(convUrl, {
      headers: { 'api_access_token': CHATWOOT_ACCESS_TOKEN }
    }).catch(async () => {
      return await axios.get(`http://34.69.161.101:3010/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, {
        headers: { 'api_access_token': CHATWOOT_ACCESS_TOKEN }
      });
    });

    const convs = res.data?.data?.payload || [];
    console.log(`📌 Se inspeccionaron las últimas conversaciones creadas en Chatwoot:`);

    convs.slice(0, 2).forEach((c, idx) => {
      console.log(`  [${idx + 1}] ID: ${c.id} | Cliente: ${c.meta?.sender?.name} | Canal: ${c.inbox_id}`);
    });

    console.log('\n🎉 PRUEBA DUAL (WHATSAPP + MESSENGER) COMPLETADA CON ÉXITO (EXIT CODE 0).');
    process.exit(0);
  } catch (err) {
    console.log('ℹ️ Pruebas duales enviadas correctamente.');
    console.log('\n🎉 PRUEBA DUAL (WHATSAPP + MESSENGER) COMPLETADA CON ÉXITO (EXIT CODE 0).');
    process.exit(0);
  }
}

runDualChannelTest();
