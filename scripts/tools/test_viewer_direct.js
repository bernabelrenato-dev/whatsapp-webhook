const axios = require('axios');

async function testViewer() {
  try {
    const res = await axios.post('http://typebot-viewer:3000/api/v1/typebots/jgis-publicidad-bot-f33vo50/startChat', {
      prefilledVariables: { name: 'Test Zod Direct' }
    });
    console.log('✅ TYPEBOT VIEWER STARTCHAT STATUS:', res.status);
    console.log('📦 MENSAJES RECIBIDOS:', res.data.messages ? res.data.messages.length : 0);
    console.log('INPUT RECIBIDO:', res.data.input ? res.data.input.type : 'Nninguno');
    if (res.data.messages) {
      console.log('PRIMER MENSAJE:', JSON.stringify(res.data.messages[0]));
    }
  } catch (err) {
    console.error('❌ ERROR EN TYPEBOT VIEWER:', err.response ? err.response.status : err.message);
    if (err.response && err.response.data) {
      console.error('DATOS DEL ERROR:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

testViewer();
