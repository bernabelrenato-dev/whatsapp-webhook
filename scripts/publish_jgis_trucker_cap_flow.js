const pool = require('../src/utils/db');

async function publishTruckerCapFlow() {
  console.log('🤖 =========================================================================');
  console.log('⚡ PUBLICANDO FLUJO OFICIAL DE VENTAS - GORRAS TRUCKER JGIS (6 PASOS)');
  console.log('🤖 =========================================================================\n');

  const typebotId = 'jgis-publicidad-bot-f33vo50';
  const name = 'Flujo de Ventas — Gorras Trucker JGIS (6 Pasos)';

  // Definición del Flujo Typebot v6 alineado 100% con las 6 etapas del prompt del usuario
  const flowObj = {
    version: '6',
    name,
    events: [
      {
        id: 'event_start',
        type: 'start',
        graphCoordinates: { x: 0, y: 0 }
      }
    ],
    groups: [
      // -----------------------------------------------------------------------
      // 1️⃣ APERTURA - Calificación rápida (Sin catálogo ni precios)
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
              { id: 'opt_uso_personal', content: '🙋‍♂️ Uso Personal' },
              { id: 'opt_uso_empresa', content: '🏢 Empresa / Evento' }
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

      // -----------------------------------------------------------------------
      // 3️⃣ PRECIO AJUSTADO SEGÚN CANTIDAD (Sin datos bancarios)
      // -----------------------------------------------------------------------
      {
        id: 'group_precio_1_5',
        title: '3️⃣ Precio (1 a 5 Unidades)',
        graphCoordinates: { x: 1100, y: -200 },
        blocks: [
          {
            id: 'b_precio_1_5',
            type: 'text',
            content: {
              richText: [
                { children: [{ text: '🧢 Para *1 a 5 unidades* el precio es de *S/. 15.00 c/u* 💵' }] },
                { children: [{ text: '\n⏱️ Tiempo de producción: 48 horas' }] },
                { children: [{ text: '🚚 Envíos a todo el Perú' }] },
                { children: [{ text: '🏬 También puedes recoger en tienda' }] }
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
            content: {
              richText: [
                { children: [{ text: '🧢 Para *6 a 12 unidades* el precio promocional es de *S/. 12.00 c/u* 💵' }] },
                { children: [{ text: '\n⏱️ Tiempo de producción: 48 horas' }] },
                { children: [{ text: '🚚 Envíos a todo el Perú' }] },
                { children: [{ text: '🏬 También puedes recoger en tienda' }] }
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
            content: {
              richText: [
                { children: [{ text: '🧢 Para *13 a 50 unidades* el precio al por mayor es de *S/. 10.00 c/u* 💵' }] },
                { children: [{ text: '\n⏱️ Tiempo de producción: 48 horas' }] },
                { children: [{ text: '🚚 Envíos a todo el Perú' }] },
                { children: [{ text: '🏬 También puedes recoger en tienda' }] }
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
            content: {
              richText: [
                { children: [{ text: '🧢 Para *51 a 499 unidades* (Escala Corporativa) el precio es de *S/. 8.50 c/u* 💵' }] },
                { children: [{ text: '\n⏱️ Tiempo de producción: 48 horas' }] },
                { children: [{ text: '🚚 Envíos a todo el Perú' }] },
                { children: [{ text: '🏬 También puedes recoger en tienda' }] }
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
            content: {
              richText: [
                { children: [{ text: '🧢 Para *500 a 1000 unidades* (Volumen Industrial) el precio especial es de *S/. 6.90 c/u* 💵' }] },
                { children: [{ text: '\n⏱️ Tiempo de producción: 48 horas' }] },
                { children: [{ text: '🚚 Envíos a todo el Perú' }] },
                { children: [{ text: '🏬 También puedes recoger en tienda' }] }
              ]
            }
          }
        ]
      },

      // -----------------------------------------------------------------------
      // 4️⃣ CIERRE — PREGUNTA DE DECISIÓN
      // -----------------------------------------------------------------------
      {
        id: 'group_cierre_decision',
        title: '4️⃣ Cierre — Pregunta de Decisión',
        graphCoordinates: { x: 1500, y: 100 },
        blocks: [
          {
            id: 'b_pregunta_cierre',
            type: 'text',
            content: {
              richText: [
                { children: [{ text: '📦 ¿Prefieres envío a todo el Perú 🚚 o recojo en tienda 🏬?' }] },
                { children: [{ text: '\nY para asegurar tu producción dentro de las 48 horas ⏰,' }] },
                { children: [{ text: '¿lo confirmamos hoy? ✅' }] }
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

      // -----------------------------------------------------------------------
      // 5️⃣ DATOS DE PAGO — Solo si confirma
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
                { children: [{ text: '🙌 ¡Perfecto! Para separar tu pedido:' }] },
                { children: [{ text: '\n💳 *Datos de Pago*' }] },
                { children: [{ text: '🏦 Banco: *BCP*' }] },
                { children: [{ text: '👤 Titular: *Corporación JGIS*' }] },
                { children: [{ text: '💰 Cuenta Corriente en Soles: *1912434894087*' }] },
                { children: [{ text: '🔢 CCI: *00219100243489408755*' }] },
                { children: [{ text: '📱 Yape / Plin: *969732451*' }] },
                { children: [{ text: '👤 Titular: *Corporación JGIS*' }] },
                { children: [{ text: '\n💡 *Tip:* puedes reservar tu producción con el *50% de adelanto*, ya que la capacidad de producción en 48h es limitada 🔥' }] },
                { children: [{ text: '\n📍 *Dirección de Tienda:*' }] },
                { children: [{ text: '🏢 Galería Centro Comercial Centro Lima' }] },
                { children: [{ text: '🔻 Sótano – Pasaje "H", Stand 560' }] },
                { children: [{ text: '📌 Referencia: Cerca de la Puerta 7 (Boulevard)' }] }
              ]
            }
          }
        ]
      },

      // -----------------------------------------------------------------------
      // 6️⃣ HANDOVER A HUMANO - Escalamiento a asesor en vivo
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
                { children: [{ text: '👩‍💼 ¡Perfecto! He transferido tu conversación con Renato Bernabel y nuestro equipo comercial de JGIS.' }] },
                { children: [{ text: 'Un asesor humano continuará atendiendo tus consultas personalizadas de inmediato. 😊' }] }
              ]
            }
          }
        ]
      }
    ],

    variables: [
      { id: 'v_uso', name: 'Uso_Personal_o_Empresa' },
      { id: 'v_cantidad', name: 'Cantidad_Unidades' },
      { id: 'v_confirmacion', name: 'Confirmacion_Pedido' }
    ],

    edges: [
      // Inicio -> Apertura
      {
        id: 'edge_start_apertura',
        from: { eventId: 'event_start' },
        to: { groupId: 'group_apertura', blockId: 'b_saludo_apertura' }
      },

      // Apertura opciones -> Galería + Pregunta de cantidad
      {
        id: 'edge_uso_personal_catalogo',
        from: { blockId: 'b_input_uso', itemId: 'opt_uso_personal' },
        to: { groupId: 'group_catalogo_cantidad', blockId: 'b_galeria_intro' }
      },
      {
        id: 'edge_uso_empresa_catalogo',
        from: { blockId: 'b_input_uso', itemId: 'opt_uso_empresa' },
        to: { groupId: 'group_catalogo_cantidad', blockId: 'b_galeria_intro' }
      },

      // Cantidad opciones -> Escala de Precios
      {
        id: 'edge_cant_1_5',
        from: { blockId: 'b_input_cantidad', itemId: 'opt_cant_1_5' },
        to: { groupId: 'group_precio_1_5', blockId: 'b_precio_1_5' }
      },
      {
        id: 'edge_cant_6_12',
        from: { blockId: 'b_input_cantidad', itemId: 'opt_cant_6_12' },
        to: { groupId: 'group_precio_6_12', blockId: 'b_precio_6_12' }
      },
      {
        id: 'edge_cant_13_50',
        from: { blockId: 'b_input_cantidad', itemId: 'opt_cant_13_50' },
        to: { groupId: 'group_precio_13_50', blockId: 'b_precio_13_50' }
      },
      {
        id: 'edge_cant_51_499',
        from: { blockId: 'b_input_cantidad', itemId: 'opt_cant_51_499' },
        to: { groupId: 'group_precio_51_499', blockId: 'b_precio_51_499' }
      },
      {
        id: 'edge_cant_500_1000',
        from: { blockId: 'b_input_cantidad', itemId: 'opt_cant_500_1000' },
        to: { groupId: 'group_precio_500_1000', blockId: 'b_precio_500_1000' }
      },

      // Precios -> Cierre Pregunta de Decisión
      {
        id: 'edge_precio_1_5_cierre',
        from: { blockId: 'b_precio_1_5' },
        to: { groupId: 'group_cierre_decision', blockId: 'b_pregunta_cierre' }
      },
      {
        id: 'edge_precio_6_12_cierre',
        from: { blockId: 'b_precio_6_12' },
        to: { groupId: 'group_cierre_decision', blockId: 'b_pregunta_cierre' }
      },
      {
        id: 'edge_precio_13_50_cierre',
        from: { blockId: 'b_precio_13_50' },
        to: { groupId: 'group_cierre_decision', blockId: 'b_pregunta_cierre' }
      },
      {
        id: 'edge_precio_51_499_cierre',
        from: { blockId: 'b_precio_51_499' },
        to: { groupId: 'group_cierre_decision', blockId: 'b_pregunta_cierre' }
      },
      {
        id: 'edge_precio_500_1000_cierre',
        from: { blockId: 'b_precio_500_1000' },
        to: { groupId: 'group_cierre_decision', blockId: 'b_pregunta_cierre' }
      },

      // Cierre confirmación -> Datos de Pago o Handover
      {
        id: 'edge_confirma_envio_pago',
        from: { blockId: 'b_input_confirmacion', itemId: 'opt_confirma_envio' },
        to: { groupId: 'group_datos_pago', blockId: 'b_datos_bancarios' }
      },
      {
        id: 'edge_confirma_recojo_pago',
        from: { blockId: 'b_input_confirmacion', itemId: 'opt_confirma_recojo' },
        to: { groupId: 'group_datos_pago', blockId: 'b_datos_bancarios' }
      },
      {
        id: 'edge_hablar_asesor_handover',
        from: { blockId: 'b_input_confirmacion', itemId: 'opt_hablar_asesor' },
        to: { groupId: 'group_handover_humano', blockId: 'b_asesor_humano_msg' }
      }
    ]
  };

  const groups = JSON.stringify(flowObj.groups);
  const variables = JSON.stringify(flowObj.variables);
  const edges = JSON.stringify(flowObj.edges);
  const events = JSON.stringify(flowObj.events);
  const theme = JSON.stringify({ general: { background: { type: 'Color', content: '#ffffff' } } });
  const settings = JSON.stringify({ typingEmulation: { enabled: true, speed: 30 } });
  const now = new Date();

  try {
    const wsRes = await pool.query(`SELECT id FROM "Workspace" LIMIT 1;`);
    const workspaceId = wsRes.rows[0]?.id || 'workspace-jgis';

    // 1. Actualizar "Typebot"
    await pool.query(
      `INSERT INTO "Typebot" (id, name, groups, variables, edges, events, theme, settings, "publicId", "workspaceId", "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $1, $9, $10, $10, '6')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, groups = EXCLUDED.groups, variables = EXCLUDED.variables, edges = EXCLUDED.edges, events = EXCLUDED.events, "updatedAt" = EXCLUDED."updatedAt";`,
      [typebotId, name, groups, variables, edges, events, theme, settings, workspaceId, now]
    );

    // 2. Publicar en "PublicTypebot"
    await pool.query(
      `INSERT INTO "PublicTypebot" (id, "typebotId", groups, variables, edges, events, theme, settings, "createdAt", "updatedAt", version)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $8, '6')
       ON CONFLICT (id) DO UPDATE SET groups = EXCLUDED.groups, variables = EXCLUDED.variables, edges = EXCLUDED.edges, events = EXCLUDED.events, "updatedAt" = EXCLUDED."updatedAt";`,
      [typebotId, groups, variables, edges, events, theme, settings, now]
    );

    console.log('🎉 =========================================================================');
    console.log('✅ ¡FLUJO DE VENTAS DE GORRAS TRUCKER (6 PASOS) PUBLICADO CON ÉXITO!');
    console.log('🎉 =========================================================================');
    console.log(`📌 Nombre del Flujo : ${name}`);
    console.log(`🔑 Typebot ID       : ${typebotId}`);
    console.log(`🔗 Enlace Editor UI  : https://bot.jgispublicidad.pe/typebots/${typebotId}/edit`);
    console.log('=========================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al publicar el flujo de Gorras Trucker en Typebot:', err);
    process.exit(1);
  }
}

publishTruckerCapFlow();
