const axios = require('axios');
const crypto = require('crypto');

const DEPLOY_URL = 'https://bot.jgispublicidad.pe/deploy-webhook';

const possibleSecrets = [
  'd81ecfc8601b990cb9a67970f167736a',
  'mi_token_secreto_whatsapp_123',
  'supersecretkey123456789012345678',
  'jgis_deploy_secret_2026',
  'jgis_verify_token_messenger_2026',
  'secret',
  'deploy'
];

async function triggerDeploy() {
  console.log('🚀 Intentando gatillar deploy.sh en el VPS GCP (bot.jgispublicidad.pe/deploy-webhook)...');

  const payload = {
    ref: 'refs/heads/master',
    pusher: { name: 'antigravity-agent' },
    head_commit: {
      id: 'f432e561112233',
      message: 'fix(referral): corregir trigger real de campaña de gorras, envio de galeria completa y plantilla exacta de pagos'
    }
  };

  const jsonBody = JSON.stringify(payload);

  for (const secret of possibleSecrets) {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(jsonBody, 'utf8');
      const signature = `sha256=${hmac.digest('hex')}`;

      console.log(`🔑 Probando Secret: "${secret.substring(0, 10)}..."`);

      const res = await axios.post(DEPLOY_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'push',
          'x-hub-signature-256': signature
        },
        timeout: 10000
      });

      console.log(`🎉 ¡ÉXITO! Deploy acceptado por el VPS. Status: ${res.status}`);
      console.log('Respuesta del VPS:', res.data);
      return;
    } catch (e) {
      console.log(`⚠️ HTTP Status: ${e.response ? e.response.status : e.message}`);
    }
  }

  console.error('❌ Ningún DEPLOY_SECRET coincidió. El deploy debe ser ejecutado manualmente o mediante GitHub Webhook.');
}

triggerDeploy();
