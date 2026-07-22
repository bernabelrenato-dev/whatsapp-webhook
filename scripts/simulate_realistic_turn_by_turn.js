require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const APP_SECRET = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';

async function runRealisticTurnByTurnDemo() {
  console.log('🤖 =========================================================================');
  console.log('🎭 SIMULACIÓN REALISTA CONVERSACIONAL PASO A PASO EN CHATWOOT (MASTER FLOW)');
  console.log('🤖 =========================================================================\n');

  const waPhone = '519' + String(Date.now()).slice(-8);
  const waName = `Cliente Maestro Meta Ads #${String(Date.now()).slice(-4)}`;

  const sendWaMessageTurn = async (text, referral = null) => {
    const messageObj = {
      from: waPhone,
      id: `wamid.real_${Date.now()}_${Math.random()}`,
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
      console.error('❌ Error enviando turno:', e.message);
      return null;
    }
  };

  // ---------------------------------------------------------------------------
  // TURNO 1: Cliente ve el anuncio en Facebook/Instagram y hace clic
  // ---------------------------------------------------------------------------
  console.log('💬 [TURNO 1] Cliente hace clic en anuncio Meta Ads...');
  await sendWaMessageTurn('¡Hola! Vi su anuncio de Gorras Trucker en Facebook y deseo pedir información.', {
    source_url: 'https://fb.me/gorras_trucker_3115',
    source_id: '963093566323818',
    source_type: 'ad',
    headline: 'Gorras Trucker Personalizadas - S/ 15',
    body: 'Envíos a todo el Perú en 48 horas.'
  });
  console.log('   ⏱️ Esperando 10 segundos para que el Bot responda con el Menú Maestro...');
  await new Promise(r => setTimeout(r, 10000));

  // ---------------------------------------------------------------------------
  // TURNO 2: Cliente elige "🧢 Gorras Trucker (Meta Ads)" del Menú Maestro
  // ---------------------------------------------------------------------------
  console.log('💬 [TURNO 2] Cliente selecciona "🧢 Gorras Trucker (Meta Ads)"...');
  await sendWaMessageTurn('🧢 Gorras Trucker (Meta Ads)');
  console.log('   ⏱️ Esperando 10 segundos para que el Bot entregue la Calificación de Gorras Trucker...');
  await new Promise(r => setTimeout(r, 10000));

  // ---------------------------------------------------------------------------
  // TURNO 3: Cliente elige "🙋‍♂️ Uso Personal"
  // ---------------------------------------------------------------------------
  console.log('💬 [TURNO 3] Cliente responde "🙋‍♂️ Uso Personal"...');
  await sendWaMessageTurn('🙋‍♂️ Uso Personal');
  console.log('   ⏱️ Esperando 10 segundos para que el Bot entregue Galería de Fotos y Pregunta de Cantidad...');
  await new Promise(r => setTimeout(r, 10000));

  // ---------------------------------------------------------------------------
  // TURNO 4: Cliente elige escala de cantidad "🧢 6 a 12 unidades"
  // ---------------------------------------------------------------------------
  console.log('💬 [TURNO 4] Cliente responde "🧢 6 a 12 unidades"...');
  await sendWaMessageTurn('🧢 6 a 12 unidades');
  console.log('   ⏱️ Esperando 10 segundos para que el Bot entregue Cotización por Mayor y Pregunta de Cierre...');
  await new Promise(r => setTimeout(r, 10000));

  // ---------------------------------------------------------------------------
  // TURNO 5: Cliente confirma "🚚 Envío a Domicilio"
  // ---------------------------------------------------------------------------
  console.log('💬 [TURNO 5] Cliente responde "🚚 Envío a Domicilio"...');
  await sendWaMessageTurn('🚚 Envío a Domicilio');
  console.log('   ⏱️ Esperando 10 segundos para que el Bot entregue Datos de Pago BCP / Yape...');
  await new Promise(r => setTimeout(r, 10000));

  // ---------------------------------------------------------------------------
  // TURNO 6: Cliente notifica "✅ Ya aboné / Enviar voucher"
  // ---------------------------------------------------------------------------
  console.log('💬 [TURNO 6] Cliente responde "✅ Ya aboné / Enviar voucher"...');
  await sendWaMessageTurn('✅ Ya aboné / Enviar voucher');
  console.log('   ⏱️ Esperando 10 segundos para que el Bot entregue la Confirmación de Trabajo Ingresado a Producción...');
  await new Promise(r => setTimeout(r, 10000));

  console.log('🎉 =========================================================================');
  console.log(`✅ CONVERSACIÓN REALISTA DEL FLUJO MAESTRO Y PRODUCCIÓN COMPLETA PARA: ${waName}`);
  console.log('👉 Abre Chatwoot (https://chatwoot.jgispublicidad.pe) para ver la secuencia fluida.');
  console.log('🎉 =========================================================================\n');
  return;
}

runRealisticTurnByTurnDemo();
