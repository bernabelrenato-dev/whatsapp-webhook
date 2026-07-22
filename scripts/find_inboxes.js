const axios = require('axios');
const config = require('../src/config/environment');

async function getInboxes() {
  try {
    const url = `${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/inboxes`;
    const res = await axios.get(url, {
      headers: { 'api_access_token': config.CHATWOOT_ACCESS_TOKEN }
    });
    console.log('📌 Inboxes disponibles en Chatwoot:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Error consultando inboxes:', err.response ? err.response.data : err.message);
  }
}

getInboxes();
