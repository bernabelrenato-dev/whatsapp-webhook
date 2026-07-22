const pool = require('../src/utils/db');
const axios = require('axios');

async function publishTruckerCapFlow() {
  console.log('🤖 =========================================================================');
  console.log('⚡ PUBLICANDO FLUJO OFICIAL DE VENTAS - GORRAS TRUCKER JGIS (CON OUTGOINGEDGEID)');
  console.log('🤖 =========================================================================\n');

  const typebotId = 'jgis-publicidad-bot-f33vo50';
  const name = 'Flujo de Ventas — Gorras Trucker JGIS (6 Pasos)';

  const events = [
    {
      id: 'event_start',
      type: 'start',
      graphCoordinates: { x: 0, y: 0 },
      outgoingEdgeId: 'edge_start_apertura'
    }
  ];

  const groups = [
    // -----------------------------------------------------------------------
    // 1️⃣ APERTURA - Calificación rápida
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // 2️⃣ CATÁLOGO DIRIGIDO + PREGUNTA DE CANTIDAD
    // -----------------------------------------------------------------------
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
          id: 'b_img_2',
          type: 'image',
          content: { url: 'https://bot.jgispublicidad.pe/images/gorra_02.jpg' }
        },
        {
          id: 'b_img_3',
          type: 'image',
          content: { url: 'https://bot.jgispublicidad.pe/images/gorra_03.jpg' }
        },
        {
          id: 'b_img_4',
          type: 'image',
          content: { url: 'https://bot.jgispublicidad.pe/images/gorra_04.jpg' }
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
            { id: 'opt_cant_1_5', content: '🧢 1 a 5 unidades', outgoingEdgeId: 'edge_cant_1_5' },
            { id: 'opt_cant_6_12', content: '🧢 6 a 12 unidades', outgoingEdgeId: 'edge_cant_6_12' },
            { id: 'opt_cant_13_50', content: '🧢 13 a 50 unidades', outgoingEdgeId: 'edge_cant_13_50' },
            { id: 'opt_cant_51_499', content: '🧢 51 a 499 unidades', outgoingEdgeId: 'edge_cant_51_499' },
            { id: 'opt_cant_500_1000', content: '🧢 500 a 1000 unidades', outgoingEdgeId: 'edge_cant_500_1000' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 3️⃣ PRECIOS POR ESCALA (5 GRUPOS)
    // -----------------------------------------------------------------------
    {
      id: 'group_precio_1_5',
      title: '3️⃣ Precio (1 a 5 Unidades)',
      graphCoordinates: { x: 1100, y: -200 },
      blocks: [
        {
          id: 'b_precio_1_5',
          type: 'text',
          outgoingEdgeId: 'edge_precio_1_5_cierre',
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
      id: 'group_precio_6_12',
      title: '3️⃣ Precio (6 a 12 Unidades)',
      graphCoordinates: { x: 1100, y: -50 },
      blocks: [
        {
          id: 'b_precio_6_12',
          type: 'text',
          outgoingEdgeId: 'edge_precio_6_12_cierre',
          content: {
            richText: [
              { children: [{ text: '🧢 Para *6 a 12 unidades* el precio por mayor es de *S/. 12.00 c/u* 💵' }] },
              { children: [{ text: '\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú\n🏬 También puedes recoger en tienda' }] }
            ]
          }
        }
      ]
    },
    {
      id: 'group_precio_13_50',
      title: '3️⃣ Precio (13 a 50 Unidades)',
      graphCoordinates: { x: 1100, y: 100 },
      blocks: [
        {
          id: 'b_precio_13_50',
          type: 'text',
          outgoingEdgeId: 'edge_precio_13_50_cierre',
          content: {
            richText: [
              { children: [{ text: '🧢 Para *13 a 50 unidades* el precio por mayor es de *S/. 10.00 c/u* 💵' }] },
              { children: [{ text: '\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú\n🏬 También puedes recoger en tienda' }] }
            ]
          }
        }
      ]
    },
    {
      id: 'group_precio_51_499',
      title: '3️⃣ Precio (51 a 499 Unidades)',
      graphCoordinates: { x: 1100, y: 250 },
      blocks: [
        {
          id: 'b_precio_51_499',
          type: 'text',
          outgoingEdgeId: 'edge_precio_51_499_cierre',
          content: {
            richText: [
              { children: [{ text: '🧢 Para *51 a 499 unidades* (Escala Corporativa) el precio es de *S/. 8.50 c/u* 💵' }] },
              { children: [{ text: '\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú\n🏬 También puedes recoger en tienda' }] }
            ]
          }
        }
      ]
    },
    {
      id: 'group_precio_500_1000',
      title: '3️⃣ Precio (500 a 1000 Unidades)',
      graphCoordinates: { x: 1100, y: 400 },
      blocks: [
        {
          id: 'b_precio_500_1000',
          type: 'text',
          outgoingEdgeId: 'edge_precio_500_1000_cierre',
          content: {
            richText: [
              { children: [{ text: '🧢 Para *500 a 1000 unidades* (Volumen Industrial) el precio especial es de *S/. 6.90 c/u* 💵' }] },
              { children: [{ text: '\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú\n🏬 También puedes recoger en tienda' }] }
            ]
          }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 4️⃣ CIERRE - PREGUNTA DE DECISIÓN
    // -----------------------------------------------------------------------
    {
      id: 'group_cierre_decision',
      title: '4️⃣ Cierre — Pregunta de Decisión',
      graphCoordinates: { x: 1500, y: 0 },
      blocks: [
        {
          id: 'b_pregunta_cierre',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '📦 ¿Prefieres envío a todo el Perú 🚚 o recojo en tienda 🏬?\nY para asegurar tu producción dentro de las 48 horas ⏰, ¿lo confirmamos hoy? ✅' }] }
            ]
          }
        },
        {
          id: 'b_input_confirmacion',
          type: 'choice input',
          items: [
            { id: 'opt_confirma_envio', content: '🚚 Sí, confirmar con Envío a Domicilio', outgoingEdgeId: 'edge_confirma_envio_pago' },
            { id: 'opt_confirma_recojo', content: '🏬 Sí, confirmar con Recojo en Tienda', outgoingEdgeId: 'edge_confirma_recojo_pago' },
            { id: 'opt_hablar_asesor', content: '👩‍💼 Hablar con Asesor Humano', outgoingEdgeId: 'edge_hablar_asesor_handover' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 5️⃣ DATOS DE PAGO Y CONFIRMACIÓN
    // -----------------------------------------------------------------------
    {
      id: 'group_datos_pago',
      title: '5️⃣ Datos de Pago y Confirmación',
      graphCoordinates: { x: 1900, y: 0 },
      blocks: [
        {
          id: 'b_datos_bancarios',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🙌 ¡Perfecto! Para separar tu pedido:\n\n💳 *Datos de Pago*\n🏦 Banco: *BCP*\n👤 Titular: *Corporación JGIS*\n💰 Cuenta Corriente en Soles: *1912434894087*\n🔢 CCI: *00219100243489408755*\n📱 Yape / Plin: *969732451*\n\n💡 *Tip:* puedes reservar tu producción con el *50% de adelanto*.\n📍 *Dirección de Tienda:* Galería Centro Comercial Centro Lima, Sótano Pasaje "H", Stand 560.' }] }
            ]
          }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 6️⃣ HANDOVER A HUMANO
    // -----------------------------------------------------------------------
    {
      id: 'group_handover_humano',
      title: '6️⃣ Handover a Asesor Humano',
      graphCoordinates: { x: 1900, y: 300 },
      blocks: [
        {
          id: 'b_asesor_humano_msg',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '👩‍💼 ¡Perfecto! He transferido tu conversación con Renato Bernabel y nuestro equipo comercial de JGIS. Un asesor humano continuará atendiendo tus consultas de inmediato. 😊' }] }
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
    },
    {
      id: 'edge_cant_1_5',
      from: { blockId: 'b_input_cantidad', itemId: 'opt_cant_1_5' },
      to: { groupId: 'group_precio_1_5' }
    },
    {
      id: 'edge_cant_6_12',
      from: { blockId: 'b_input_cantidad', itemId: 'opt_cant_6_12' },
      to: { groupId: 'group_precio_6_12' }
    },
    {
      id: 'edge_cant_13_50',
      from: { blockId: 'b_input_cantidad', itemId: 'opt_cant_13_50' },
      to: { groupId: 'group_precio_13_50' }
    },
    {
      id: 'edge_cant_51_499',
      from: { blockId: 'b_input_cantidad', itemId: 'opt_cant_51_499' },
      to: { groupId: 'group_precio_51_499' }
    },
    {
      id: 'edge_cant_500_1000',
      from: { blockId: 'b_input_cantidad', itemId: 'opt_cant_500_1000' },
      to: { groupId: 'group_precio_500_1000' }
    },
    {
      id: 'edge_precio_1_5_cierre',
      from: { blockId: 'b_precio_1_5' },
      to: { groupId: 'group_cierre_decision' }
    },
    {
      id: 'edge_precio_6_12_cierre',
      from: { blockId: 'b_precio_6_12' },
      to: { groupId: 'group_cierre_decision' }
    },
    {
      id: 'edge_precio_13_50_cierre',
      from: { blockId: 'b_precio_13_50' },
      to: { groupId: 'group_cierre_decision' }
    },
    {
      id: 'edge_precio_51_499_cierre',
      from: { blockId: 'b_precio_51_499' },
      to: { groupId: 'group_cierre_decision' }
    },
    {
      id: 'edge_precio_500_1000_cierre',
      from: { blockId: 'b_precio_500_1000' },
      to: { groupId: 'group_cierre_decision' }
    },
    {
      id: 'edge_confirma_envio_pago',
      from: { blockId: 'b_input_confirmacion', itemId: 'opt_confirma_envio' },
      to: { groupId: 'group_datos_pago' }
    },
    {
      id: 'edge_confirma_recojo_pago',
      from: { blockId: 'b_input_confirmacion', itemId: 'opt_confirma_recojo' },
      to: { groupId: 'group_datos_pago' }
    },
    {
      id: 'edge_hablar_asesor_handover',
      from: { blockId: 'b_input_confirmacion', itemId: 'opt_hablar_asesor' },
      to: { groupId: 'group_handover_humano' }
    }
  ];

  const variables = [
    { id: 'v_nombre', name: 'name' },
    { id: 'v_telefono', name: 'phone' }
  ];

  const theme = { general: { background: { type: 'Color', content: '#ffffff' } } };
  const settings = { typingEmulation: { speed: 40, enabled: true } };

  // Update DB
  await pool.query(
    `UPDATE "Typebot" SET name = $1, groups = $2, events = $3, edges = $4, variables = $5, theme = $6, settings = $7, "updatedAt" = NOW(), version = '6', "publicId" = $8 WHERE id = $8;`,
    [name, JSON.stringify(groups), JSON.stringify(events), JSON.stringify(edges), JSON.stringify(variables), JSON.stringify(theme), JSON.stringify(settings), typebotId]
  );

  await pool.query(
    `UPDATE "PublicTypebot" SET groups = $1, events = $2, edges = $3, variables = $4, theme = $5, settings = $6, "updatedAt" = NOW(), version = '6' WHERE id = $7;`,
    [JSON.stringify(groups), JSON.stringify(events), JSON.stringify(edges), JSON.stringify(variables), JSON.stringify(theme), JSON.stringify(settings), typebotId]
  );

  console.log('🎉 =========================================================================');
  console.log('✅ ¡FLUJO DE VENTAS DE GORRAS TRUCKER (6 PASOS) PUBLICADO CON OUTGOINGEDGEID!');
  console.log('🎉 =========================================================================');
  console.log(`📌 Nombre del Flujo : ${name}`);
  console.log(`🔑 Typebot ID       : ${typebotId}`);
  console.log(`🔗 Enlace Editor UI  : https://bot.jgispublicidad.pe/typebots/${typebotId}/edit`);
  console.log('=========================================================================\n');
}

publishTruckerCapFlow();
