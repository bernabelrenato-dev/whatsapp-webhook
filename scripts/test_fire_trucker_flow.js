const axios = require('axios');
const crypto = require('crypto');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://bot.jgispublicidad.pe/webhook';
const APP_SECRET = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';

async function fireTruckerCapFlow() {
  console.log('🧢 =========================================================================');
  console.log('🚀 DISPARANDO FLUJO DE GORRA TRUCKER (30 UNIDADES + PROVINCIA + YAPE)');
  console.log('🧢 =========================================================================\n');

  const waPhone = '51969732451';
  const waName = 'Cliente Cotización Gorras';

  const sendTurn = async (turnNum, title, messageText, referral = null) => {
    console.log(`💬 [TURNO ${turnNum}] Enviando: "${messageText}" (${title})...`);

    const messageObj = {
      from: waPhone,
      id: `wamid.trucker_${turnNum}_${Date.now()}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
      text: { body: messageText },
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
            metadata: { display_phone_number: '51969732451', phone_number_id: '1125473757325877' },
            contacts: [{ profile: { name: waName }, wa_id: waPhone }],
            messages: [messageObj]
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
      console.log(`   ✅ Servidor GCP respondió: HTTP ${res.status} OK`);
      return true;
    } catch (e) {
      console.error(`   ❌ Error en Turno ${turnNum}:`, e.response ? e.response.status : e.message);
      return false;
    }
  };

  let allPassed = true;

  // TURNO 1: Interés en Gorras Trucker desde anuncio Meta Ads
  if (!await sendTurn(1, 'Interés en Gorras Trucker', '¡Hola! Vi su anuncio de Gorras Trucker y deseo cotizar 30 gorras con envío a provincia.', {
    source_url: 'https://fb.me/gorras_trucker_3115',
    headline: 'Gorras Trucker Personalizadas - S/ 15',
    body: 'Envíos a todo el Perú en 48 horas.'
  })) allPassed = false;

  await new Promise(r => setTimeout(r, 4000));

  // TURNO 2: Selección del Menú de Gorras Trucker
  if (!await sendTurn(2, 'Selección Opciones Gorras Trucker', '🧢 Gorras Trucker (Meta Ads)')) allPassed = false;

  await new Promise(r => setTimeout(r, 4000));

  // TURNO 3: Selección de volumen 30 unidades y envío a provincia
  if (!await sendTurn(3, 'Especificación de 30 unidades con Envío a Provincia', 'Deseo cotizar 30 gorras con envío a provincia')) allPassed = false;

  await new Promise(r => setTimeout(r, 4000));

  // TURNO 4: Pasarela de Pago Yape
  if (!await sendTurn(4, 'Transición a Pasarela de Pago Yape', '💳 Pasarela de Pago (Yape / BCP)')) allPassed = false;

  console.log('\n========================================================================');
  if (allPassed) {
    console.log('🎉 FLUJO DISPARADO CON ÉXITO: 4/4 TURNOS ENVIADOS Y PROCESADOS (200 OK)');
    console.log('📌 Revisa tu panel de Chatwoot para ver la interacción completa enviada.');
    console.log('========================================================================\n');
    process.exit(0);
  } else {
    console.error('❌ HUBOS ERRORES AL DISPARAR ALGUNOS DE LOS TURNOS');
    process.exit(1);
  }
}

fireTruckerCapFlow();
