const axios = require('axios');
const pool = require('../src/utils/db');

const typebotId = 'jgis-publicidad-bot-f33vo50';
const typebotUrl = 'http://typebot-viewer:3000';

async function testEdgeTarget(name, edgeTo) {
  console.log(`\n---------------------------------------------------------`);
  console.log(`🧪 PROBANDO EDGE START TARGET: ${name}`);
  console.log(`---------------------------------------------------------`);

  const events = [{ id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } }];
  const groups = [
    {
      id: 'group_apertura',
      title: 'Apertura',
      graphCoordinates: { x: 300, y: 0 },
      blocks: [
        {
          id: 'b_saludo_apertura',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '👋 ¡Hola! Soy Renato, asesor de JGIS 🧢' }] }
            ]
          }
        }
      ]
    }
  ];

  const edges = [
    {
      id: 'edge_start',
      from: { eventId: 'event_start' },
      to: edgeTo
    }
  ];

  await pool.query(`UPDATE "Typebot" SET events = $1, edges = $2, groups = $3, "updatedAt" = NOW() WHERE id = $4`, [JSON.stringify(events), JSON.stringify(edges), JSON.stringify(groups), typebotId]);
  await pool.query(`UPDATE "PublicTypebot" SET events = $1, edges = $2, groups = $3, "updatedAt" = NOW() WHERE id = $4`, [JSON.stringify(events), JSON.stringify(edges), JSON.stringify(groups), typebotId]);

  try {
    const res = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, { isSimulated: false });
    console.log('STATUS:', res.status);
    console.log('MESSAGES COUNT:', res.data.messages ? res.data.messages.length : 0);
    console.log('RESPONSE:', JSON.stringify(res.data, null, 2));
    if (res.data.messages && res.data.messages.length > 0) {
      console.log('🎉 ¡¡¡ÉXITO TOTAL!!! MENSAJES DEVUELTOS:');
      return true;
    }
  } catch (e) {
    console.log('ERROR:', e.response ? JSON.stringify(e.response.data) : e.message);
  }
  return false;
}

async function runEdgeTargetTests() {
  // Target 1: groupId
  await testEdgeTarget('1. to: { groupId: "group_apertura" }', { groupId: 'group_apertura' });

  // Target 2: blockId
  await testEdgeTarget('2. to: { blockId: "b_saludo_apertura" }', { blockId: 'b_saludo_apertura' });

  // Target 3: blockId + groupId
  await testEdgeTarget('3. to: { blockId: "b_saludo_apertura", groupId: "group_apertura" }', { blockId: 'b_saludo_apertura', groupId: 'group_apertura' });
}

runEdgeTargetTests();
