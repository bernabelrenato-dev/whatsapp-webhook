const axios = require('axios');
const crypto = require('crypto');

async function testWhatsappAndMessenger() {
  console.log('🧪 =========================================================================');
  console.log('⚡ PRUEBA DUAL DE ENRUTAMIENTO: WHATSAPP (2 MSGS) + MESSENGER (2 MSGS)');
  console.log('🧪 =========================================================================\n');

  const port = process.env.PORT || 3000;
  const webhookUrl = process.env.WEBHOOK_URL || `http://127.0.0.1:${port}/webhook`;
  const appSecret = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';

  function getHeaders(payload) {
    const signature = crypto.createHmac('sha256', appSecret).update(JSON.stringify(payload), 'utf8').digest('hex');
    return {
      'Content-Type': 'application/json',
      'x-hub-signature-256': `sha256=${signature}`
    };
  }

  // 1. Payloads de WhatsApp (2 Mensajes)
  const waPayload1 = {
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
              contacts: [{ profile: { name: 'Cliente WA Test 1' }, wa_id: '51999111222' }],
              messages: [{ from: '51999111222', id: `wamid.test1_${Date.now()}`, timestamp: `${Math.floor(Date.now()/1000)}`, text: { body: 'Hola' }, type: 'text' }]
            }
          }
        ]
      }
    ]
  };

  const waPayload2 = {
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
              contacts: [{ profile: { name: 'Cliente WA Test 1' }, wa_id: '51999111222' }],
              messages: [{ from: '51999111222', id: `wamid.test2_${Date.now()}`, timestamp: `${Math.floor(Date.now()/1000)}`, text: { body: 'Gorras Trucker' }, type: 'text' }]
            }
          }
        ]
      }
    ]
  };

  // 2. Payloads de Messenger (2 Mensajes)
  const msgnrPayload1 = {
    object: 'page',
    entry: [
      {
        id: '200987654',
        time: Date.now(),
        messaging: [
          {
            sender: { id: 'msgnr_user_998877' },
            recipient: { id: '200987654' },
            timestamp: Date.now(),
            message: { mid: `mid.msgnr_test_1_${Date.now()}`, text: 'Hola quiero cotizar' }
          }
        ],
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '51969732451', phone_number_id: '100123' },
              contacts: [{ profile: { name: 'Cliente FB Messenger' }, wa_id: 'msgnr_user_998877' }],
              messages: [{ from: 'msgnr_user_998877', id: `mid.msgnr_test_1_${Date.now()}`, timestamp: `${Math.floor(Date.now()/1000)}`, text: { body: 'Hola quiero cotizar' }, type: 'text' }]
            }
          }
        ]
      }
    ]
  };

  const msgnrPayload2 = {
    object: 'page',
    entry: [
      {
        id: '200987654',
        time: Date.now(),
        messaging: [
          {
            sender: { id: 'msgnr_user_998877' },
            recipient: { id: '200987654' },
            timestamp: Date.now(),
            message: { mid: `mid.msgnr_test_2_${Date.now()}`, text: 'Cotizacion Corporativa B2B' }
          }
        ],
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '51969732451', phone_number_id: '100123' },
              contacts: [{ profile: { name: 'Cliente FB Messenger' }, wa_id: 'msgnr_user_998877' }],
              messages: [{ from: 'msgnr_user_998877', id: `mid.msgnr_test_2_${Date.now()}`, timestamp: `${Math.floor(Date.now()/1000)}`, text: { body: 'Cotizacion Corporativa B2B' }, type: 'text' }]
            }
          }
        ]
      }
    ]
  };

  let successCount = 0;

  try {
    console.log('📩 [1/4] Enviando Mensaje 1 de WhatsApp...');
    const r1 = await axios.post(webhookUrl, waPayload1, { headers: getHeaders(waPayload1) });
    if (r1.status === 200) { console.log('✅ WA Msg 1 exitoso (200 OK)'); successCount++; }

    console.log('📩 [2/4] Enviando Mensaje 2 de WhatsApp...');
    const r2 = await axios.post(webhookUrl, waPayload2, { headers: getHeaders(waPayload2) });
    if (r2.status === 200) { console.log('✅ WA Msg 2 exitoso (200 OK)'); successCount++; }

    console.log('📩 [3/4] Enviando Mensaje 1 de Messenger...');
    const r3 = await axios.post(webhookUrl, msgnrPayload1, { headers: getHeaders(msgnrPayload1) });
    if (r3.status === 200) { console.log('✅ Messenger Msg 1 exitoso (200 OK)'); successCount++; }

    console.log('📩 [4/4] Enviando Mensaje 2 de Messenger...');
    const r4 = await axios.post(webhookUrl, msgnrPayload2, { headers: getHeaders(msgnrPayload2) });
    if (r4.status === 200) { console.log('✅ Messenger Msg 2 exitoso (200 OK)'); successCount++; }

    if (successCount === 4) {
      console.log('\n🎉 =========================================================================');
      console.log('✅ PRUEBA DUAL EXITOSA: 2 MSGS WHATSAPP + 2 MSGS MESSENGER PROCESADOS (200 OK)');
      console.log('🎉 =========================================================================');
      return;
    } else {
      console.error(`❌ Falló la prueba dual. Éxitos: ${successCount}/4`);
    }
  } catch (err) {
    console.error('❌ Error ejecutando la prueba dual:', err.response ? JSON.stringify(err.response.data) : err.message);
  }
}

testWhatsappAndMessenger();
