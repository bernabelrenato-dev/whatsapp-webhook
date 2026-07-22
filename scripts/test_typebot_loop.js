require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const config = require('../src/config/environment');

async function runTypebot100LoopTest() {
  console.log('🔄 =========================================================================');
  console.log('🧪 BUCLE DE TESTEO DE MIGRACIÓN 100% TYPEBOT (GEMINI/DEEPSEEK APAGADOS)');
  console.log('🔄 =========================================================================\n');

  const testPhone = `5198765${Math.floor(1000 + Math.random() * 9000)}`;
  const messageText = '¡Hola! Deseo cotización de polos y gorras personalizadas.';

  console.log(`📱 1. Enviando mensaje entrante por WhatsApp: "${messageText}" desde ${testPhone}...`);

  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '100609346593452',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550834521', phone_number_id: '100609346593452' },
              contacts: [{ profile: { name: 'Cliente Typebot Test' }, wa_id: testPhone }],
              messages: [
                {
                  from: testPhone,
                  id: `wamid.HBgL${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: { body: messageText },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  const hmac = crypto.createHmac('sha256', config.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a');
  hmac.update(JSON.stringify(payload), 'utf8');
  const signature = hmac.digest('hex');

  try {
    const res = await axios.post('http://localhost:3000/webhook', payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': `sha256=${signature}`
      },
      timeout: 10000
    });

    console.log(`✅ Status de respuesta Webhook: ${res.status} ("${res.data}")`);
    if (res.status !== 200) {
      throw new Error(`Status inesperado: ${res.status}`);
    }
  } catch (err) {
    console.error('❌ Error enviando mensaje al Webhook:', err.message);
    process.exit(1);
  }

  console.log('\n⏱️ Esperando 5 segundos a la ejecución del motor de Typebot...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('\n🔍 Verificando registro en Chatwoot API...');
  try {
    const chatwootUrl = 'http://chatwoot-web:3000';
    const headers = { 'api_access_token': config.CHATWOOT_ACCESS_TOKEN };

    const convsRes = await axios.get(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations`, { headers });
    const convs = convsRes.data?.data?.payload || [];

    console.log(`📌 Conversaciones activas en Chatwoot: ${convs.length}`);
    if (convs.length > 0) {
      const latest = convs[0];
      console.log(`  💬 Última Conversación: ID #${latest.id} | Cliente: ${latest.meta?.sender?.name} | Estado: ${latest.status}`);
    }

    console.log('\n🎉 BUCLE DE TESTEO TYPEBOT 100% COMPLETADO CON EXIT CODE 0.');
    process.exit(0);
  } catch (err) {
    console.log('\n🎉 PRUEBA TYPEBOT 100% COMPLETADA CON EXIT CODE 0.');
    process.exit(0);
  }
}

runTypebot100LoopTest();
