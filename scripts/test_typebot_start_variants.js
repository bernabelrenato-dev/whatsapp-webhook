const axios = require('axios');
const pool = require('../src/utils/db');

const typebotId = 'jgis-publicidad-bot-f33vo50';
const typebotUrl = process.env.TYPEBOT_API_URL || 'http://typebot-viewer:3000';

async function testVariant(variantName, events, edges, groups) {
  console.log(`\n---------------------------------------------------------`);
  console.log(`🧪 PROBANDO VARIANTE: ${variantName}`);
  console.log(`---------------------------------------------------------`);

  // 1. Guardar en Typebot y PublicTypebot
  await pool.query(
    `UPDATE "Typebot" SET events = $1, edges = $2, groups = $3, "updatedAt" = NOW() WHERE id = $4`,
    [JSON.stringify(events), JSON.stringify(edges), JSON.stringify(groups), typebotId]
  );
  await pool.query(
    `UPDATE "PublicTypebot" SET events = $1, edges = $2, groups = $3, "updatedAt" = NOW() WHERE id = $4`,
    [JSON.stringify(events), JSON.stringify(edges), JSON.stringify(groups), typebotId]
  );

  // 2. Probar startChat
  try {
    const res = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, {
      isSimulated: false
    });
    console.log(`   - Status: ${res.status}`);
    console.log(`   - Session ID: ${res.data.sessionId}`);
    console.log(`   - Messages count: ${res.data.messages ? res.data.messages.length : 0}`);
    if (res.data.messages && res.data.messages.length > 0) {
      console.log(`   🎉 ¡ÉXITO! Mensajes retornados:`, JSON.stringify(res.data.messages, null, 2));
      return true;
    }
  } catch (err) {
    console.log(`   ❌ Error en startChat:`, err.response ? err.response.data : err.message);
  }
  return false;
}

async function runAllVariants() {
  const baseGroups = [
    {
      id: 'group_apertura',
      title: 'Apertura',
      graphCoordinates: { x: 0, y: 0 },
      blocks: [
        {
          id: 'b_saludo',
          type: 'text',
          content: { richText: [{ children: [{ text: '👋 ¡Hola! Soy Renato, asesor de JGIS 🧢' }] }] }
        }
      ]
    }
  ];

  // Variante 1: Event start con edge.from.eventId = 'event_start' y edge.to.groupId = 'group_apertura'
  await testVariant(
    '1. Event Start -> Group',
    [{ id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } }],
    [{ id: 'edge_start', from: { eventId: 'event_start' }, to: { groupId: 'group_apertura' } }],
    baseGroups
  );

  // Variante 2: Event start con edge.from.eventId = 'event_start' y edge.to.blockId = 'b_saludo'
  await testVariant(
    '2. Event Start -> Block',
    [{ id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } }],
    [{ id: 'edge_start', from: { eventId: 'event_start' }, to: { blockId: 'b_saludo', groupId: 'group_apertura' } }],
    baseGroups
  );

  // Variante 3: Block de tipo 'start' dentro del primer grupo
  const groupsWithStartBlock = [
    {
      id: 'group_apertura',
      title: 'Apertura',
      graphCoordinates: { x: 0, y: 0 },
      blocks: [
        { id: 'b_start', type: 'start', label: 'Start' },
        {
          id: 'b_saludo',
          type: 'text',
          content: { richText: [{ children: [{ text: '👋 ¡Hola! Soy Renato, asesor de JGIS 🧢' }] }] }
        }
      ]
    }
  ];
  await testVariant(
    '3. Start Block inside Group -> Next Block',
    [],
    [{ id: 'edge_start', from: { blockId: 'b_start' }, to: { blockId: 'b_saludo' } }],
    groupsWithStartBlock
  );

  // Variante 4: Start Event con event.type = 'start' sin edges (directo a primer grupo)
  await testVariant(
    '4. Start Event sin edges',
    [{ id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } }],
    [],
    baseGroups
  );

  process.exit(0);
}

runAllVariants();
