const axios = require('axios');
const crypto = require('crypto');

async function testIncomingImage() {
  const webhookUrl = process.env.WEBHOOK_URL || 'https://bot.jgispublicidad.pe/webhook';
  const appSecret = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';

  const imagePayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '100654321',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '51969732451', phone_number_id: '100123' },
              contacts: [{ profile: { name: 'Aldo MC Test' }, wa_id: '51999888777' }],
              messages: [
                {
                  from: '51999888777',
                  id: `wamid.test_img_${Date.now()}`,
                  timestamp: `${Math.floor(Date.now()/1000)}`,
                  type: 'image',
                  image: {
                    id: '1234567890',
                    mime_type: 'image/jpeg',
                    sha256: 'd3b07384d113edec49eaa6238ad5ff00',
                    caption: 'Esta'
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const jsonBody = JSON.stringify(imagePayload);
  const signature = crypto.createHmac('sha256', appSecret).update(jsonBody, 'utf8').digest('hex');

  console.log('📷 Simulando envío de imagen de WhatsApp a la API de producción en VPS...');
  try {
    const res = await axios.post(webhookUrl, imagePayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': `sha256=${signature}`
      }
    });
    console.log(`✅ Respuesta de la API en producción: Status ${res.status}`, res.data);
  } catch (err) {
    console.error('❌ Error enviando payload de imagen:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

testIncomingImage();
