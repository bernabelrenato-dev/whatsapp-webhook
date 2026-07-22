const axios = require('axios');
const pool = require('../src/utils/db');

const typebotId = 'jgis-publicidad-bot-f33vo50';
const typebotUrl = 'http://typebot-viewer:3000';

async function testOutgoingEdgeId() {
  console.log('🤖 =========================================================================');
  console.log('🧪 PROBANDO SINTAXIS V6 CON outgoingEdgeId EN EVENTOS Y OPCIONES');
  console.log('🤖 =========================================================================\n');

  const events = [
    {
      id: 'event_start',
      type: 'start',
      graphCoordinates: { x: 0, y: 0 },
      outgoingEdgeId: 'edge_start_apertura'
    }
  ];

  const groups = [
    {
      id: 'group_apertura',
      title: '1️⃣ Apertura — Calificación Rápida',
      graphCoordinates: { x: 300, y: 0 },
      blocks: [
        {
          id: 'b_saludo_apertura',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '👋 ¡Hola! Soy Renato, asesor de JGIS 🧢' }] },
              { children: [{ text: 'Vi que te interesó nuestro producto 👀' }] },
              { children: [{ text: '\n¿Es para uso personal 🙋‍♂️ o para tu empresa/evento? 🏢' }] }
            ]
          }
        },
        {
          id: 'b_input_uso',
          type: 'choice input',
          items: [
            { id: 'opt_uso_personal', content: '🙋‍♂️ Uso Personal', outgoingEdgeId: 'edge_uso_personal_catalogo' },
            { id: 'opt_uso_empresa', content: '🏢 Empresa / Evento', outgoingEdgeId: 'edge_uso_empresa_catalogo' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_catalogo_cantidad',
      title: '2️⃣ Galería + Pregunta de Cantidad',
      graphCoordinates: { x: 700, y: 0 },
      blocks: [
        {
          id: 'b_galeria_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '😍 ¡Estas son nuestras gorras trucker personalizadas! 🧢📦' }] }
            ]
          }
        }
      ]
    }
  ];

  const edges = [
    {
      id: 'edge_start_apertura',
      from: { eventId: 'event_start' },
      to: { groupId: 'group_apertura' }
    },
    {
      id: 'edge_uso_personal_catalogo',
      from: { blockId: 'b_input_uso', itemId: 'opt_uso_personal' },
      to: { groupId: 'group_catalogo_cantidad' }
    },
    {
      id: 'edge_uso_empresa_catalogo',
      from: { blockId: 'b_input_uso', itemId: 'opt_uso_empresa' },
      to: { groupId: 'group_catalogo_cantidad' }
    }
  ];

  await pool.query(`UPDATE "Typebot" SET events = $1, edges = $2, groups = $3, "updatedAt" = NOW() WHERE id = $4`, [JSON.stringify(events), JSON.stringify(edges), JSON.stringify(groups), typebotId]);
  await pool.query(`UPDATE "PublicTypebot" SET events = $1, edges = $2, groups = $3, "updatedAt" = NOW() WHERE id = $4`, [JSON.stringify(events), JSON.stringify(edges), JSON.stringify(groups), typebotId]);

  try {
    const res = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, { isSimulated: false });
    console.log('STATUS:', res.status);
    console.log('SESSION ID:', res.data.sessionId);
    console.log('MESSAGES COUNT:', res.data.messages ? res.data.messages.length : 0);
    console.log('INPUT:', JSON.stringify(res.data.input));

    if (res.data.messages && res.data.messages.length > 0) {
      console.log('\n🎉🎉🎉 ¡¡¡ÉXITO TOTAL Y ABSOLUTO CON OUTGOINGEDGEID!!!');
      console.log(JSON.stringify(res.data.messages, null, 2));

      // Test continueChat
      const sessionId = res.data.sessionId;
      const contRes = await axios.post(`${typebotUrl}/api/v1/sessions/${sessionId}/continueChat`, {
        message: { type: 'text', text: '🙋‍♂️ Uso Personal' }
      });
      console.log('\nCONTINUE CHAT STATUS:', contRes.status);
      console.log('CONTINUE CHAT MESSAGES:', JSON.stringify(contRes.data.messages, null, 2));
    }
  } catch (e) {
    console.log('ERROR:', e.response ? JSON.stringify(e.response.data) : e.message);
  }
}

testOutgoingEdgeId();
