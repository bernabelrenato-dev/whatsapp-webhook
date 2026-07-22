const axios = require('axios');
const pool = require('../src/utils/db');

async function testWorkingSchema() {
  const typebotId = 'jgis-publicidad-bot-f33vo50';
  const typebotUrl = 'http://typebot-viewer:3000';

  console.log('🤖 =========================================================================');
  console.log('⚡ PUBLICANDO FLUJO CON ESQUEMA COMPATIBLE NATIVO TYPEBOT ENGINE');
  console.log('🤖 =========================================================================\n');

  const groups = [
    {
      id: 'group_apertura',
      title: '1️⃣ Apertura — Calificación Rápida',
      graphPosition: { x: 0, y: 0 },
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
            { id: 'opt_uso_personal', content: '🙋‍♂️ Uso Personal' },
            { id: 'opt_uso_empresa', content: '🏢 Empresa / Evento' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_catalogo_cantidad',
      title: '2️⃣ Galería + Pregunta de Cantidad',
      graphPosition: { x: 400, y: 0 },
      blocks: [
        {
          id: 'b_galeria_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '😍 ¡Estas son nuestras gorras trucker personalizadas! Te adjunto las fotos de nuestro catálogo 🧢📦:' }] }
            ]
          }
        },
        {
          id: 'b_img_1',
          type: 'image',
          content: { url: 'https://bot.jgispublicidad.pe/images/gorra_01.jpg' }
        },
        {
          id: 'b_pregunta_cantidad',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '¿Cuántas unidades tienes en mente? 🔢' }] }
            ]
          }
        },
        {
          id: 'b_input_cantidad',
          type: 'choice input',
          items: [
            { id: 'opt_cant_1_5', content: '🧢 1 a 5 unidades' },
            { id: 'opt_cant_6_12', content: '🧢 6 a 12 unidades' },
            { id: 'opt_cant_13_50', content: '🧢 13 a 50 unidades' },
            { id: 'opt_cant_51_499', content: '🧢 51 a 499 unidades' },
            { id: 'opt_cant_500_1000', content: '🧢 500 a 1000 unidades' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_precio_1_5',
      title: '3️⃣ Precio (1 a 5 Unidades)',
      graphPosition: { x: 800, y: -200 },
      blocks: [
        {
          id: 'b_precio_1_5',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🧢 Para *1 a 5 unidades* el precio por unidad es de *S/. 15.00 c/u* 💵' }] },
              { children: [{ text: '\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú\n🏬 También puedes recoger en tienda' }] }
            ]
          }
        }
      ]
    },
    {
      id: 'group_cierre_decision',
      title: '4️⃣ Cierre — Pregunta de Decisión',
      graphPosition: { x: 1200, y: 0 },
      blocks: [
        {
          id: 'b_pregunta_cierre',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '📦 ¿Prefieres envío a todo el Perú 🚚 o recojo en tienda 🏬?\nY para asegurar tu producción en 48h ⏰, ¿lo confirmamos hoy? ✅' }] }
            ]
          }
        },
        {
          id: 'b_input_confirmacion',
          type: 'choice input',
          items: [
            { id: 'opt_confirma_envio', content: '🚚 Sí, confirmar con Envío a Domicilio' },
            { id: 'opt_confirma_recojo', content: '🏬 Sí, confirmar con Recojo en Tienda' },
            { id: 'opt_hablar_asesor', content: '👩‍💼 Hablar con Asesor Humano' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_datos_pago',
      title: '5️⃣ Datos de Pago y Confirmación',
      graphPosition: { x: 1600, y: 0 },
      blocks: [
        {
          id: 'b_datos_bancarios',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🙌 ¡Perfecto! Para separar tu pedido:\n💳 *Datos de Pago*\n🏦 BCP Cta Cte: *1912434894087*\n🔢 CCI: *00219100243489408755*\n📱 Yape / Plin: *969732451*\n👤 Titular: Corporación JGIS' }] }
            ]
          }
        }
      ]
    }
  ];

  const edges = [
    {
      id: 'edge_uso_personal_catalogo',
      from: { blockId: 'b_input_uso', itemId: 'opt_uso_personal' },
      to: { groupId: 'group_catalogo_cantidad' }
    },
    {
      id: 'edge_uso_empresa_catalogo',
      from: { blockId: 'b_input_uso', itemId: 'opt_uso_empresa' },
      to: { groupId: 'group_catalogo_cantidad' }
    },
    {
      id: 'edge_cant_1_5',
      from: { blockId: 'b_input_cantidad', itemId: 'opt_cant_1_5' },
      to: { groupId: 'group_precio_1_5' }
    },
    {
      id: 'edge_precio_1_5_cierre',
      from: { blockId: 'b_precio_1_5' },
      to: { groupId: 'group_cierre_decision' }
    },
    {
      id: 'edge_confirma_envio_pago',
      from: { blockId: 'b_input_confirmacion', itemId: 'opt_confirma_envio' },
      to: { groupId: 'group_datos_pago' }
    }
  ];

  // Actualizar DB en PostgreSQL
  await pool.query(
    `UPDATE "Typebot" SET events = NULL, edges = $1, groups = $2, "updatedAt" = NOW() WHERE id = $3`,
    [JSON.stringify(edges), JSON.stringify(groups), typebotId]
  );
  await pool.query(
    `UPDATE "PublicTypebot" SET events = NULL, edges = $1, groups = $2, "updatedAt" = NOW() WHERE id = $3`,
    [JSON.stringify(edges), JSON.stringify(groups), typebotId]
  );

  console.log('✅ Base de Datos actualizada con esquema de `graphPosition` y `events: NULL`.');

  // Probar startChat y continueChat con Typebot Viewer
  console.log('\n🚀 Probando startChat con Typebot Viewer API...');
  const startRes = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, {
    isSimulated: false,
    prefilledVariables: { name: 'Cliente Test' }
  });

  console.log('STATUS startChat:', startRes.status);
  console.log('SESSION ID:', startRes.data.sessionId);
  console.log('MESSAGES:', JSON.stringify(startRes.data.messages, null, 2));

  if (startRes.data.messages && startRes.data.messages.length > 0) {
    const sessionId = startRes.data.sessionId;
    console.log(`\n🚀 Probando continueChat con session ${sessionId} enviando "🙋‍♂️ Uso Personal"...`);
    const contRes = await axios.post(`${typebotUrl}/api/v1/sessions/${sessionId}/continueChat`, {
      message: { type: 'text', text: '🙋‍♂️ Uso Personal' }
    });
    console.log('STATUS continueChat:', contRes.status);
    console.log('CONTINUE MESSAGES:', JSON.stringify(contRes.data.messages, null, 2));
  }
}

testWorkingSchema();
