const crypto = require('crypto');
const http = require('http');

let appSecret = process.env.APP_SECRET;
if (!appSecret) {
  try {
    const config = require('../../src/config/environment');
    appSecret = config.APP_SECRET;
  } catch (e) {
    appSecret = 'your_app_secret_here';
  }
}

const payload = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '123456',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '51999999999',
              phone_number_id: '10000000000'
            },
            contacts: [
              {
                profile: { name: 'Renato Tester' },
                wa_id: '51999999999'
              }
            ],
            messages: [
              {
                from: '51999999999',
                id: `wamid.test_${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: { body: 'Hola, quisiera cotizar 100 tazas personalizadas con mi logo' },
                type: 'text'
              }
            ]
          },
          field: 'messages'
        }
      ]
    }
  ]
});

const signatureHash = crypto
  .createHmac('sha256', appSecret || '')
  .update(payload)
  .digest('hex');

const signatureHeader = `sha256=${signatureHash}`;

console.log(`[TEST] Sending payload with valid HMAC signature...`);
console.log(`[TEST] Signature: ${signatureHeader}`);

const req = http.request('http://localhost:3000/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-hub-signature-256': signatureHeader,
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`[TEST] Response Status: ${res.statusCode}`);
    console.log(`[TEST] Response Body: ${body}`);
  });
});

req.on('error', (err) => {
  console.error('[TEST] Request Error:', err.message);
});

req.write(payload);
req.end();
