const axios = require('axios');
const pool = require('../src/utils/db');

const typebotId = 'jgis-publicidad-bot-f33vo50';
const typebotUrl = 'http://typebot-viewer:3000';

async function testEventStart(name, eventObj, edgeFrom) {
  console.log(`\n---------------------------------------------------------`);
  console.log(`🧪 PROBANDO EVENT START: ${name}`);
  console.log(`---------------------------------------------------------`);

  const events = [eventObj];
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
      from: edgeFrom,
      to: { groupId: 'group_apertura' }
    }
  ];

  await pool.query(`UPDATE "Typebot" SET events = $1, edges = $2, groups = $3, "updatedAt" = NOW() WHERE id = $4`, [JSON.stringify(events), JSON.stringify(edges), JSON.stringify(groups), typebotId]);
  await pool.query(`UPDATE "PublicTypebot" SET events = $1, edges = $2, groups = $3, "updatedAt" = NOW() WHERE id = $4`, [JSON.stringify(events), JSON.stringify(edges), JSON.stringify(groups), typebotId]);

  try {
    const res = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, { isSimulated: false });
    console.log('STATUS:', res.status);
    console.log('MESSAGES COUNT:', res.data.messages ? res.data.messages.length : 0);
    if (res.data.messages && res.data.messages.length > 0) {
      console.log('🎉 ¡¡¡ÉXITO DEFINITIVO!!! MENSAJES DEVUELTOS:');
      console.log(JSON.stringify(res.data.messages, null, 2));
      return true;
    }
  } catch (e) {
    console.log('ERROR:', e.response ? JSON.stringify(e.response.data) : e.message);
  }
  return false;
}

async function runAllEventTests() {
  // 1. event con type 'start' y eventId
  await testEventStart(
    '1. type: start, from.eventId',
    { id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } },
    { eventId: 'event_start' }
  );

  // 2. event con type 'start' y blockId
  await testEventStart(
    '2. type: start, from.blockId',
    { id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } },
    { blockId: 'event_start' }
  );

  // 3. event con type 'start' sin edges (el motor busca el evento de inicio)
  await testEventStart(
    '3. type: start sin edge',
    { id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } },
    { eventId: 'event_start' }
  );
}

runAllEventTests();
