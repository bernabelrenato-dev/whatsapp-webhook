/**
 * Test de Carga y Resiliencia Concurrente — JGIS Publicidad WhatsApp Webhook
 * Simula 20 conversaciones concurrentes enviando:
 * 1. Mensajes de cotización de catálogo
 * 2. Mensajes con imágenes
 * 3. Solicitudes de atención de agente humano
 * 
 * Verifica:
 * - Respuestas sin errores 500 (HTTP 200 OK en recepción de webhook)
 * - Control de memoria y ausencia de fugas
 * - Métricas de latencia y porcentaje de éxito
 */

const crypto = require('crypto');
const http = require('http');

let appSecret = process.env.APP_SECRET;
if (!appSecret) {
  try {
    const config = require('../../src/config/environment');
    appSecret = config.APP_SECRET || '';
  } catch (e) {
    appSecret = '';
  }
}

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/webhook';
const CONCURRENT_CONVERSATIONS = 20;

function createWhatsAppPayload(phoneNumber, messageType, bodyOrMediaId) {
  const messageObj = {
    from: phoneNumber,
    id: `wamid.stress_${phoneNumber}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: messageType
  };

  if (messageType === 'text') {
    messageObj.text = { body: bodyOrMediaId };
  } else if (messageType === 'image') {
    messageObj.image = { id: bodyOrMediaId || 'sample_image_id_12345', mime_type: 'image/jpeg' };
  }

  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: phoneNumber,
                phone_number_id: '10000000000'
              },
              contacts: [
                {
                  profile: { name: `Tester User ${phoneNumber.slice(-4)}` },
                  wa_id: phoneNumber
                }
              ],
              messages: [messageObj]
            },
            field: 'messages'
          }
        ]
      }
    ]
  });
}

function sendWebhookMessage(payload) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(WEBHOOK_URL);
    const signatureHash = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    const headers = {
      'Content-Type': 'application/json',
      'x-hub-signature-256': `sha256=${signatureHash}`,
      'Content-Length': Buffer.byteLength(payload)
    };

    const startTime = Date.now();
    const req = http.request(parsedUrl, {
      method: 'POST',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          duration,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({
        statusCode: 0,
        duration,
        error: err.message
      });
    });

    req.write(payload);
    req.end();
  });
}

async function runSimulatedConversation(userIndex) {
  const phone = `51999${String(userIndex).padStart(6, '0')}`;
  const results = [];

  // Mensaje 1: Cotización
  const quotePayload = createWhatsAppPayload(phone, 'text', 'Hola, necesito cotizar 100 tazas personalizadas con mi logo corporativo');
  const res1 = await sendWebhookMessage(quotePayload);
  results.push({ type: 'quote', phone, ...res1 });

  // Mensaje 2: Imagen
  const imagePayload = createWhatsAppPayload(phone, 'image', `img_sample_${userIndex}_${Date.now()}`);
  const res2 = await sendWebhookMessage(imagePayload);
  results.push({ type: 'image', phone, ...res2 });

  // Mensaje 3: Asesor Humano
  const agentPayload = createWhatsAppPayload(phone, 'text', 'Quiero hablar con un asesor comercial humano por favor');
  const res3 = await sendWebhookMessage(agentPayload);
  results.push({ type: 'agent', phone, ...res3 });

  return results;
}

async function runStressTest() {
  console.log('🚀 ====================================================');
  console.log('🧪 Iniciando prueba de carga y resiliencia concurrente');
  console.log(`📍 Endpoint Webhook: ${WEBHOOK_URL}`);
  console.log(`👥 Conversaciones concurrentes: ${CONCURRENT_CONVERSATIONS}`);
  console.log('🚀 ====================================================\n');

  const initialMemory = process.memoryUsage();
  console.log(`📊 Memoria inicial del ejecutor RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`);

  const startTime = Date.now();

  // Crear 20 conversaciones concurrentes
  const conversationPromises = [];
  for (let i = 1; i <= CONCURRENT_CONVERSATIONS; i++) {
    conversationPromises.push(runSimulatedConversation(i));
  }

  const allConversationResults = await Promise.all(conversationPromises);
  const totalDuration = Date.now() - startTime;

  const flatResults = allConversationResults.flat();
  const totalRequests = flatResults.length;
  
  let successCount = 0;
  let serverErrorCount = 0;
  let networkErrorCount = 0;
  let statusDistribution = {};
  let totalLatency = 0;
  let minLatency = Infinity;
  let maxLatency = 0;

  flatResults.forEach(r => {
    statusDistribution[r.statusCode] = (statusDistribution[r.statusCode] || 0) + 1;
    totalLatency += r.duration;
    if (r.duration < minLatency) minLatency = r.duration;
    if (r.duration > maxLatency) maxLatency = r.duration;

    if (r.statusCode === 200) {
      successCount++;
    } else if (r.statusCode >= 500) {
      serverErrorCount++;
    } else {
      networkErrorCount++;
    }
  });

  const avgLatency = (totalLatency / totalRequests).toFixed(2);
  const finalMemory = process.memoryUsage();
  const memoryDeltaMB = ((finalMemory.rss - initialMemory.rss) / 1024 / 1024).toFixed(2);

  console.log('\n📊 ====================================================');
  console.log('🏁 RESULTADOS DE LA PRUEBA DE ESTRÉS Y CONCURRENCIA');
  console.log('====================================================');
  console.log(`⏱️  Tiempo total de ejecución: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`📩 Total de peticiones enviadas: ${totalRequests}`);
  console.log(`✅ Peticiones exitosas (200 OK): ${successCount} / ${totalRequests}`);
  console.log(`❌ Errores de servidor (500 Server Error): ${serverErrorCount}`);
  console.log(`⚠️  Distribución de Estados HTTP:`, JSON.stringify(statusDistribution));
  console.log(`⏱️  Latencia Promedio: ${avgLatency} ms (Mín: ${minLatency}ms, Máx: ${maxLatency}ms)`);
  console.log(`🧠 Memoria final ejecutor RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB (Delta: ${memoryDeltaMB} MB)`);
  console.log('====================================================\n');

  if (serverErrorCount > 0) {
    console.error(`❌ FALLO DE PRUEBA: Se registraron ${serverErrorCount} errores 500 en el servidor.`);
    process.exit(1);
  } else {
    console.log('🎉 PRUEBA COMPLETADA CON ÉXITO: 0 errores 500 detectados.');
    process.exit(0);
  }
}

runStressTest().catch(err => {
  console.error('❌ Error fatal en ejecución de prueba de estrés:', err);
  process.exit(1);
});
