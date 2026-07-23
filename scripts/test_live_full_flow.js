const axios = require('axios');
const crypto = require('crypto');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://bot.jgispublicidad.pe/webhook';
const APP_SECRET = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';

async function runLiveTurnByTurnDemo() {
  console.log('🤖 =========================================================================');
  console.log('🎭 DEMOSTRACIÓN DEL FLUJO EN VIVO PASO A PASO (PRODUCTION GCP)');
  console.log('🤖 =========================================================================\n');

  const waPhone = '519' + String(Date.now()).slice(-8);
  const waName = `Cliente Test Live #${String(Date.now()).slice(-4)}`;

  const sendTurn = async (turnNum, title, bodyText) => {
    console.log(`💬 [TURNO ${turnNum}] Cliente envía: "${bodyText}" (${title})...`);

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
              id: `wamid.live_${turnNum}_${Date.now()}`,
              timestamp: String(Math.floor(Date.now() / 1000)),
              text: { body: bodyText },
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
      console.log(`   ✅ Servidor GCP respondió: HTTP ${res.status} OK`);
      return true;
    } catch (e) {
      console.error(`   ❌ Error en Turno ${turnNum}:`, e.response ? e.response.status : e.message);
      return false;
    }
  };

  let allPassed = true;

  // TURNO 1: Inicio de conversación
  if (!await sendTurn(1, 'Apertura de Menú Principal', 'inicio')) allPassed = false;
  await new Promise(r => setTimeout(r, 2000));

  // TURNO 2: Selección de Catálogo
  if (!await sendTurn(2, 'Selección de Catálogo Multicategoría', '📦 Catálogo Multicategoría')) allPassed = false;
  await new Promise(r => setTimeout(r, 2000));

  // TURNO 3: Selección de Lapiceros Metálicos
  if (!await sendTurn(3, 'Selección Subcategoría Lapiceros Metálicos', '🖊️ Lapiceros Metálicos (Láser)')) allPassed = false;
  await new Promise(r => setTimeout(r, 2000));

  // TURNO 4: Selección Modelo LM-18
  if (!await sendTurn(4, 'Ficha Modelo Exacto LM-18', '🖊️ Modelo LM-18 (Lapicero Metal Grueso)')) allPassed = false;
  await new Promise(r => setTimeout(r, 2000));

  // TURNO 5: Pasarela de Pago
  if (!await sendTurn(5, 'Transición a Pasarela de Pago Yape/BCP', '💳 Pasarela de Pago (Yape / BCP)')) allPassed = false;

  console.log('\n========================================================================');
  if (allPassed) {
    console.log('🎉 DEMOSTRACIÓN COMPLETADA: TODOS LOS 5 TURNOS PROCESADOS CON ÉXITO (200 OK)');
    console.log('========================================================================\n');
    process.exit(0);
  } else {
    console.error('❌ FALLÓ ALGUNO DE LOS TURNOS EN LA DEMOSTRACIÓN');
    process.exit(1);
  }
}

runLiveTurnByTurnDemo();
