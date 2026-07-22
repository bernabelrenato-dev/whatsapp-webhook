const axios = require('axios');

async function debugFullConversation() {
  console.log('🤖 =========================================================================');
  console.log('🔍 DEBUGEANDO RESPUESTA REAL DE TYPEBOT VIEWER API');
  console.log('🤖 =========================================================================\n');

  const typebotUrl = process.env.TYPEBOT_API_URL || 'http://typebot-viewer:3000';
  const typebotId = process.env.TYPEBOT_ID || 'jgis-publicidad-bot-f33vo50';

  try {
    // 1. Llamar a startChat
    console.log(`1️⃣ Llamando a POST ${typebotUrl}/api/v1/typebots/${typebotId}/startChat...`);
    const startRes = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, {
      isSimulated: false,
      prefilledVariables: {
        phone: '51999888777',
        name: 'Cliente Test Debug'
      }
    });

    console.log('   - Status:', startRes.status);
    console.log('   - Session ID:', startRes.data.sessionId);
    console.log('   - Messages array length:', startRes.data.messages ? startRes.data.messages.length : 0);
    console.log('   - Input object:', JSON.stringify(startRes.data.input));
    if (startRes.data.messages) {
      startRes.data.messages.forEach((m, idx) => {
        console.log(`     Message [${idx + 1}]: type=${m.type}, content=`, JSON.stringify(m.content));
      });
    }

    const sessionId = startRes.data.sessionId;
    if (!sessionId) {
      console.log('❌ No sessionId returned by startChat!');
      return;
    }

    // 2. Llamar a continueChat con "🙋‍♂️ Uso Personal"
    console.log(`\n2️⃣ Llamando a POST ${typebotUrl}/api/v1/sessions/${sessionId}/continueChat con "🙋‍♂️ Uso Personal"...`);
    const contRes = await axios.post(`${typebotUrl}/api/v1/sessions/${sessionId}/continueChat`, {
      message: { type: 'text', text: '🙋‍♂️ Uso Personal' }
    });

    console.log('   - Status:', contRes.status);
    console.log('   - Messages array length:', contRes.data.messages ? contRes.data.messages.length : 0);
    console.log('   - Input object:', JSON.stringify(contRes.data.input));
    if (contRes.data.messages) {
      contRes.data.messages.forEach((m, idx) => {
        console.log(`     Message [${idx + 1}]: type=${m.type}, content=`, JSON.stringify(m.content));
      });
    }

    console.log('\n🎉 PRUEBA DE DEPURACIÓN TYPEBOT VIEWER COMPLETADA.');
  } catch (err) {
    console.error('❌ Error en depuración Typebot Viewer:', err.response ? JSON.stringify(err.response.data) : err.message);
  }
}

debugFullConversation();
