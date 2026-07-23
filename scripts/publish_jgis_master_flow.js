const pool = require('../src/utils/db');
const fs = require('fs');
const path = require('path');

async function publishMasterFlow() {
  console.log('🤖 =========================================================================');
  console.log('⚡ PUBLICANDO FLUJO MAESTRO MULTICANAL - JGIS PUBLICIDAD (TYPEBOT V6)');
  console.log('🤖 =========================================================================\n');

  const imagesDir = path.join(__dirname, '..', 'src', 'public', 'images');
  const capFiles = fs.existsSync(imagesDir)
    ? fs.readdirSync(imagesDir).filter(f => f.startsWith('gorra_') && (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'))).sort()
    : ['gorra_01.jpg', 'gorra_02.jpg', 'gorra_03.jpg', 'gorra_04.jpg'];

  const masterCapImageBlocks = capFiles.map((f, i) => ({
    id: `b_trucker_img_${i + 1}`,
    type: 'image',
    content: { url: `https://bot.jgispublicidad.pe/images/${f}` }
  }));

  const typebotId = process.env.TYPEBOT_ID || 'jgis-publicidad-bot-f33vo50';
  const name = 'Flujo Maestro Omnicanal — JGIS Publicidad';

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
    // 1️⃣ APERTURA & MENÚ PRINCIPAL MULTICANAL
    // -----------------------------------------------------------------------
    {
      id: 'group_apertura',
      title: '1️⃣ Apertura & Menú Principal',
      graphCoordinates: { x: 300, y: 0 },
      blocks: [
        {
          id: 'b_saludo_apertura',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '👋 ¡Hola! Soy Renato, asesor comercial de *Corporación JGIS Publicidad* 🏬✨' }] },
              { children: [{ text: 'Somos especialistas en gorras personalizadas, merchandising y regalos corporativos a nivel nacional 🇵🇪' }] },
              { children: [{ text: '\n¿En qué te podemos ayudar el día de hoy? Selecciona una opción 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_menu_principal',
          type: 'choice input',
          items: [
            { id: 'opt_menu_trucker', content: '🧢 Gorras Trucker (Meta Ads)', outgoingEdgeId: 'edge_menu_to_trucker' },
            { id: 'opt_menu_catalogo', content: '📦 Catálogo Multicategoría', outgoingEdgeId: 'edge_menu_to_catalogo' },
            { id: 'opt_menu_b2b', content: '🏢 Cotización Corporativa B2B', outgoingEdgeId: 'edge_menu_to_b2b' },
            { id: 'opt_menu_pedidos', content: '🚚 Pedidos y Tienda', outgoingEdgeId: 'edge_menu_to_pedidos' },
            { id: 'opt_menu_asesor', content: '👩‍💼 Hablar con Asesor', outgoingEdgeId: 'edge_menu_to_handover' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 2️⃣ FLUJO 1: GORRAS TRUCKER (6 PASOS META ADS)
    // -----------------------------------------------------------------------
    {
      id: 'group_trucker_calificacion',
      title: '🧢 Gorras Trucker — Calificación',
      graphCoordinates: { x: 700, y: -400 },
      blocks: [
        {
          id: 'b_trucker_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🧢 ¡Excelente elección! Nuestras Gorras Trucker son nuestro producto estrella ⭐' }] },
              { children: [{ text: '¿La producción es para uso personal 🙋‍♂️ o para tu empresa/evento? 🏢' }] }
            ]
          }
        },
        {
          id: 'b_input_trucker_uso',
          type: 'choice input',
          items: [
            { id: 'opt_trucker_personal', content: '🙋‍♂️ Uso Personal', outgoingEdgeId: 'edge_trucker_to_galeria' },
            { id: 'opt_trucker_empresa', content: '🏢 Empresa / Evento', outgoingEdgeId: 'edge_trucker_to_galeria' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_trucker_galeria_cantidad',
      title: '🧢 Gorras Trucker — Galería & Cantidad',
      graphCoordinates: { x: 1100, y: -400 },
      blocks: [
        {
          id: 'b_trucker_galeria_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '😍 Mira algunos de nuestros modelos de Gorras Trucker personalizadas 🧢📦:' }] }
            ]
          }
        },
        ...masterCapImageBlocks,
        {
          id: 'b_trucker_pregunta_cant',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '¿Cuántas unidades necesitas cotizar? 🔢' }] }
            ]
          }
        },
        {
          id: 'b_input_trucker_cant',
          type: 'choice input',
          items: [
            { id: 'opt_tcant_1_5', content: '🧢 1 a 5 unidades', outgoingEdgeId: 'edge_tprecio_1_5' },
            { id: 'opt_tcant_6_12', content: '🧢 6 a 12 unidades', outgoingEdgeId: 'edge_tprecio_6_12' },
            { id: 'opt_tcant_13_50', content: '🧢 13 a 50 unidades', outgoingEdgeId: 'edge_tprecio_13_50' },
            { id: 'opt_tcant_51_499', content: '🧢 51 a 499 unidades', outgoingEdgeId: 'edge_tprecio_51_499' },
            { id: 'opt_tcant_500_1000', content: '🧢 500 a 1000 unidades', outgoingEdgeId: 'edge_tprecio_500_1000' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    // Precios Escala Trucker
    {
      id: 'group_tprecio_1_5',
      title: '🧢 Precio 1-5 Unds',
      graphCoordinates: { x: 1500, y: -600 },
      blocks: [
        {
          id: 'b_tp_1_5',
          type: 'text',
          outgoingEdgeId: 'edge_tp1_to_cierre',
          content: { richText: [{ children: [{ text: '🧢 Para *1 a 5 unidades* el precio es de *S/. 15.00 c/u* 💵\n\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú | 🏬 Recojo en tienda' }] }] }
        }
      ]
    },
    {
      id: 'group_tprecio_6_12',
      title: '🧢 Precio 6-12 Unds',
      graphCoordinates: { x: 1500, y: -500 },
      blocks: [
        {
          id: 'b_tp_6_12',
          type: 'text',
          outgoingEdgeId: 'edge_tp2_to_cierre',
          content: { richText: [{ children: [{ text: '🧢 Para *6 a 12 unidades* el precio por mayor es de *S/. 12.00 c/u* 💵\n\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú | 🏬 Recojo en tienda' }] }] }
        }
      ]
    },
    {
      id: 'group_tprecio_13_50',
      title: '🧢 Precio 13-50 Unds',
      graphCoordinates: { x: 1500, y: -400 },
      blocks: [
        {
          id: 'b_tp_13_50',
          type: 'text',
          outgoingEdgeId: 'edge_tp3_to_cierre',
          content: { richText: [{ children: [{ text: '🧢 Para *13 a 50 unidades* el precio por mayor es de *S/. 10.00 c/u* 💵\n\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú | 🏬 Recojo en tienda' }] }] }
        }
      ]
    },
    {
      id: 'group_tprecio_51_499',
      title: '🧢 Precio 51-499 Unds',
      graphCoordinates: { x: 1500, y: -300 },
      blocks: [
        {
          id: 'b_tp_51_499',
          type: 'text',
          outgoingEdgeId: 'edge_tp4_to_cierre',
          content: { richText: [{ children: [{ text: '🧢 Para *51 a 499 unidades* (Escala Corporativa) el precio es de *S/. 8.50 c/u* 💵\n\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú | 🏬 Recojo en tienda' }] }] }
        }
      ]
    },
    {
      id: 'group_tprecio_500_1000',
      title: '🧢 Precio 500-1000 Unds',
      graphCoordinates: { x: 1500, y: -200 },
      blocks: [
        {
          id: 'b_tp_500_1000',
          type: 'text',
          outgoingEdgeId: 'edge_tp5_to_cierre',
          content: { richText: [{ children: [{ text: '🧢 Para *500 a 1000 unidades* (Volumen Industrial) el precio es de *S/. 6.90 c/u* 💵\n\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú | 🏬 Recojo en tienda' }] }] }
        }
      ]
    },
    {
      id: 'group_trucker_cierre',
      title: '🧢 Gorras Trucker — Cierre',
      graphCoordinates: { x: 1900, y: -400 },
      blocks: [
        {
          id: 'b_trucker_cierre_msg',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '📦 ¿Prefieres envío a todo el Perú 🚚 o recojo en tienda 🏬?\nY para asegurar tu producción dentro de las 48 horas ⏰, ¿lo confirmamos hoy? ✅' }] }
            ]
          }
        },
        {
          id: 'b_input_trucker_cierre',
          type: 'choice input',
          items: [
            { id: 'opt_tc_envio', content: '🚚 Envío a Domicilio', outgoingEdgeId: 'edge_tc_to_pago' },
            { id: 'opt_tc_recojo', content: '🏬 Recojo en Tienda', outgoingEdgeId: 'edge_tc_to_pago' },
            { id: 'opt_tc_asesor', content: '👩‍💼 Hablar con Asesor', outgoingEdgeId: 'edge_tc_to_handover' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 3️⃣ FLUJO 2: CATÁLOGO MULTICATEGORÍA
    // -----------------------------------------------------------------------
    {
      id: 'group_catalogo_categorias',
      title: '📦 Catálogo — Selección de Categorías',
      graphCoordinates: { x: 700, y: 0 },
      blocks: [
        {
          id: 'b_cat_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '📦 Explora nuestro catálogo de más de 3,500 productos publicitarios 🎁✨' }] },
              { children: [{ text: '¿Qué categoría de productos deseas cotizar?' }] }
            ]
          }
        },
        {
          id: 'b_input_cat_opcion',
          type: 'choice input',
          items: [
            { id: 'opt_cat_tazas', content: '☕ Tazas, Tomatodos & Mugs', outgoingEdgeId: 'edge_cat_to_tazas' },
            { id: 'opt_cat_bolsas', content: '👜 Bolsas Ecológicas & Notex', outgoingEdgeId: 'edge_cat_to_bolsas' },
            { id: 'opt_cat_lapiceros', content: '🖊️ Lapiceros & Escritorio', outgoingEdgeId: 'edge_cat_to_lapiceros' },
            { id: 'opt_cat_regalos', content: '🎁 Kits Corporativos Premium', outgoingEdgeId: 'edge_cat_to_regalos' },
            { id: 'opt_cat_menu', content: '⬅️ Volver al Menú Principal', outgoingEdgeId: 'edge_cat_to_menu' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_cat_tazas',
      title: '☕ Tazas & Tomatodos',
      graphCoordinates: { x: 1100, y: -100 },
      blocks: [
        {
          id: 'b_tazas_msg',
          type: 'text',
          outgoingEdgeId: 'edge_tazas_to_handover',
          content: {
            richText: [
              { children: [{ text: '☕ *Tazas y Tomatodos Personalizados JGIS*\n\n• Taza Blanca 11oz sublimada (desde S/ 6.50 c/u por mayor)\n• Taza Mágica termosensible (desde S/ 11.00 c/u)\n• Tomatodos de Aluminio / Térmicos (desde S/ 14.00 c/u)\n\n👩‍💼 He derivado tu solicitud con un asesor comercial para darte la cotización exacta con tu logo vectorizado.' }] }
            ]
          }
        }
      ]
    },
    {
      id: 'group_cat_bolsas',
      title: '👜 Bolsas Ecológicas',
      graphCoordinates: { x: 1100, y: 50 },
      blocks: [
        {
          id: 'b_bolsas_msg',
          type: 'text',
          outgoingEdgeId: 'edge_bolsas_to_handover',
          content: {
            richText: [
              { children: [{ text: '👜 *Bolsas Ecológicas, Tocuyo y Notex JGIS*\n\n• Bolsas Notex estampadas (desde S/ 1.80 c/u por mayor)\n• Bolsas Tocuyo 100% Algodón (desde S/ 4.50 c/u)\n• Mochilas ejecutivas y cartucheras corporativas\n\n👩‍💼 Un asesor tomará tu mensaje para cotizar las medidas y colores exactos que necesitas.' }] }
            ]
          }
        }
      ]
    },
    {
      id: 'group_cat_lapiceros',
      title: '🖊️ Lapiceros & Escritorio',
      graphCoordinates: { x: 1100, y: 200 },
      blocks: [
        {
          id: 'b_lapiceros_msg',
          type: 'text',
          outgoingEdgeId: 'edge_lapiceros_to_handover',
          content: {
            richText: [
              { children: [{ text: '🖊️ *Lapiceros y Artículos de Escritorio JGIS*\n\n• Lapiceros plásticos corporativos (desde S/ 0.80 c/u por millar)\n• Lapiceros metálicos con grabado Láser (desde S/ 3.50 c/u)\n• Libretas y Agendas ejecutivas\n\n👩‍💼 Un asesor comercial te adjuntará la muestra digital con tu logo.' }] }
            ]
          }
        }
      ]
    },
    {
      id: 'group_cat_regalos',
      title: '🎁 Kits Corporativos',
      graphCoordinates: { x: 1100, y: 350 },
      blocks: [
        {
          id: 'b_regalos_msg',
          type: 'text',
          outgoingEdgeId: 'edge_regalos_to_handover',
          content: {
            richText: [
              { children: [{ text: '🎁 *Kits Corporativos & Merchandising Premium JGIS*\n\n• USBs publicitarios, Powerbanks y Pad Mouse\n• Kits de Bienvenida (Welcome Kits) personalizados\n• Trofeos y reconocimientos acrílicos/cristal\n\n👩‍💼 Te estamos transfiriendo con nuestro equipo ejecutivo para tu propuesta personalizada.' }] }
            ]
          }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 4️⃣ FLUJO 3: COTIZACIÓN B2B CORPORATIVA (FACTURACIÓN & RUC)
    // -----------------------------------------------------------------------
    {
      id: 'group_b2b_form',
      title: '🏢 Cotización Corporativa B2B',
      graphCoordinates: { x: 700, y: 400 },
      blocks: [
        {
          id: 'b_b2b_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🏢 *Atención Especial a Empresas y Compras Corporativas B2B* 🇵🇪' }] },
              { children: [{ text: 'Emitimos Factura / Boleta y ofrecemos atención personalizada para requerimientos de gran volumen.' }] },
              { children: [{ text: '\nPor favor, responde en un solo mensaje: *¿Nombre de tu Empresa o RUC?* 📝' }] }
            ]
          }
        },
        {
          id: 'b_b2b_cierre',
          type: 'text',
          outgoingEdgeId: 'edge_b2b_to_handover',
          content: {
            richText: [
              { children: [{ text: '🙌 ¡Muchas gracias! Tu requerimiento corporativo ha sido marcado como *Prioridad B2B*. Renato Bernabel o un ejecutivo sénior te asistirá de inmediato. 💼' }] }
            ]
          }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 5️⃣ FLUJO 4: PEDIDOS & UBICACIÓN DE TIENDA
    // -----------------------------------------------------------------------
    {
      id: 'group_pedidos_tienda',
      title: '🚚 Estado de Pedidos & Tienda',
      graphCoordinates: { x: 700, y: 700 },
      blocks: [
        {
          id: 'b_tienda_info',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '📍 *Ubicación de Tienda y Centro de Entregas JGIS*\n\n🏢 *Dirección:* Galería Centro Comercial Centro Lima, Sótano Pasaje "H", Stand 560 (Av. Bolivia / Jr. Camaná, Cercado de Lima).\n⏰ *Horario:* Lunes a Sábado de 9:00 AM a 7:00 PM.\n🚪 *Referencia:* Cerca de la Puerta 7 (Boulevard).\n\n🚚 *Envíos Nacionales:* Enviamos por Olva Courier, Shalom, Marvisur y agencias a todo el Perú.' }] }
            ]
          }
        },
        {
          id: 'b_input_pedidos_opcion',
          type: 'choice input',
          items: [
            { id: 'opt_ped_pago', content: '💳 Ver Datos de Pago', outgoingEdgeId: 'edge_pedidos_to_pago' },
            { id: 'opt_ped_estado', content: '📦 Consultar Mi Pedido', outgoingEdgeId: 'edge_pedidos_to_handover' },
            { id: 'opt_ped_menu', content: '⬅️ Volver al Menú', outgoingEdgeId: 'edge_pedidos_to_menu' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 6️⃣ DATOS DE PAGO Y RECEPCIÓN DE COMPROBANTE
    // -----------------------------------------------------------------------
    {
      id: 'group_datos_pago',
      title: '💳 Datos de Pago & Cuentas',
      graphCoordinates: { x: 1900, y: 0 },
      blocks: [
        {
          id: 'b_datos_pago_msg',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '💳 *Cuentas Oficiales de Corporación JGIS*\n\n🏦 *Banco BCP*\n👤 Titular: Corporación JGIS\n💰 Cuenta Corriente (Soles): *1912434894087*\n🔢 CCI: *00219100243489408755*\n\n📱 *Yape / Plin:* *969732451*\n\n💡 *Reserva:* Puedes separar la producción de tu pedido con el *50% de adelanto*.\n📍 *Dirección de Tienda:* Galería Centro Comercial Centro Lima, Sótano Pasaje "H", Stand 560.' }] }
            ]
          }
        },
        {
          id: 'b_input_pago_confirmacion',
          type: 'choice input',
          items: [
            { id: 'opt_pago_realizado', content: '✅ Ya aboné / Enviar voucher', outgoingEdgeId: 'edge_pago_to_produccion' },
            { id: 'opt_pago_asesor', content: '👩‍💼 Hablar con Asesor', outgoingEdgeId: 'edge_pago_to_handover' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 7️⃣ CONFIRMACIÓN DE PAGO & PASO A PRODUCCIÓN
    // -----------------------------------------------------------------------
    {
      id: 'group_confirmacion_produccion',
      title: '🏭 Confirmación de Pago & Producción',
      graphCoordinates: { x: 2300, y: 0 },
      blocks: [
        {
          id: 'b_confirmacion_produccion_msg',
          type: 'text',
          outgoingEdgeId: 'edge_produccion_to_handover',
          content: {
            richText: [
              { children: [{ text: '🎉 ¡Comprobante registrado e ingresado exitosamente! 🙌✨\n\n📌 *Estado de tu Pedido:* *EN PRODUCCIÓN 🏭*\n⏱️ *Tiempo estimado de fabricación:* 48 horas\n🚚 *Modalidad:* Según la opción que seleccionaste (Envío / Recojo)\n\n👩‍💼 Renato Bernabel o nuestro equipo de producción se pondrá en contacto contigo por este mismo chat para enviarte la muestra o vista previa digital antes del acabado final.\n\n¡Gracias por tu confianza y preferencia en Corporación JGIS Publicidad! 🧢📦' }] }
            ]
          }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 8️⃣ HANDOVER A CHATWOOT (ASESOR HUMANO)
    // -----------------------------------------------------------------------
    {
      id: 'group_handover_humano',
      title: '👩‍💼 Transferencia a Asesor Humano',
      graphCoordinates: { x: 2700, y: 0 },
      blocks: [
        {
          id: 'b_handover_msg',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '👩‍💼 ¡Perfecto! He transferido tu conversación con Renato Bernabel y nuestro equipo comercial de JGIS Publicidad. Te responderemos por aquí en breve. ¡Gracias por tu preferencia! 😊' }] }
            ]
          }
        }
      ]
    }
  ];

  const edges = [
    // Start -> Apertura
    { id: 'edge_start_apertura', from: { eventId: 'event_start' }, to: { groupId: 'group_apertura' } },

    // Menú Principal -> Ramas
    { id: 'edge_menu_to_trucker', from: { blockId: 'b_input_menu_principal', itemId: 'opt_menu_trucker' }, to: { groupId: 'group_trucker_calificacion' } },
    { id: 'edge_menu_to_catalogo', from: { blockId: 'b_input_menu_principal', itemId: 'opt_menu_catalogo' }, to: { groupId: 'group_catalogo_categorias' } },
    { id: 'edge_menu_to_b2b', from: { blockId: 'b_input_menu_principal', itemId: 'opt_menu_b2b' }, to: { groupId: 'group_b2b_form' } },
    { id: 'edge_menu_to_pedidos', from: { blockId: 'b_input_menu_principal', itemId: 'opt_menu_pedidos' }, to: { groupId: 'group_pedidos_tienda' } },
    { id: 'edge_menu_to_handover', from: { blockId: 'b_input_menu_principal', itemId: 'opt_menu_asesor' }, to: { groupId: 'group_handover_humano' } },

    // Trucker Flow Connections
    { id: 'edge_trucker_to_galeria', from: { blockId: 'b_input_trucker_uso', itemId: 'opt_trucker_personal' }, to: { groupId: 'group_trucker_galeria_cantidad' } },
    { id: 'edge_tprecio_1_5', from: { blockId: 'b_input_trucker_cant', itemId: 'opt_tcant_1_5' }, to: { groupId: 'group_tprecio_1_5' } },
    { id: 'edge_tprecio_6_12', from: { blockId: 'b_input_trucker_cant', itemId: 'opt_tcant_6_12' }, to: { groupId: 'group_tprecio_6_12' } },
    { id: 'edge_tprecio_13_50', from: { blockId: 'b_input_trucker_cant', itemId: 'opt_tcant_13_50' }, to: { groupId: 'group_tprecio_13_50' } },
    { id: 'edge_tprecio_51_499', from: { blockId: 'b_input_trucker_cant', itemId: 'opt_tcant_51_499' }, to: { groupId: 'group_tprecio_51_499' } },
    { id: 'edge_tprecio_500_1000', from: { blockId: 'b_input_trucker_cant', itemId: 'opt_tcant_500_1000' }, to: { groupId: 'group_tprecio_500_1000' } },

    { id: 'edge_tp1_to_cierre', from: { blockId: 'b_tp_1_5' }, to: { groupId: 'group_trucker_cierre' } },
    { id: 'edge_tp2_to_cierre', from: { blockId: 'b_tp_6_12' }, to: { groupId: 'group_trucker_cierre' } },
    { id: 'edge_tp3_to_cierre', from: { blockId: 'b_tp_13_50' }, to: { groupId: 'group_trucker_cierre' } },
    { id: 'edge_tp4_to_cierre', from: { blockId: 'b_tp_51_499' }, to: { groupId: 'group_trucker_cierre' } },
    { id: 'edge_tp5_to_cierre', from: { blockId: 'b_tp_500_1000' }, to: { groupId: 'group_trucker_cierre' } },

    { id: 'edge_tc_to_pago', from: { blockId: 'b_input_trucker_cierre', itemId: 'opt_tc_envio' }, to: { groupId: 'group_datos_pago' } },
    { id: 'edge_tc_to_handover', from: { blockId: 'b_input_trucker_cierre', itemId: 'opt_tc_asesor' }, to: { groupId: 'group_handover_humano' } },

    // Catálogo General Connections
    { id: 'edge_cat_to_tazas', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_tazas' }, to: { groupId: 'group_cat_tazas' } },
    { id: 'edge_cat_to_bolsas', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_bolsas' }, to: { groupId: 'group_cat_bolsas' } },
    { id: 'edge_cat_to_lapiceros', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_lapiceros' }, to: { groupId: 'group_cat_lapiceros' } },
    { id: 'edge_cat_to_regalos', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_regalos' }, to: { groupId: 'group_cat_regalos' } },
    { id: 'edge_cat_to_menu', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_menu' }, to: { groupId: 'group_apertura' } },

    { id: 'edge_tazas_to_handover', from: { blockId: 'b_tazas_msg' }, to: { groupId: 'group_handover_humano' } },
    { id: 'edge_bolsas_to_handover', from: { blockId: 'b_bolsas_msg' }, to: { groupId: 'group_handover_humano' } },
    { id: 'edge_lapiceros_to_handover', from: { blockId: 'b_lapiceros_msg' }, to: { groupId: 'group_handover_humano' } },
    { id: 'edge_regalos_to_handover', from: { blockId: 'b_regalos_msg' }, to: { groupId: 'group_handover_humano' } },

    // B2B Connections
    { id: 'edge_b2b_to_handover', from: { blockId: 'b_b2b_cierre' }, to: { groupId: 'group_handover_humano' } },

    // Pedidos Connections
    { id: 'edge_pedidos_to_pago', from: { blockId: 'b_input_pedidos_opcion', itemId: 'opt_ped_pago' }, to: { groupId: 'group_datos_pago' } },
    { id: 'edge_pedidos_to_handover', from: { blockId: 'b_input_pedidos_opcion', itemId: 'opt_ped_estado' }, to: { groupId: 'group_handover_humano' } },
    { id: 'edge_pedidos_to_menu', from: { blockId: 'b_input_pedidos_opcion', itemId: 'opt_ped_menu' }, to: { groupId: 'group_apertura' } },

    // Pago & Producción Connections
    { id: 'edge_pago_to_produccion', from: { blockId: 'b_input_pago_confirmacion', itemId: 'opt_pago_realizado' }, to: { groupId: 'group_confirmacion_produccion' } },
    { id: 'edge_pago_to_handover', from: { blockId: 'b_input_pago_confirmacion', itemId: 'opt_pago_asesor' }, to: { groupId: 'group_handover_humano' } },
    { id: 'edge_produccion_to_handover', from: { blockId: 'b_confirmacion_produccion_msg' }, to: { groupId: 'group_handover_humano' } }
  ];

  const variables = [
    { id: 'v_nombre', name: 'name' },
    { id: 'v_telefono', name: 'phone' }
  ];

  const theme = { general: { background: { type: 'Color', content: '#ffffff' } } };
  const settings = { typingEmulation: { speed: 40, enabled: true } };

  try {
    // Actualizar Typebot y PublicTypebot en PostgreSQL
    await pool.query(
      `UPDATE "Typebot" SET name = $1, groups = $2, events = $3, edges = $4, variables = $5, theme = $6, settings = $7, "updatedAt" = NOW(), version = '6', "publicId" = $8 WHERE id = $8;`,
      [name, JSON.stringify(groups), JSON.stringify(events), JSON.stringify(edges), JSON.stringify(variables), JSON.stringify(theme), JSON.stringify(settings), typebotId]
    );

    await pool.query(
      `UPDATE "PublicTypebot" SET groups = $1, events = $2, edges = $3, variables = $4, theme = $5, settings = $6, "updatedAt" = NOW(), version = '6' WHERE id = $7;`,
      [JSON.stringify(groups), JSON.stringify(events), JSON.stringify(edges), JSON.stringify(variables), JSON.stringify(theme), JSON.stringify(settings), typebotId]
    );

    console.log('🎉 =========================================================================');
    console.log('✅ ¡FLUJO MAESTRO MULTICANAL (TYPEBOT V6) PUBLICADO CON ÉXITO!');
    console.log('🎉 =========================================================================');
    console.log(`📌 Nombre del Flujo : ${name}`);
    console.log(`🔑 Typebot ID       : ${typebotId}`);
    console.log(`🔗 Editor UI        : https://bot.jgispublicidad.pe/typebots/${typebotId}/edit`);
    console.log('=========================================================================\n');
  } catch (err) {
    console.error('❌ Error al actualizar la base de datos PostgreSQL de Typebot:', err);
  } finally {
    process.exit(0);
  }
}

publishMasterFlow();
