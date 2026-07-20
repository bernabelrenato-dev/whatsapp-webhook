const axios = require('axios');

async function testFullFlow() {
  try {
    const baseUrl = process.env.TYPEBOT_URL || 'http://typebot-viewer:3000';
    
    // 1. Start Chat
    console.log('1. Starting chat...');
    const startRes = await axios.post(`${baseUrl}/api/v1/typebots/jgis-publicidad-bot-f33vo50/startChat`, {});
    const sessionId = startRes.data.sessionId;
    console.log('   Session ID:', sessionId);
    
    // 2. Submit Name
    console.log('\n2. Submitting Name "Renato"...');
    await axios.post(`${baseUrl}/api/v1/sessions/${sessionId}/continueChat`, {
      message: { type: 'text', text: 'Renato' }
    });
    
    // 3. Submit Category Choice
    console.log('\n3. Selecting Category "🏺 Tazas y Mugs"...');
    await axios.post(`${baseUrl}/api/v1/sessions/${sessionId}/continueChat`, {
      message: { type: 'text', text: '🏺 Tazas y Mugs' }
    });
    
    // 4. Submit Product Search Query
    console.log('\n4. Submitting Search Query "Mug"...');
    await axios.post(`${baseUrl}/api/v1/sessions/${sessionId}/continueChat`, {
      message: { type: 'text', text: 'Mug' }
    });
    
    // 5. Submit Quantity
    console.log('\n5. Submitting Quantity "100"...');
    const finalRes = await axios.post(`${baseUrl}/api/v1/sessions/${sessionId}/continueChat`, {
      message: { type: 'text', text: '100' }
    });
    
    console.log('\nFinal Response Status:', finalRes.status);
    console.log('Final Response Data:');
    console.log(JSON.stringify(finalRes.data, null, 2));
    
  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.message);
    }
  }
}

testFullFlow();
