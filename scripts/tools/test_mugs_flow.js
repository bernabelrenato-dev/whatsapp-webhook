const axios = require('axios');
const crypto = require('crypto');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://bot.jgispublicidad.pe/webhook';
const APP_SECRET = process.env.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a';

async function testMugFlow() {
  console.log('🤖 =========================================================================');
  console.log('☕ PRUEBA END-TO-END: SUB-FLUJO DE MUGS TÉRMICOS DE ACERO (PRODUCTION GCP)');
  console.log('🤖 =========================================================================\n');

  const waPhone = '519' + String(Date.now()).slice(-8);
  const waName = `Cliente Test Mugs #${String(Date.now()).slice(-4)}`;

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
              id: `wamid.mug_${turnNum}_${Date.now()}`,
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

  // TURNO 1: Inicio / Apertura
  if (!await sendTurn(1, 'Apertura del Bot', 'inicio')) allPassed = false;
  await new Promise(r => setTimeout(r, 1500));

  // TURNO 2: Texto libre "termo de cafe" (Entrada Híbrida)
  if (!await sendTurn(2, 'Texto libre: "termo de cafe"', 'termo de cafe')) allPassed = false;
  await new Promise(r => setTimeout(r, 1500));

  // TURNO 3: Selección de Capacidad Mediano
  if (!await sendTurn(3, 'Selección de Capacidad: Mediano (500ml)', '☕ Mediano (500ml)')) allPassed = false;
  await new Promise(r => setTimeout(r, 1500));

  // TURNO 4: Selección de Modelo TM075
  if (!await sendTurn(4, 'Selección de Modelo: Thermo Mug TM075', '🔥 Thermo Mug TM075 / TM072 (500ml)')) allPassed = false;
  await new Promise(r => setTimeout(r, 1500));

  // TURNO 5: Pasarela de Pago
  if (!await sendTurn(5, 'Pasarela de Pago', '💳 Pasarela de Pago (Yape / BCP)')) allPassed = false;

  console.log('\n========================================================================');
  if (allPassed) {
    console.log('🎉 PRUEBA DE MUGS TÉRMICOS COMPLETADA: TODOS LOS TURNOS PROCESADOS (200 OK)');
    console.log('========================================================================\n');
  } else {
    console.error('❌ FALLÓ ALGUNO DE LOS TURNOS EN LA PRUEBA DE MUGS');
  }
}

testMugFlow();
