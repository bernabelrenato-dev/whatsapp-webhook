const axios = require('axios');
const pool = require('../src/utils/db');

const typebotId = 'jgis-publicidad-bot-f33vo50';
const typebotUrl = 'http://typebot-viewer:3000';

async function testBlockFormat(name, groupBlocks) {
  console.log(`\n---------------------------------------------------------`);
  console.log(`🧪 PROBANDO FORMATO DE BLOQUES: ${name}`);
  console.log(`---------------------------------------------------------`);

  const groups = [
    {
      id: 'group_apertura',
      title: 'Apertura',
      graphCoordinates: { x: 0, y: 0 },
      blocks: groupBlocks
    }
  ];

  const events = [{ id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } }];
  const edges = [{ id: 'edge_start', from: { eventId: 'event_start' }, to: { groupId: 'group_apertura' } }];

  await pool.query(`UPDATE "Typebot" SET groups = $1, events = $2, edges = $3 WHERE id = $4`, [JSON.stringify(groups), JSON.stringify(events), JSON.stringify(edges), typebotId]);
  await pool.query(`UPDATE "PublicTypebot" SET groups = $1, events = $2, edges = $3 WHERE id = $4`, [JSON.stringify(groups), JSON.stringify(events), JSON.stringify(edges), typebotId]);

  try {
    const res = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, { isSimulated: false });
    console.log('STATUS:', res.status);
    console.log('MESSAGES COUNT:', res.data.messages ? res.data.messages.length : 0);
    if (res.data.messages && res.data.messages.length > 0) {
      console.log('🎉 ¡¡¡ÉXITO TOTAL!!! MENSAJES DEVUELTOS:');
      console.log(JSON.stringify(res.data.messages, null, 2));
      return true;
    }
  } catch (e) {
    console.log('ERROR:', e.response ? e.response.data : e.message);
  }
  return false;
}

async function runTests() {
  // Formato 1: richText con type "p"
  await testBlockFormat('1. richText con type p', [
    {
      id: 'b_msg1',
      type: 'text',
      content: {
        richText: [
          { type: 'p', children: [{ text: '👋 ¡Hola! Soy Renato, asesor de JGIS 🧢' }] }
        ]
      }
    }
  ]);

  // Formato 2: richText simple con children
  await testBlockFormat('2. richText simple children', [
    {
      id: 'b_msg1',
      type: 'text',
      content: {
        richText: [
          { children: [{ text: '👋 ¡Hola! Soy Renato, asesor de JGIS 🧢' }] }
        ]
      }
    }
  ]);

  // Formato 3: html / plain text fallback
  await testBlockFormat('3. text / html content', [
    {
      id: 'b_msg1',
      type: 'text',
      content: {
        html: '<p>👋 ¡Hola! Soy Renato, asesor de JGIS 🧢</p>'
      }
    }
  ]);
}

runTests();
