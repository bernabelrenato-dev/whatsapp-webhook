const axios = require('axios');

async function checkViewer() {
  const typebotId = 'jgis-publicidad-bot-f33vo50';
  const typebotUrl = 'http://typebot-viewer:3000';

  console.log(`📡 Enviando startChat a ${typebotUrl}/api/v1/typebots/${typebotId}/startChat...`);
  try {
    const res = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, {
      isSimulated: true
    });
    console.log('STATUS:', res.status);
    console.log('RESPONSE DATA:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('ERROR:', e.response ? e.response.data : e.message);
  }
}

checkViewer();
