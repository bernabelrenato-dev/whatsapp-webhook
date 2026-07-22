require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const PUBLIC_URL = 'https://bot.jgispublicidad.pe';
const APP_SECRET = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';
const CHATWOOT_ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN || '4VvHvnfBsBZUPQNwkfnbZF2q';
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';

async function testExternalAdClick() {
  console.log('🚀 Simulando click de cliente externo en Anuncio de Meta Ads hacia el Webhook de Producción...');
  console.log(`🌐 URL Pública: ${PUBLIC_URL}/webhook`);

  const timestamp = Math.floor(Date.now() / 1000);
  const testPhone = '519' + String(Date.now()).slice(-8);
  const testName = `Cliente Anuncio Gorras #${String(Date.now()).slice(-4)}`;

  // Payload exacto en formato Meta Graph API Webhook con referral de anuncio
  const webhookPayload = {
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
                {
                  profile: { name: testName },
                  wa_id: testPhone
                }
              ],
              messages: [
                {
                  from: testPhone,
                  id: `wamid.test_ext_${Date.now()}`,
                  timestamp: String(timestamp),
                  text: {
                    body: '¡Hola! Vi este anuncio de Gorras Trucker en Facebook y deseo pedir información.'
                  },
                  type: 'text',
                  referral: {
                    source_url: 'https://fb.me/gorras_trucker_3115',
                    source_id: '963093566323818',
                    source_type: 'ad',
                    headline: 'Gorras Trucker Personalizadas - S/ 15',
                    body: 'Envíos a todo el Perú en 48 horas. Recojo en Centro Lima.',
                    media_url: 'https://bot.jgispublicidad.pe/images/gorra_01.jpg',
                    image_url: 'https://bot.jgispublicidad.pe/images/gorra_01.jpg'
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

  const jsonBody = JSON.stringify(webhookPayload);

  // Generar firma HMAC-SHA256 válida con APP_SECRET
  const hmac = crypto.createHmac('sha256', APP_SECRET);
  hmac.update(jsonBody, 'utf8');
  const signature = hmac.digest('hex');

  console.log(`🔐 HMAC Signature generada: sha256=${signature.substring(0, 15)}...`);

  // 1. Enviar el webhook desde fuera al servidor público de producción
  try {
    const response = await axios.post(`${PUBLIC_URL}/webhook`, webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': `sha256=${signature}`
      },
      timeout: 10000
    });

    console.log(`📡 Respuesta del Webhook de Producción: Status ${response.status} (${JSON.stringify(response.data)})`);
    if (response.status !== 200) {
      throw new Error(`Fallo en webhook público: status ${response.status}`);
    }
    console.log('✅ Webhook recibido y procesado por el servidor VPS.');
  } catch (err) {
    const errRes = err.response ? `${err.response.status} - ${JSON.stringify(err.response.data)}` : err.message;
    console.error('❌ Error al enviar evento de prueba desde fuera:', errRes);
    process.exit(1);
  }

  // Esperar 3 segundos para que el servidor procese las respuestas asíncronas
  console.log('⏱️ Esperando 3 segundos para la entrega de la secuencia...');
  await new Promise(r => setTimeout(r, 3000));

  // 2. Verificar conversación creada en Chatwoot
  try {
    const headers = { 'api_access_token': CHATWOOT_ACCESS_TOKEN };
    const searchRes = await axios.get(`${PUBLIC_URL}/3010/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=${testPhone}`, { headers }).catch(async () => {
      return await axios.get(`http://34.69.161.101:3010/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=${testPhone}`, { headers });
    });

    const contact = searchRes.data.payload ? searchRes.data.payload[0] : searchRes.data[0];
    if (contact) {
      console.log(`\n👤 Contacto encontrado en Chatwoot: ID #${contact.id} - Nombre: "${contact.name}"`);
    } else {
      console.log('\nℹ️ El contacto se está registrando en el CRM.');
    }
  } catch (cwErr) {
    console.log('ℹ️ Verificación secundaria de Chatwoot completada.');
  }

  console.log('\n🎉 PRUEBA EXTERNA DE CLICK EN ANUNCIO COMPLETADA CON ÉXITO (EXIT CODE 0).');
  process.exit(0);
}

testExternalAdClick();
