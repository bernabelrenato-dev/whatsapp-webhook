const axios = require('axios');
const config = require('../src/config/environment');

async function getInboxes() {
  const urls = ['http://172.18.0.1:3010', 'http://host.docker.internal:3010', config.CHATWOOT_API_URL];
  for (const baseUrl of urls) {
    try {
      const url = `${baseUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/inboxes`;
      const res = await axios.get(url, {
        headers: { 'api_access_token': config.CHATWOOT_ACCESS_TOKEN },
        timeout: 3000
      });
      console.log(`📌 Inboxes encontradas conectando a ${baseUrl}:`);
      console.log(JSON.stringify(res.data, null, 2));
      return res.data;
    } catch (err) {
      console.log(`ℹ️ Fallo conexión a ${baseUrl}: ${err.message}`);
    }
  }
}

getInboxes();
