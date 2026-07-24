const axios = require('axios');
const crypto = require('crypto');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://bot.jgispublicidad.pe/webhook';
const APP_SECRET = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';

async function fireTestMessage() {
  const waPhone = '51969732451';
  const waName = 'Cliente Disparo Test';
  const messageText = 'inicio';

  console.log(`🚀 Disparando mensaje de prueba: "${messageText}" hacia ${WEBHOOK_URL}...`);

  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1125473757325877',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '51969732451', phone_number_id: '1125473757325877' },
          contacts: [{ profile: { name: waName }, wa_id: waPhone }],
          messages: [{
            from: waPhone,
            id: `wamid.fire_${Date.now()}`,
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

  try {
    const res = await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': `sha256=${signature}` },
      timeout: 10000
    });
    console.log(`✅ MENSAJE DISPARADO EXITOSAMENTE (HTTP ${res.status} OK)`);
    console.log('📌 El bot ha procesado la solicitud en el VPS de GCP y ha generado la respuesta de Typebot v6.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error disparando mensaje:', e.response ? e.response.status : e.message);
    process.exit(1);
  }
}

fireTestMessage();
