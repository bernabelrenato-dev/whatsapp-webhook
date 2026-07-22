require('dotenv').config();
const axios = require('axios');

async function testChatwootDirect() {
  console.log('🤖 =========================================================================');
  console.log('🔍 PROBANDO CONEXIÓN DIRECTA A API DE CHATWOOT Y ASIGNACIÓN DE AGENTE');
  console.log('🤖 =========================================================================\n');

  const apiUrl = process.env.CHATWOOT_API_URL || 'http://chatwoot-web:3000';
  const accountId = process.env.CHATWOOT_ACCOUNT_ID || '1';
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const inboxId = parseInt(process.env.CHATWOOT_INBOX_ID || '1');

  console.log(`📌 API URL   : ${apiUrl}`);
  console.log(`📌 Account ID: ${accountId}`);
  console.log(`📌 Inbox ID  : ${inboxId}`);
  console.log(`📌 Token     : ${token ? token.substring(0, 10) + '...' : 'SIN TOKEN'}`);

  const headers = {
    'api_access_token': token,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Obtener lista de agentes para saber el assignee_id de Renatogod / Admin
    const agentsRes = await axios.get(`${apiUrl}/api/v1/accounts/${accountId}/agents`, { headers });
    console.log('\n👥 AGENTES REGISTRADOS EN CHATWOOT:');
    const agents = agentsRes.data || [];
    agents.forEach(a => {
      console.log(`   - ID: ${a.id} | Nombre: ${a.name} | Email: ${a.email} | Role: ${a.role}`);
    });

    const primaryAgentId = agents.length > 0 ? agents[0].id : 1;
    console.log(`\n🎯 Agente primario seleccionado para auto-asignación: ID ${primaryAgentId}`);

    // 2. Crear contacto de prueba
    const phone = '+519' + String(Date.now()).slice(-8);
    const contactRes = await axios.post(
      `${apiUrl}/api/v1/accounts/${accountId}/contacts`,
      { inbox_id: inboxId, name: 'Prueba Diagnóstico Chatwoot', phone_number: phone },
      { headers }
    );
    const contactId = contactRes.data.payload.contact.id;
    console.log(`\n✅ Contacto creado: ID ${contactId} (${phone})`);

    // 3. Crear conversación con auto-asignación a Renatogod
    const convRes = await axios.post(
      `${apiUrl}/api/v1/accounts/${accountId}/conversations`,
      { inbox_id: inboxId, contact_id: contactId, assignee_id: primaryAgentId },
      { headers }
    );
    const conversationId = convRes.data.id;
    console.log(`✅ Conversación creada y auto-asignada al Agente ID ${primaryAgentId}: Conversación #${conversationId}`);

    // 4. Enviar mensaje entrante de prueba
    const msgRes = await axios.post(
      `${apiUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
      { content: '👋 ¡Hola! Mensaje de prueba entrante de WhatsApp para la bandeja principal.', message_type: 'incoming' },
      { headers }
    );
    console.log(`✅ Mensaje enviado a Chatwoot correctamente: ID ${msgRes.data.id}`);
    console.log('\n🎉 =========================================================================');
    console.log('✅ CHATWOOT RESPONDIENDO 100% PERFECTO Y AUTO-ASIGNANDO A BANDEJA PRINCIPAL');
    console.log('🎉 =========================================================================\n');
  } catch (err) {
    console.error('❌ Error en prueba Chatwoot:', err.response ? JSON.stringify(err.response.data) : err.message);
  }
}

testChatwootDirect();
