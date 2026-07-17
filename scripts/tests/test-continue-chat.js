const axios = require('axios');

async function testFlow() {
  try {
    const baseUrl = 'http://localhost:8082';
    
    // 1. Start Chat
    console.log('1. Starting chat session...');
    const startRes = await axios.post(`${baseUrl}/api/v1/typebots/jgis-publicidad-bot-f33vo50/startChat`, {});
    console.log('Start Status:', startRes.status);
    const sessionId = startRes.data.sessionId;
    console.log('Session ID:', sessionId);
    console.log('Initial Messages:', JSON.stringify(startRes.data.messages.map(m => m.content?.richText?.[0]?.children?.[0]?.text || m), null, 2));
    
    // 2. Continue Chat with name "Renato"
    console.log('\n2. Sending name "Renato" to continueChat...');
    const continueRes = await axios.post(`${baseUrl}/api/v1/sessions/${sessionId}/continueChat`, {
      message: {
        type: 'text',
        text: 'Renato'
      }
    });
    console.log('Continue Status:', continueRes.status);
    console.log('Continue Response:', JSON.stringify(continueRes.data, null, 2));
    
  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.message);
    }
  }
}

testFlow();
