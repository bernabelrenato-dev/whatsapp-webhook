const axios = require('axios');
const pool = require('../src/utils/db');

const typebotId = 'jgis-publicidad-bot-f33vo50';
const typebotUrl = 'http://typebot-viewer:3000';

async function testCombination(name, events, edges, groups) {
  console.log(`\n=========================================================`);
  console.log(`🔍 PROBANDO COMBINACIÓN: ${name}`);
  console.log(`=========================================================`);

  await pool.query(`UPDATE "Typebot" SET events = $1, edges = $2, groups = $3, "updatedAt" = NOW() WHERE id = $4`, [JSON.stringify(events), JSON.stringify(edges), JSON.stringify(groups), typebotId]);
  await pool.query(`UPDATE "PublicTypebot" SET events = $1, edges = $2, groups = $3, "updatedAt" = NOW() WHERE id = $4`, [JSON.stringify(events), JSON.stringify(edges), JSON.stringify(groups), typebotId]);

  try {
    const res = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, { isSimulated: false });
    console.log('  -> Status:', res.status);
    console.log('  -> Session ID:', res.data.sessionId);
    console.log('  -> Messages count:', res.data.messages ? res.data.messages.length : 0);
    console.log('  -> Input:', JSON.stringify(res.data.input));

    if (res.data.messages && res.data.messages.length > 0) {
      console.log('\n🎉🎉🎉 ¡¡¡ÉXITO TOTAL Y DEFINITIVO!!! MENSAJES DEVUELTOS:');
      console.log(JSON.stringify(res.data.messages, null, 2));
      return true;
    }
  } catch (e) {
    console.log('  ❌ Error:', e.response ? JSON.stringify(e.response.data) : e.message);
  }
  return false;
}

async function runLoop() {
  const group1 = {
    id: 'group_apertura',
    title: '1️⃣ Apertura',
    graphCoordinates: { x: 300, y: 0 },
    blocks: [
      {
        id: 'b_saludo',
        type: 'text',
        content: {
          richText: [
            { type: 'p', children: [{ text: '👋 ¡Hola! Soy Renato, asesor de JGIS 🧢' }] }
          ]
        }
      },
      {
        id: 'b_input_uso',
        type: 'choice input',
        items: [
          { id: 'opt_uso_personal', content: '🙋‍♂️ Uso Personal' },
          { id: 'opt_uso_empresa', content: '🏢 Empresa / Evento' }
        ],
        options: { isMultipleChoice: false }
      }
    ]
  };

  // Combo A: event.id = 'event_start', edge.from.eventId = 'event_start', edge.to.groupId = 'group_apertura'
  if (await testCombination(
    'A. eventId -> groupId',
    [{ id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } }],
    [{ id: 'edge_start', from: { eventId: 'event_start' }, to: { groupId: 'group_apertura' } }],
    [group1]
  )) return;

  // Combo B: event.id = 'event_start', edge.from.eventId = 'event_start', edge.to.blockId = 'b_saludo', edge.to.groupId = 'group_apertura'
  if (await testCombination(
    'B. eventId -> blockId + groupId',
    [{ id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } }],
    [{ id: 'edge_start', from: { eventId: 'event_start' }, to: { blockId: 'b_saludo', groupId: 'group_apertura' } }],
    [group1]
  )) return;

  // Combo C: Start Event block INSIDE group_apertura as block #0
  const groupWithStartBlock = {
    id: 'group_apertura',
    title: '1️⃣ Apertura',
    graphCoordinates: { x: 300, y: 0 },
    blocks: [
      { id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } },
      group1.blocks[0],
      group1.blocks[1]
    ]
  };
  if (await testCombination(
    'C. Start Event inside Group.blocks',
    [{ id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } }],
    [{ id: 'edge_start', from: { eventId: 'event_start' }, to: { blockId: 'b_saludo', groupId: 'group_apertura' } }],
    [groupWithStartBlock]
  )) return;

  // Combo D: Start Event inside Group.blocks con edge from blockId 'event_start' -> blockId 'b_saludo'
  if (await testCombination(
    'D. Start Event inside Group.blocks con edge blockId->blockId',
    [{ id: 'event_start', type: 'start', graphCoordinates: { x: 0, y: 0 } }],
    [{ id: 'edge_start', from: { blockId: 'event_start' }, to: { blockId: 'b_saludo', groupId: 'group_apertura' } }],
    [groupWithStartBlock]
  )) return;

  console.log('⚠️ Bucle finalizado sin retorno directo de mensajes en combo A-D.');
}

runLoop();
