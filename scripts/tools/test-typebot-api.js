const axios = require('axios');

axios.post('http://typebot-viewer:3000/api/v1/typebots/jgis-publicidad-bot-f33vo50/startChat', {
  prefilledVariables: {}
})
.then(res => {
  console.log('API SUCCESS: Typebot loaded successfully!');
  console.log('Session ID:', res.data.sessionId);
  console.log('Messages:', JSON.stringify(res.data.messages, null, 2));
})
.catch(err => {
  console.error('API ERROR:', err.response ? err.response.data : err.message);
  process.exit(1);
});
