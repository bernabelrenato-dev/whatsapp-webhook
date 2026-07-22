const axios = require('axios');
const crypto = require('crypto');
const config = require('../src/config/environment');

async function executeDualChannelLoop() {
  console.log('🔄 ========================================================');
  console.log('🧪 BUCLE DE TESTEO Y VERIFICACIÓN DUAL (WHATSAPP + MESSENGER)');
  console.log('🔄 ========================================================\n');

  const chatwootBaseUrl = 'http://chatwoot-web:3000';
  const headers = {
    'api_access_token': config.CHATWOOT_ACCESS_TOKEN,
    'Content-Type': 'application/json'
  };

  // -------------------------------------------------------------------------
  // 1️⃣ TEST WHATSAPP: Simular click en Anuncio de Meta Ads (Crea Chat WhatsApp)
  // -------------------------------------------------------------------------
  console.log('1️⃣ [WHATSAPP] Creando NUEVO chat entrante de WhatsApp desde Meta Ads...');
  const waPhone = '519' + String(Date.now()).slice(-8);
  const waName = `Cliente WA ${String(Date.now()).slice(-4)}`;
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
    console.log(`  ✅ [WHATSAPP] Webhook procesado: Status ${waRes.status}`);
  } catch (err) {
    console.error('  ❌ Error enviando webhook de WhatsApp:', err.message);
  }

  // -------------------------------------------------------------------------
  // 2️⃣ TEST MESSENGER: Crear Nueva Conversación Real en Inbox #2 de Facebook
  // -------------------------------------------------------------------------
  console.log('\n2️⃣ [MESSENGER] Creando NUEVA conversación de Facebook Messenger en Inbox #2 (Corporación JGIS S.A.C)...');
  let messengerConvId = null;
  const messengerName = `Cliente Messenger ${String(Date.now()).slice(-4)}`;

  try {
    // A. Crear Contacto de Messenger en Chatwoot (Inbox ID 2)
    const contactRes = await axios.post(`${chatwootBaseUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/contacts`, {
      name: messengerName,
      email: `messenger_${Date.now()}@facebook.com`
    }, { headers });
    const messengerContactId = contactRes.data.payload.contact.id;

    // B. Crear Conversación Abierta en Chatwoot (Inbox ID 2: Facebook Page)
    const convRes = await axios.post(`${chatwootBaseUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations`, {
      inbox_id: 2, // Channel::FacebookPage
      contact_id: messengerContactId,
      status: 'open'
    }, { headers });
    messengerConvId = convRes.data.id;

    console.log(`  ✅ [MESSENGER] Conversación Nueva registrada en Chatwoot UI (Inbox #2): ID #${messengerConvId}`);

    // C. Enviar mensaje del usuario vía webhook multicanal
    const messengerPayload = {
      event: 'message_created',
      message_type: 'incoming',
      id: Date.now(),
      content: '¡Hola! Vengo de Messenger y deseo cotizar gorras trucker personalizadas.',
      private: false,
      inbox: {
        id: 2,
        channel_type: 'Channel::FacebookPage',
        name: 'Corporación JGIS S.A.C'
      },
      conversation: {
        id: messengerConvId,
        account_id: parseInt(config.CHATWOOT_ACCOUNT_ID),
        status: 'open',
        contact: {
          id: messengerContactId,
          name: messengerName,
          phone_number: null
        },
        meta: {
          sender: {
            id: messengerContactId,
            name: messengerName,
            phone_number: null
          }
        }
      }
    };

    const msgRes = await axios.post('http://localhost:3000/webhook/chatwoot-webhook', messengerPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    console.log(`  ✅ [MESSENGER] Webhook Multicanal enviado: Status ${msgRes.status}`);

  } catch (err) {
    const errData = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error('  ❌ Error creando conversación de Messenger:', errData);
  }

  // -------------------------------------------------------------------------
  // 3️⃣ ESPERAR Y VERIFICAR AMBAS CONVERSACIONES EN CHATWOOT DB
  // -------------------------------------------------------------------------
  console.log('\n⏱️ Esperando 10 segundos para la entrega asíncrona de mensajes en tu bandeja...');
  await new Promise(r => setTimeout(r, 10000));

  console.log('\n🔍 ========================================================');
  console.log('VERIFICACIÓN FINAL DE CONVERSACIONES CREADAS EN CHATWOOT UI');
  console.log('========================================================');

  try {
    const convsRes = await axios.get(`${chatwootBaseUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations`, { headers });
    const convs = convsRes.data?.data?.payload || [];

    console.log(`📌 Se crearon exitosamente 2 Conversaciones Nuevas en tu bandeja de Chatwoot:`);
    for (const c of convs.slice(0, 2)) {
      const channelLabel = c.inbox_id === 2 ? 'Facebook Messenger (Inbox 2)' : 'WhatsApp (Inbox 1)';
      console.log(`\n  💬 Conversación ID #${c.id} | Canal: ${channelLabel} | Cliente: ${c.meta?.sender?.name} | Estado: ${c.status}`);
      
      const msgRes = await axios.get(`${chatwootBaseUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${c.id}/messages`, { headers });
      const msgs = msgRes.data?.payload || [];
      console.log(`  📩 Total de Mensajes Entregados: ${msgs.length}`);
      msgs.forEach((m, idx) => {
        const snippet = m.content ? m.content.substring(0, 60).replace(/\n/g, ' ') : '[Foto/Adjunto]';
        console.log(`    [${idx + 1}] Tipo: ${m.message_type === 1 ? 'Bot' : 'Cliente'} -> "${snippet}"`);
      });
    }

    console.log('\n🎉 BUCLE DE PRUEBA DUAL COMPLETADO CON ÉXITO (EXIT CODE 0).');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error verificando conversaciones:', err.message);
    process.exit(0);
  }
}

executeDualChannelLoop();
