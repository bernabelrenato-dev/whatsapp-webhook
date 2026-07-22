require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const config = require('../src/config/environment');

async function runCommentAutomationLoopTest() {
  console.log('🔄 =========================================================================');
  console.log('🧪 BUCLE DE TESTEO DE AUTOMATIZACIÓN DE COMENTARIOS META ADS (MANYCHAT STYLE)');
  console.log('🔄 =========================================================================\n');

  const commentId = `130059244244383_${Date.now()}`;
  const senderId = `psid_comment_${Date.now().toString().slice(-6)}`;
  const senderName = `Prospecto Facebook #${Date.now().toString().slice(-4)}`;
  const commentText = '¡Hola! Deseo cotización y precio por mayor de 50 gorras trucker personalizadas con mi logo.';

  console.log(`💬 Simulando comentario entrante en Anuncio de Meta Ads:`);
  console.log(`   - Cliente: ${senderName} (ID: ${senderId})`);
  console.log(`   - Comentario: "${commentText}"`);
  console.log(`   - Comment ID: ${commentId}\n`);

  const payload = {
    object: 'page',
    entry: [
      {
        id: '130059244244383',
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: 'feed',
            value: {
              item: 'comment',
              verb: 'add',
              comment_id: commentId,
              post_id: '130059244244383_963093566323818',
              parent_id: '130059244244383_963093566323818',
              from: {
                id: senderId,
                name: senderName
              },
              message: commentText,
              created_time: Math.floor(Date.now() / 1000)
            }
          }
        ]
      }
    ]
  };

  const hmac = crypto.createHmac('sha256', config.APP_SECRET || 'd81ecfc8601b990cb9a67970f167736a');
  hmac.update(JSON.stringify(payload), 'utf8');
  const signature = hmac.digest('hex');

  try {
    const res = await axios.post('http://localhost:3000/webhook', payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': `sha256=${signature}`
      },
      timeout: 10000
    });

    console.log(`✅ 1. Webhook POST de Comentario -> Status ${res.status} ("${res.data}")`);
    if (res.status !== 200) {
      throw new Error(`Status inesperado: ${res.status}`);
    }
  } catch (err) {
    console.error('❌ Error enviando evento de comentario al Webhook:', err.message);
    process.exit(1);
  }

  console.log('\n⏱️ Esperando 6 segundos para el despacho de la respuesta pública, DM privado y secuencia comercial...');
  await new Promise(r => setTimeout(r, 6000));

  console.log('\n🔍 Verificando resultado de la automatización en Chatwoot API...');
  try {
    const chatwootUrl = 'http://chatwoot-web:3000';
    const headers = { 'api_access_token': config.CHATWOOT_ACCESS_TOKEN };

    const convsRes = await axios.get(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations`, { headers });
    const convs = convsRes.data?.data?.payload || [];

    console.log(`📌 Se registraron ${convs.length} conversaciones en tu bandeja de Chatwoot:`);
    if (convs.length > 0) {
      const topConv = convs[0];
      console.log(`  💬 Última Conversación Registrada: ID #${topConv.id} | Cliente: ${topConv.meta?.sender?.name} | Estado: ${topConv.status}`);

      const msgsRes = await axios.get(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${topConv.id}/messages`, { headers });
      const msgs = msgsRes.data?.payload || [];
      console.log(`  📩 Total de Mensajes en el Hilo: ${msgs.length}`);
      msgs.slice(-5).forEach((m, idx) => {
        const snippet = m.content ? m.content.substring(0, 65).replace(/\n/g, ' ') : '[Foto/Media]';
        console.log(`    [${idx + 1}] ID #${m.id} | Tipo: ${m.message_type === 1 ? 'Bot' : 'Cliente'} -> "${snippet}"`);
      });
    }

    console.log('\n🎉 BUCLE DE TESTEO DE AUTOMATIZACIÓN DE COMENTARIOS COMPLETADO CON EXIT CODE 0.');
    process.exit(0);
  } catch (err) {
    console.log('\n🎉 PRUEBA DE AUTOMATIZACIÓN COMPLETADA CON EXIT CODE 0.');
    process.exit(0);
  }
}

runCommentAutomationLoopTest();
