const axios = require('axios');
const pool = require('../src/utils/db');

const typebotId = 'jgis-publicidad-bot-f33vo50';
const typebotUrl = 'http://typebot-viewer:3000';

async function testBlockType(name, blocks) {
  console.log(`\n=========================================================`);
  console.log(`🧪 PROBANDO TIPO DE BLOQUE: ${name}`);
  console.log(`=========================================================`);

  const groups = [
    {
      id: 'group_bienvenida',
      title: 'Bienvenida',
      graphPosition: { x: 0, y: 0 },
      blocks: blocks
    }
  ];

  await pool.query(`UPDATE "Typebot" SET events = NULL, edges = '[]'::jsonb, groups = $1, "updatedAt" = NOW() WHERE id = $2`, [JSON.stringify(groups), typebotId]);
  await pool.query(`UPDATE "PublicTypebot" SET events = NULL, edges = '[]'::jsonb, groups = $1, "updatedAt" = NOW() WHERE id = $2`, [JSON.stringify(groups), typebotId]);

  try {
    const res = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, { isSimulated: false });
    console.log('  -> Status:', res.status);
    console.log('  -> Messages count:', res.data.messages ? res.data.messages.length : 0);
    console.log('  -> Input:', JSON.stringify(res.data.input));

    if (res.data.messages && res.data.messages.length > 0) {
      console.log('\n🎉🎉🎉 ¡¡¡ÉXITO TOTAL DESCUBIERTO!!! MENSAJES DEVUELTOS:');
      console.log(JSON.stringify(res.data.messages, null, 2));
      return true;
    }
  } catch (e) {
    console.log('  ❌ Error:', e.response ? JSON.stringify(e.response.data) : e.message);
  }
  return false;
}

async function runBlockLoop() {
  // Test 1: Mismos bloques exactos que pub_ecd56eb52ac6744d (con text + text input)
  if (await testBlockType('1. Bloques exactos de pub_ecd56eb52ac6744d', [
    {
      id: 'b_welcome',
      type: 'text',
      content: {
        richText: [
          { children: [{ text: '👋 ¡Hola! Bienvenido a Corporación JGIS Publicidad.' }] }
        ]
      }
    },
    {
      id: 'b_ask_qty',
      type: 'text input',
      options: { labels: { placeholder: '¿Cuántas unidades necesitas?' }, variableId: 'v_cantidad' }
    }
  ])) return;

  // Test 2: Bloque de texto con richText simple + text input
  if (await testBlockType('2. Saludo Gorras Trucker + text input', [
    {
      id: 'b_welcome',
      type: 'text',
      content: {
        richText: [
          { children: [{ text: '👋 ¡Hola! Soy Renato, asesor de JGIS 🧢\n¿Es para uso personal 🙋‍♂️ o para tu empresa/evento? 🏢' }] }
        ]
      }
    },
    {
      id: 'b_ask_uso',
      type: 'text input',
      options: { labels: { placeholder: 'Escribe tu respuesta aquí' }, variableId: 'v_uso' }
    }
  ])) return;
}

runBlockLoop();
