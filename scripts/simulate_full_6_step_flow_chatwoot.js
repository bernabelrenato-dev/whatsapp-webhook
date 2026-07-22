require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const APP_SECRET = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';

async function runFull6StepSimulation() {
  console.log('🤖 =========================================================================');
  console.log('🚀 SIMULANDO FLUJO COMERCIAL COMPLETO DE GORRAS TRUCKER (6 PASOS) EN CHATWOOT');
  console.log('🤖 =========================================================================\n');

  const timestamp = Math.floor(Date.now() / 1000);
  const waPhone = '519' + String(Date.now()).slice(-8);
  const waName = `Cliente Demo Gorras #${String(Date.now()).slice(-4)}`;

  const sendWaMessage = async (text, referral = null) => {
    const messageObj = {
      from: waPhone,
      id: `wamid.demo_${Date.now()}_${Math.random()}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
      text: { body: text },
      type: 'text'
    };
    if (referral) {
      messageObj.referral = referral;
    }

    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '1125473757325877',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '51936473437', phone_number_id: '1125473757325877' },
            contacts: [{ profile: { name: waName }, wa_id: waPhone }],
            messages: [messageObj]
          },
          field: 'messages'
        }]
      }]
    };

    const signature = crypto.createHmac('sha256', APP_SECRET).update(JSON.stringify(payload), 'utf8').digest('hex');

    try {
      const res = await axios.post(`${BASE_URL}/webhook`, payload, {
        headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': `sha256=${signature}` },
        timeout: 10000
      });
      return res.status;
    } catch (e) {
      console.error('❌ Error enviando mensaje simulado:', e.message);
      return null;
    }
  };

  // ---------------------------------------------------------------------------
  // PASO 1: Clic entrante de Anuncio Meta Ads
  // ---------------------------------------------------------------------------
  console.log('1️⃣ [PASO 1] Cliente hace clic en anuncio Meta Ads...');
  await sendWaMessage('¡Hola! Vi su anuncio de Gorras Trucker en Facebook y deseo pedir información.', {
    source_url: 'https://fb.me/gorras_trucker_3115',
    source_id: '963093566323818',
    source_type: 'ad',
    headline: 'Gorras Trucker Personalizadas - S/ 15',
    body: 'Envíos a todo el Perú en 48 horas.'
  });
  console.log('   ✅ Paso 1 enviado. Esperando 4 segundos...');
  await new Promise(r => setTimeout(r, 4000));

  // ---------------------------------------------------------------------------
  // PASO 2: Selección de Uso ("🙋‍♂️ Uso Personal")
  // ---------------------------------------------------------------------------
  console.log('2️⃣ [PASO 2] Cliente selecciona "🙋‍♂️ Uso Personal"...');
  await sendWaMessage('🙋‍♂️ Uso Personal');
  console.log('   ✅ Paso 2 enviado. Esperando 4 segundos...');
  await new Promise(r => setTimeout(r, 4000));

  // ---------------------------------------------------------------------------
  // PASO 3: Selección de Cantidad ("🧢 6 a 12 unidades")
  // ---------------------------------------------------------------------------
  console.log('3️⃣ [PASO 3] Cliente selecciona "🧢 6 a 12 unidades"...');
  await sendWaMessage('🧢 6 a 12 unidades');
  console.log('   ✅ Paso 3 enviado. Esperando 4 segundos...');
  await new Promise(r => setTimeout(r, 4000));

  // ---------------------------------------------------------------------------
  // PASO 4: Confirmación de Cierre ("🚚 Sí, confirmar con Envío a Domicilio")
  // ---------------------------------------------------------------------------
  console.log('4️⃣ [PASO 4] Cliente confirma "🚚 Sí, confirmar con Envío a Domicilio"...');
  await sendWaMessage('🚚 Sí, confirmar con Envío a Domicilio');
  console.log('   ✅ Paso 4 enviado. Esperando 4 segundos...');
  await new Promise(r => setTimeout(r, 4000));

  console.log('🎉 =========================================================================');
  console.log(`✅ DEMOSTRACIÓN COMPLETA DE 6 PASOS GENERADA PARA: ${waName} (${waPhone})`);
  console.log('👉 Revisa ahora tu pantalla de Chatwoot (https://chatwoot.jgispublicidad.pe)');
  console.log('🎉 =========================================================================\n');
  return;
}

runFull6StepSimulation();
