require('dotenv').config();
const axios = require('axios');

async function testStartChat() {
  console.log('🤖 Probando endpoint de Typebot Viewer startChat...');
  const typebotUrl = process.env.TYPEBOT_API_URL || 'http://typebot-viewer:3000';
  const typebotId = process.env.TYPEBOT_ID || 'jgis-publicidad-bot-f33vo50';

  try {
    const res = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, {
      isSimulated: false
    });
    console.log('✅ startChat ÉXITO (Status:', res.status, ')');
    console.log('   - Session ID:', res.data.sessionId);
    console.log('   - Mensajes recibidos:', res.data.messages ? res.data.messages.length : 0);
    if (res.data.messages) {
      res.data.messages.forEach((m, i) => {
        console.log(`     [${i + 1}] Tipo: ${m.type} | Content:`, JSON.stringify(m.content));
      });
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error llamando a startChat:', err.response ? JSON.stringify(err.response.data) : err.message);
    process.exit(1);
  }
}

testStartChat();
