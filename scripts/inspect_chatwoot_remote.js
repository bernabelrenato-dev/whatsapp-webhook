const axios = require('axios');
const config = require('../src/config/environment');

async function inspectChatwoot() {
  try {
    console.log('🔍 Inspeccionando las conversaciones y mensajes reales dentro de Chatwoot...');
    const convUrl = `${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations`;
    const res = await axios.get(convUrl, {
      headers: { 'api_access_token': config.CHATWOOT_ACCESS_TOKEN }
    });

    const convs = res.data?.data?.payload || [];
    console.log(`📌 Se encontraron ${convs.length} conversaciones en Chatwoot.`);

    for (const c of convs.slice(0, 3)) {
      console.log(`\n==================================================`);
      console.log(`💬 Conversación ID: ${c.id} | Cliente: ${c.meta?.sender?.name} (${c.meta?.sender?.phone_number || 'Sin telf'}) | Estado: ${c.status}`);
      console.log(`==================================================`);

      const msgUrl = `${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${c.id}/messages`;
      const msgRes = await axios.get(msgUrl, {
        headers: { 'api_access_token': config.CHATWOOT_ACCESS_TOKEN }
      });

      const msgs = msgRes.data?.payload || [];
      console.log(`📩 Total de mensajes en la conversación ${c.id}: ${msgs.length}`);

      msgs.slice(-20).forEach((m, idx) => {
        const textSnippet = m.content ? m.content.substring(0, 60).replace(/\n/g, ' ') : '[Multimedia/Attachment]';
        const isPrivate = m.private ? '🔒 (Nota Privada)' : '🌐 (Público)';
        console.log(`  [${idx + 1}] ID: ${m.id} | Tipo: ${m.message_type} ${isPrivate} -> "${textSnippet}"`);
      });
    }
  } catch (error) {
    console.error('❌ Error inspeccionando Chatwoot API:', error.message);
  }
}

inspectChatwoot();
