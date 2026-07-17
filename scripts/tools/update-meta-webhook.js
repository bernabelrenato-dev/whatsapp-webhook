const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment
const envPath = path.join(__dirname, '..', '..', '.env');
const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

async function main() {
  const appId = '963093566323818';
  const appSecret = process.env.APP_SECRET;
  const tunnelUrl = process.env.PUBLIC_URL;

  if (!appSecret || !tunnelUrl) {
    console.error('Error: Missing APP_SECRET or PUBLIC_URL in environment');
    return;
  }

  // Construct App Access Token: app_id|app_secret
  const appAccessToken = `${appId}|${appSecret}`;
  const webhookUrl = `${tunnelUrl}/webhook`;
  console.log(`Setting callback URL to: ${webhookUrl}`);

  try {
    // Perform Webhook Subscription Update via Graph API using App Access Token
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${appId}/subscriptions`,
      null,
      {
        params: {
          access_token: appAccessToken,
          object: 'whatsapp_business_account',
          callback_url: webhookUrl,
          fields: 'messages',
          verify_token: process.env.VERIFY_TOKEN || 'mi_token_secreto_whatsapp_123',
          active: 'true'
        }
      }
    );

    console.log('Webhook subscription updated successfully!');
    console.log('Response:', response.data);

  } catch (err) {
    if (err.response) {
      console.error('Meta API Error:', err.response.status, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error executing request:', err.message);
    }
  }
}

main();
