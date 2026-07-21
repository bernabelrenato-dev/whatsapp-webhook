require('dotenv').config();
const axios = require('axios');

const CHATWOOT_ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN || '4VvHvnfBsBZUPQNwkfnbZF2q';
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';
const workingUrl = 'http://34.69.161.101:3010';

async function createTestChats() {
  console.log(`🚀 Conectando a Chatwoot en ${workingUrl}...`);

  const headers = {
    'api_access_token': CHATWOOT_ACCESS_TOKEN,
    'Content-Type': 'application/json'
  };

  try {
    const res = await axios.get(`${workingUrl}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/inboxes`, { headers });
    const rawData = res.data;
    console.log('📦 Estructura devuelta por Chatwoot inboxes API:', JSON.stringify(rawData));
    let inboxes = Array.isArray(rawData) ? rawData : (rawData.payload || []);

    console.log(`📥 Bandejas encontradas (${inboxes.length}):`);
    inboxes.forEach(ib => console.log(`  - [ID: ${ib.id}] Nombre: "${ib.name}", Canal: ${ib.channel_type}`));

    let whatsappInbox = inboxes.find(ib => ib.channel_type === 'Channel::Whatsapp' || ib.channel_type === 'Channel::Api' || ib.name.toLowerCase().includes('whatsapp'));
    let messengerInbox = inboxes.find(ib => ib.channel_type === 'Channel::FacebookPage' || ib.channel_type === 'Channel::Facebook' || ib.name.toLowerCase().includes('corporación') || ib.name.toLowerCase().includes('meta'));

    if (!whatsappInbox && inboxes.length > 0) whatsappInbox = inboxes[0];
    if (!messengerInbox && inboxes.length > 1) messengerInbox = inboxes[1] || inboxes[0];

    console.log(`\n📌 Usando para WhatsApp: ${whatsappInbox ? whatsappInbox.name + ' (ID: ' + whatsappInbox.id + ')' : 'N/A'}`);
    console.log(`📌 Usando para Messenger: ${messengerInbox ? messengerInbox.name + ' (ID: ' + messengerInbox.id + ')' : 'N/A'}`);

    // 1. Crear contacto para WhatsApp
    let waContactId;
    try {
      const waRes = await axios.post(`${workingUrl}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts`, {
        name: 'Prueba WhatsApp (Cliente Test)',
        phone_number: '+51987654321'
      }, { headers });
      waContactId = waRes.data.payload ? waRes.data.payload.contact.id : waRes.data.id;
    } catch (e) {
      const searchRes = await axios.get(`${workingUrl}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=51987654321`, { headers });
      const found = searchRes.data.payload ? searchRes.data.payload[0] : searchRes.data[0];
      if (found) waContactId = found.id;
    }

    // 2. Crear contacto para Messenger
    let msgContactId;
    try {
      const msgRes = await axios.post(`${workingUrl}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts`, {
        name: 'Prueba Messenger (Cliente Test)',
        email: 'prueba.messenger@jgispublicidad.pe'
      }, { headers });
      msgContactId = msgRes.data.payload ? msgRes.data.payload.contact.id : msgRes.data.id;
    } catch (e) {
      const searchRes = await axios.get(`${workingUrl}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=prueba.messenger`, { headers });
      const found = searchRes.data.payload ? searchRes.data.payload[0] : searchRes.data[0];
      if (found) msgContactId = found.id;
    }

    // 3. Crear conversación en la bandeja WhatsApp
    if (whatsappInbox && waContactId) {
      const waConvRes = await axios.post(`${workingUrl}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, {
        source_id: `wa_test_${Date.now()}`,
        inbox_id: whatsappInbox.id,
        contact_id: waContactId
      }, { headers });
      const waConvId = waConvRes.data.id;

      await axios.post(`${workingUrl}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${waConvId}/messages`, {
        content: '¡Hola! Quisiera cotizar 100 gorras trucker personalizadas con el logo de mi empresa.',
        message_type: 'incoming'
      }, { headers });

      console.log(`\n✅ Chat de prueba CREADO en la Bandeja WhatsApp ("${whatsappInbox.name}"): Conversación #${waConvId}`);
    }

    // 4. Crear conversación en la bandeja Messenger
    if (messengerInbox && msgContactId) {
      const msgConvRes = await axios.post(`${workingUrl}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, {
        source_id: `msg_test_${Date.now()}`,
        inbox_id: messengerInbox.id,
        contact_id: msgContactId
      }, { headers });
      const msgConvId = msgConvRes.data.id;

      await axios.post(`${workingUrl}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${msgConvId}/messages`, {
        content: '¿Hacen envíos a todo el Perú y cuánto tardan las tazas publicitarias?',
        message_type: 'incoming'
      }, { headers });

      console.log(`✅ Chat de prueba CREADO en la Bandeja Messenger ("${messengerInbox.name}"): Conversación #${msgConvId}`);
    }

    console.log('\n🎉 Todos los chats de prueba han sido creados con éxito en Chatwoot.');
  } catch (err) {
    const errData = err.response ? err.response.data : err.message;
    console.error('❌ Error ejecutando creación de chats:', errData);
  }
}

createTestChats();
