require('dotenv').config();
const db = require('../src/utils/db');
const fs = require('fs');
const path = require('path');

async function publishMasterFlow() {
  console.log('🤖 =========================================================================');
  console.log('⚡ PUBLICANDO FLUJO MAESTRO MULTICANAL COMPLETO - JGIS PUBLICIDAD (TYPEBOT V6)');
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
            { id: 'opt_menu_pedidos', content: '🚚 Pedidos y Pasarela de Pago', outgoingEdgeId: 'edge_menu_to_pedidos' },
            { id: 'opt_menu_asesor', content: '👩‍💼 Hablar con Asesor', outgoingEdgeId: 'edge_menu_to_handover' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 2️⃣ GORRAS TRUCKER (CAMPAÑA META ADS)
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
          content: { richText: [{ children: [{ text: '🧢 Para *51 a 499 unidades* el precio super mayorista es de *S/. 7.50 c/u* 💵\n\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú | 🏬 Recojo en tienda' }] }] }
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
          content: { richText: [{ children: [{ text: '🧢 Para *500 a 1,000 unidades* el precio industrial por mayor es de *S/. 5.50 c/u* 💵\n\n⏱️ Tiempo de producción: 48 horas\n🚚 Envíos a todo el Perú | 🏬 Recojo en tienda' }] }] }
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
            { id: 'opt_tc_pago', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_tc_to_pago' },
            { id: 'opt_tc_recojo', content: '🏬 Recojo en Tienda', outgoingEdgeId: 'edge_tc_to_pago' },
            { id: 'opt_tc_asesor', content: '👩‍💼 Hablar con Asesor', outgoingEdgeId: 'edge_tc_to_handover' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 3️⃣ CATÁLOGO MULTICATEGORÍA CON MODELOS EXACTOS
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
              { children: [{ text: '📦 Explora nuestro catálogo de más de 15,000 variantes de merchandising 🎁✨' }] },
              { children: [{ text: 'Selecciona una categoría de productos para ver los modelos exactos 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_cat_opcion',
          type: 'choice input',
          items: [
            { id: 'opt_cat_lap_metal', content: '🖊️ Lapiceros Metálicos (Láser)', outgoingEdgeId: 'edge_cat_to_lap_metal' },
            { id: 'opt_cat_lap_plast', content: '🖊️ Lapiceros Plásticos (Publicitarios)', outgoingEdgeId: 'edge_cat_to_lap_plast' },
            { id: 'opt_cat_tazas', content: '☕ Mugs y Tazas Térmicas', outgoingEdgeId: 'edge_cat_to_tazas' },
            { id: 'opt_cat_tomatodos', content: '🍶 Tomatodos y Botellas', outgoingEdgeId: 'edge_cat_to_tomatodos' },
            { id: 'opt_cat_libretas', content: '📓 Libretas y Ecológicos', outgoingEdgeId: 'edge_cat_to_libretas' },
            { id: 'opt_cat_bolsas', content: '🎒 Bolsas Notex y Cambrell', outgoingEdgeId: 'edge_cat_to_bolsas' },
            { id: 'opt_cat_menu', content: '⬅️ Volver al Menú Principal', outgoingEdgeId: 'edge_cat_to_menu' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // CATEGORÍA 1: LAPICEROS METÁLICOS
    {
      id: 'group_cat_lap_metal',
      title: '🖊️ Lapiceros Metálicos — Modelos',
      graphCoordinates: { x: 1100, y: -100 },
      blocks: [
        {
          id: 'b_lap_metal_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🖊️ *Modelos Destacados de Lapiceros Metálicos JGIS*\nSelecciona un modelo para ver su foto real, precios por volumen y comprar 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_lap_metal_models',
          type: 'choice input',
          items: [
            { id: 'opt_lm_18', content: '🖊️ Modelo LM-18 (Lapicero Metal Grueso)', outgoingEdgeId: 'edge_lm18_to_detail' },
            { id: 'opt_lys_01', content: '🖊️ Modelo LYS-01 (Set Lapicero + Llavero)', outgoingEdgeId: 'edge_lys01_to_detail' },
            { id: 'opt_2086_r', content: '🖊️ Modelo 2086-R (Lapicero Executive)', outgoingEdgeId: 'edge_2086r_to_detail' },
            { id: 'opt_set_1', content: '🖊️ Modelo SET-1 (Set Libreta + Lapicero Metal)', outgoingEdgeId: 'edge_set1_to_detail' },
            { id: 'opt_cat_back1', content: '⬅️ Volver a Categorías', outgoingEdgeId: 'edge_lmb_to_cat' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // DETALLES MODELOS METÁLICOS
    {
      id: 'group_model_lm18',
      title: '🖊️ Detalle LM-18',
      graphCoordinates: { x: 1500, y: -300 },
      blocks: [
        { id: 'b_img_lm18', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/METAL.jpeg' } },
        {
          id: 'b_text_lm18',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🖊️ *LAPICERO METALICO GRUESO LM-18*\n• Grabado personalizado con tecnología Láser en metal\n• Presentación: Estuche / Caja ejecutiva opcional\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 50 unidades: S/ 4.50 c/u\n• 51 a 499 unidades: S/ 3.80 c/u\n• 500+ unidades: S/ 3.20 c/u\n\nℹ️ *Disponibilidad*: Confirmada por asesor comercial en tienda.' }] }
            ]
          }
        },
        {
          id: 'b_input_lm18_actions',
          type: 'choice input',
          items: [
            { id: 'opt_lm18_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_lm18_to_pago' },
            { id: 'opt_lm18_agent', content: '👩‍💼 Confirmar con Asesor', outgoingEdgeId: 'edge_lm18_to_handover' },
            { id: 'opt_lm18_back', content: '⬅️ Volver a Lapiceros Metal', outgoingEdgeId: 'edge_lm18_to_metal' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_lys01',
      title: '🖊️ Detalle LYS-01',
      graphCoordinates: { x: 1500, y: -150 },
      blocks: [
        { id: 'b_img_lys01', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/LYS-01.jpg' } },
        {
          id: 'b_text_lys01',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🖊️ *SET LAPICERO METALICO + LLAVERO LYS-01*\n• Incluye estuche regalo 16x9 cm + lapicero + llavero metal\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 50 unidades: S/ 7.00 c/u\n• 51 a 499 unidades: S/ 5.20 c/u\n• 500+ unidades: S/ 5.00 c/u\n\nℹ️ *Disponibilidad*: Confirmada por asesor comercial en tienda.' }] }
            ]
          }
        },
        {
          id: 'b_input_lys01_actions',
          type: 'choice input',
          items: [
            { id: 'opt_lys01_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_lys01_to_pago' },
            { id: 'opt_lys01_agent', content: '👩‍💼 Confirmar con Asesor', outgoingEdgeId: 'edge_lys01_to_handover' },
            { id: 'opt_lys01_back', content: '⬅️ Volver a Lapiceros Metal', outgoingEdgeId: 'edge_lys01_to_metal' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_2086r',
      title: '🖊️ Detalle 2086-R',
      graphCoordinates: { x: 1500, y: 0 },
      blocks: [
        { id: 'b_img_2086r', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/2086-R-RP-2351.jpeg' } },
        {
          id: 'b_text_2086r',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🖊️ *LAPICERO METALICO EXECUTIVE 2086-R*\n• Cuerpo metálico mate con acabados cromados\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 50 unidades: S/ 5.50 c/u\n• 51 a 499 unidades: S/ 4.20 c/u\n• 500+ unidades: S/ 3.90 c/u\n\nℹ️ *Disponibilidad*: Confirmada por asesor comercial en tienda.' }] }
            ]
          }
        },
        {
          id: 'b_input_2086r_actions',
          type: 'choice input',
          items: [
            { id: 'opt_2086r_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_2086r_to_pago' },
            { id: 'opt_2086r_agent', content: '👩‍💼 Confirmar con Asesor', outgoingEdgeId: 'edge_2086r_to_handover' },
            { id: 'opt_2086r_back', content: '⬅️ Volver a Lapiceros Metal', outgoingEdgeId: 'edge_2086r_to_metal' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_set1',
      title: '🖊️ Detalle SET-1',
      graphCoordinates: { x: 1500, y: 150 },
      blocks: [
        { id: 'b_img_set1', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/SET-1.jpg' } },
        {
          id: 'b_text_set1',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🖊️ *SET EJECUTIVO SET-1 (LIBRETA + LAPICERO METAL)*\n• Libreta de Corcho ecológico + Lapicero de metal grabado\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 50 unidades: S/ 16.00 c/u\n• 51 a 499 unidades: S/ 14.00 c/u\n• 500+ unidades: S/ 13.50 c/u\n\nℹ️ *Disponibilidad*: Confirmada por asesor comercial en tienda.' }] }
            ]
          }
        },
        {
          id: 'b_input_set1_actions',
          type: 'choice input',
          items: [
            { id: 'opt_set1_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_set1_to_pago' },
            { id: 'opt_set1_agent', content: '👩‍💼 Confirmar con Asesor', outgoingEdgeId: 'edge_set1_to_handover' },
            { id: 'opt_set1_back', content: '⬅️ Volver a Lapiceros Metal', outgoingEdgeId: 'edge_set1_to_metal' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // CATEGORÍA 2: LAPICEROS PLÁSTICOS
    {
      id: 'group_cat_lap_plast',
      title: '🖊️ Lapiceros Plásticos — Modelos',
      graphCoordinates: { x: 1100, y: 300 },
      blocks: [
        {
          id: 'b_lap_plast_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🖊️ *Modelos Destacados de Lapiceros Plásticos JGIS*\nImpresión serigrafía a full color. Selecciona tu modelo 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_lap_plast_models',
          type: 'choice input',
          items: [
            { id: 'opt_lp_3111', content: '🖊️ Modelo 3111 (Lapicero Plástico Click)', outgoingEdgeId: 'edge_lp3111_to_detail' },
            { id: 'opt_lp_3115', content: '🖊️ Modelo 3115 (Lapicero Plástico Grip)', outgoingEdgeId: 'edge_lp3115_to_detail' },
            { id: 'opt_cat_back2', content: '⬅️ Volver a Categorías', outgoingEdgeId: 'edge_lpb_to_cat' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_lp3111',
      title: '🖊️ Detalle Modelo 3111',
      graphCoordinates: { x: 1500, y: 300 },
      blocks: [
        { id: 'b_img_lp3111', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/3111.jpg' } },
        {
          id: 'b_text_lp3111',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🖊️ *LAPICERO PLASTICO MODELO 3111*\n• Cuerpo plástico liviano con pulsador. Tinta Azul.\n\n💰 *Escala de Precios (Sin IGV)*:\n• 100 unidades: S/ 0.27 c/u\n• 500+ unidades: S/ 0.25 c/u por millar\n\nℹ️ *Disponibilidad*: Confirmada por asesor comercial.' }] }
            ]
          }
        },
        {
          id: 'b_input_lp3111_actions',
          type: 'choice input',
          items: [
            { id: 'opt_lp3111_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_lp3111_to_pago' },
            { id: 'opt_lp3111_agent', content: '👩‍💼 Confirmar con Asesor', outgoingEdgeId: 'edge_lp3111_to_handover' },
            { id: 'opt_lp3111_back', content: '⬅️ Volver a Lapiceros Plásticos', outgoingEdgeId: 'edge_lp3111_to_plast' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_lp3115',
      title: '🖊️ Detalle Modelo 3115',
      graphCoordinates: { x: 1500, y: 450 },
      blocks: [
        { id: 'b_img_lp3115', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/3115.jpg' } },
        {
          id: 'b_text_lp3115',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🖊️ *LAPICERO PLASTICO MODELO 3115*\n• Empuñadura ergonómica de goma anti-deslizante. Tinta Azul.\n\n💰 *Escala de Precios (Sin IGV)*:\n• 100 unidades: S/ 0.27 c/u\n• 500+ unidades: S/ 0.25 c/u por millar\n\nℹ️ *Disponibilidad*: Confirmada por asesor comercial.' }] }
            ]
          }
        },
        {
          id: 'b_input_lp3115_actions',
          type: 'choice input',
          items: [
            { id: 'opt_lp3115_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_lp3115_to_pago' },
            { id: 'opt_lp3115_agent', content: '👩‍💼 Confirmar con Asesor', outgoingEdgeId: 'edge_lp3115_to_handover' },
            { id: 'opt_lp3115_back', content: '⬅️ Volver a Lapiceros Plásticos', outgoingEdgeId: 'edge_lp3115_to_plast' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // CATEGORÍA 3: MUGS TÉRMICOS DE ACERO (FILTRO DE 2 PASOS: CAPACIDAD -> DISEÑO/MODELO)
    {
      id: 'group_cat_tazas',
      title: '☕ Mugs Térmicos de Acero — Capacidad',
      graphCoordinates: { x: 1100, y: 600 },
      blocks: [
        {
          id: 'b_tazas_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '☕ *Mugs Térmicos de Acero Inoxidable JGIS*\nDoble pared insulada. Conserva la temperatura de tus bebidas por horas.\n\n¿Qué capacidad de mug buscas? Selecciona una opción 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_tazas_models',
          type: 'choice input',
          items: [
            { id: 'opt_mug_cap_chico', content: '🥤 Chico (380ml - 400ml)', outgoingEdgeId: 'edge_mug_to_cap_chico' },
            { id: 'opt_mug_cap_mediano', content: '☕ Mediano (500ml)', outgoingEdgeId: 'edge_mug_to_cap_mediano' },
            { id: 'opt_mug_cap_grande', content: '🍶 Grande (750ml)', outgoingEdgeId: 'edge_mug_to_cap_grande' },
            { id: 'opt_mug_cap_todos', content: '👀 No estoy seguro, muéstrame todos', outgoingEdgeId: 'edge_mug_to_all_models' },
            { id: 'opt_cat_back3', content: '⬅️ Volver a Categorías', outgoingEdgeId: 'edge_tzb_to_cat' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_mugs_cap_chico',
      title: '🥤 Mugs Térmicos Chicos (380ml - 400ml)',
      graphCoordinates: { x: 1400, y: 500 },
      blocks: [
        {
          id: 'b_mugs_chico_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🥤 *Modelos de Mugs Térmicos Chicos (380ml - 400ml)*\nSelecciona el modelo de tu preferencia 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_mugs_chico',
          type: 'choice input',
          items: [
            { id: 'opt_mug_7059', content: '☕ Jarro Mug Acero 7059 (400ml)', outgoingEdgeId: 'edge_mug7059_to_detail' },
            { id: 'opt_mug_ptkl360', content: '🥤 Tomatodo Acero PTKL360 (380ml)', outgoingEdgeId: 'edge_ptkl360_to_detail' },
            { id: 'opt_mugs_back_cap1', content: '⬅️ Volver a Selección de Capacidad', outgoingEdgeId: 'edge_chico_to_cap' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_mugs_cap_mediano',
      title: '☕ Mugs Térmicos Medianos (500ml)',
      graphCoordinates: { x: 1400, y: 650 },
      blocks: [
        {
          id: 'b_mugs_mediano_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '☕ *Modelos de Mugs Térmicos Medianos (500ml)*\nSelecciona el modelo de tu preferencia 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_mugs_mediano',
          type: 'choice input',
          items: [
            { id: 'opt_mug_tm075', content: '🔥 Thermo Mug TM075 / TM072 (500ml)', outgoingEdgeId: 'edge_tm075_to_detail' },
            { id: 'opt_mug_tm075_1', content: '✨ Thermo Mug Sublimar TM075-1 (500ml)', outgoingEdgeId: 'edge_tm075_1_to_detail' },
            { id: 'opt_mugs_back_cap2', content: '⬅️ Volver a Selección de Capacidad', outgoingEdgeId: 'edge_mediano_to_cap' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_mugs_cap_grande',
      title: '🍶 Mugs Térmicos Grandes (750ml)',
      graphCoordinates: { x: 1400, y: 800 },
      blocks: [
        {
          id: 'b_mugs_grande_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🍶 *Modelos de Mugs Térmicos / Tomatodos Grandes (750ml)*\nSelecciona el modelo de tu preferencia 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_mugs_grande',
          type: 'choice input',
          items: [
            { id: 'opt_mug_8091', content: '🍶 Tomatodo Acero Inoxidable 8091 (750ml)', outgoingEdgeId: 'edge_mug8091_to_detail' },
            { id: 'opt_mug_8077zn', content: '🛡️ Tomatodo Acero 8077ZN (750ml)', outgoingEdgeId: 'edge_mug8077zn_to_detail' },
            { id: 'opt_mugs_back_cap3', content: '⬅️ Volver a Selección de Capacidad', outgoingEdgeId: 'edge_grande_to_cap' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_mugs_all_models',
      title: '👀 Todos los Mugs Térmicos',
      graphCoordinates: { x: 1400, y: 950 },
      blocks: [
        {
          id: 'b_mugs_all_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '✨ *Catálogo Completo de Mugs Térmicos de Acero*\nElige tu modelo favorito para ver precios y fotos 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_mugs_all',
          type: 'choice input',
          items: [
            { id: 'opt_all_tm075', content: '🔥 Thermo Mug TM075 (500ml)', outgoingEdgeId: 'edge_tm075_to_detail' },
            { id: 'opt_all_7059', content: '☕ Jarro Mug Acero 7059 (400ml)', outgoingEdgeId: 'edge_mug7059_to_detail' },
            { id: 'opt_all_ptkl360', content: '🥤 Tomatodo Acero PTKL360 (380ml)', outgoingEdgeId: 'edge_ptkl360_to_detail' },
            { id: 'opt_all_8091', content: '🍶 Tomatodo Acero 8091 (750ml)', outgoingEdgeId: 'edge_mug8091_to_detail' },
            { id: 'opt_all_8077zn', content: '🛡️ Tomatodo Acero 8077ZN (750ml)', outgoingEdgeId: 'edge_mug8077zn_to_detail' },
            { id: 'opt_mugs_back_cap4', content: '⬅️ Volver a Selección de Capacidad', outgoingEdgeId: 'edge_all_to_cap' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_mug7059',
      title: '☕ Detalle Jarro Mug 7059',
      graphCoordinates: { x: 1800, y: 500 },
      blocks: [
        { id: 'b_img_mug7059', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/7059.jpg' } },
        {
          id: 'b_text_mug7059',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '☕ *JARRO MUG DE ACERO 7059 (400ml)*\n• Jarro metálico por dentro y fuera con asa ergonómica de plástico.\n• Grabado láser o serigrafía de tu logo.\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 12 unidades: S/ 16.00 c/u\n• 13 a 50 unidades: S/ 14.50 c/u\n• 51+ unidades: S/ 14.00 c/u por mayor\n\nℹ️ *Descuentos especiales por volumen de 100+ unidades.*' }] }
            ]
          }
        },
        {
          id: 'b_input_mug7059_actions',
          type: 'choice input',
          items: [
            { id: 'opt_mug7059_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_mug7059_to_pago' },
            { id: 'opt_mug7059_agent', content: '👩‍💼 Cotizar Pedido / Grabado Láser', outgoingEdgeId: 'edge_mug7059_to_handover' },
            { id: 'opt_mug7059_back', content: '⬅️ Volver a Mugs', outgoingEdgeId: 'edge_mug7059_to_mugs' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_tm075',
      title: '🔥 Detalle Thermo Mug TM075',
      graphCoordinates: { x: 1800, y: 650 },
      blocks: [
        { id: 'b_img_tm075', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/TM075.jpg' } },
        {
          id: 'b_text_tm075',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🔥 *THERMO MUG PREMIUM TM075 (500ml)*\n• Doble pared de acero inoxidable con tapa hermética anti-derrames.\n• Acabado mate de alta durabilidad.\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 12 unidades: S/ 18.00 c/u\n• 13 a 50 unidades: S/ 17.50 c/u\n• 51+ unidades: S/ 17.00 c/u por mayor\n\nℹ️ *Incluye caja individual de presentación.*' }] }
            ]
          }
        },
        {
          id: 'b_input_tm075_actions',
          type: 'choice input',
          items: [
            { id: 'opt_tm075_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_tm075_to_pago' },
            { id: 'opt_tm075_agent', content: '👩‍💼 Cotizar Pedido / Grabado Láser', outgoingEdgeId: 'edge_tm075_to_handover' },
            { id: 'opt_tm075_back', content: '⬅️ Volver a Mugs', outgoingEdgeId: 'edge_tm075_to_mugs' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_tm075_1',
      title: '✨ Detalle Thermo Mug Sublimar TM075-1',
      graphCoordinates: { x: 1800, y: 800 },
      blocks: [
        { id: 'b_img_tm075_1', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/TM075-1.jpg' } },
        {
          id: 'b_text_tm075_1',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '✨ *THERMO MUG PARA SUBLIMAR TM075-1 (500ml)*\n• Recubrimiento especial para sublimación full color en alta definición.\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 12 unidades: S/ 19.00 c/u\n• 13 a 50 unidades: S/ 18.50 c/u\n• 51+ unidades: S/ 18.00 c/u por mayor\n\nℹ️ *Ideal para diseños corporativos a todo color.*' }] }
            ]
          }
        },
        {
          id: 'b_input_tm075_1_actions',
          type: 'choice input',
          items: [
            { id: 'opt_tm075_1_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_tm075_1_to_pago' },
            { id: 'opt_tm075_1_agent', content: '👩‍💼 Cotizar Pedido / Grabado Láser', outgoingEdgeId: 'edge_tm075_1_to_handover' },
            { id: 'opt_tm075_1_back', content: '⬅️ Volver a Mugs', outgoingEdgeId: 'edge_tm075_1_to_mugs' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_mug8091',
      title: '🍶 Detalle Tomatodo Acero 8091',
      graphCoordinates: { x: 1800, y: 950 },
      blocks: [
        { id: 'b_img_mug8091', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/8091-750.jpg' } },
        {
          id: 'b_text_mug8091',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🍶 *TOMATODO DE ACERO INOXIDABLE 8091 (750ml)*\n• Gran capacidad 750ml con tapa hermética de acero y asa de transporte.\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 12 unidades: S/ 15.00 c/u\n• 13 a 50 unidades: S/ 14.20 c/u\n• 51+ unidades: S/ 13.80 c/u por mayor\n\nℹ️ *Disponible en Blanco, Negro, Azul, Plata y Rojo.*' }] }
            ]
          }
        },
        {
          id: 'b_input_mug8091_actions',
          type: 'choice input',
          items: [
            { id: 'opt_mug8091_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_mug8091_to_pago' },
            { id: 'opt_mug8091_agent', content: '👩‍💼 Cotizar Pedido / Grabado Láser', outgoingEdgeId: 'edge_mug8091_to_handover' },
            { id: 'opt_mug8091_back', content: '⬅️ Volver a Mugs', outgoingEdgeId: 'edge_mug8091_to_mugs' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_ptkl360',
      title: '🥤 Detalle Tomatodo PTKL360',
      graphCoordinates: { x: 1800, y: 1100 },
      blocks: [
        { id: 'b_img_ptkl360', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/PTKL360.jpg' } },
        {
          id: 'b_text_ptkl360',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🥤 *TOMATODO METALICO PTKL360 (380ml)*\n• Compacto y elegante. Medida: 17.5 x 6 cm. Presentación en cajita blanca.\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 12 unidades: S/ 14.00 c/u\n• 13 a 50 unidades: S/ 13.00 c/u\n• 51+ unidades: S/ 12.50 c/u por mayor\n\nℹ️ *Ideal para souvenirs y regalos ejecutivos.*' }] }
            ]
          }
        },
        {
          id: 'b_input_ptkl360_actions',
          type: 'choice input',
          items: [
            { id: 'opt_ptkl360_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_ptkl360_to_pago' },
            { id: 'opt_ptkl360_agent', content: '👩‍💼 Cotizar Pedido / Grabado Láser', outgoingEdgeId: 'edge_ptkl360_to_handover' },
            { id: 'opt_ptkl360_back', content: '⬅️ Volver a Mugs', outgoingEdgeId: 'edge_ptkl360_to_mugs' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_mug8077zn',
      title: '🛡️ Detalle Tomatodo 8077ZN',
      graphCoordinates: { x: 1800, y: 1250 },
      blocks: [
        { id: 'b_img_mug8077zn', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/8077ZN.jpg' } },
        {
          id: 'b_text_mug8077zn',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🛡️ *TOMATODO DE ACERO 8077ZN (750ml)*\n• Tapa de acero inoxidable reforzada. Diseñado para trabajo pesado.\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 12 unidades: S/ 14.50 c/u\n• 13 a 50 unidades: S/ 13.50 c/u\n• 51+ unidades: S/ 12.80 c/u por mayor\n\nℹ️ *Disponible en acabado Negro Mate y Plata.*' }] }
            ]
          }
        },
        {
          id: 'b_input_mug8077zn_actions',
          type: 'choice input',
          items: [
            { id: 'opt_mug8077zn_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_mug8077zn_to_pago' },
            { id: 'opt_mug8077zn_agent', content: '👩‍💼 Cotizar Pedido / Grabado Láser', outgoingEdgeId: 'edge_mug8077zn_to_handover' },
            { id: 'opt_mug8077zn_back', content: '⬅️ Volver a Mugs', outgoingEdgeId: 'edge_mug8077zn_to_mugs' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // CATEGORÍA 4: TOMATODOS
    {
      id: 'group_cat_tomatodos',
      title: '🍶 Tomatodos — Modelos',
      graphCoordinates: { x: 1100, y: 900 },
      blocks: [
        {
          id: 'b_tomatodos_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🍶 *Modelos Destacados de Tomatodos JGIS*\nAluminio / Metal con grabado o serigrafía. Selecciona tu modelo 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_tomatodos_models',
          type: 'choice input',
          items: [
            { id: 'opt_tm_tmd38', content: '🍶 Modelo TMD-38 (Tomatodo Premium Mate 1.2L)', outgoingEdgeId: 'edge_tmd38_to_detail' },
            { id: 'opt_cat_back4', content: '⬅️ Volver a Categorías', outgoingEdgeId: 'edge_tmb_to_cat' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_tmd38',
      title: '🍶 Detalle TMD-38 Premium 1.2L',
      graphCoordinates: { x: 1500, y: 900 },
      blocks: [
        { id: 'b_img_tmd38', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/METAL.jpeg' } },
        {
          id: 'b_text_tmd38',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🍶 *TOMATODO PREMIUM ACABADO MATE 1.2L TMD-38*\n• Incluye estuche tubular de regalo. Conserva temperatura fría/caliente.\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 12 unidades: S/ 35.00 c/u\n• 13 a 50 unidades: S/ 28.00 c/u\n• 51+ unidades: S/ 24.50 c/u por mayor\n\nℹ️ *Disponibilidad*: Confirmada por asesor comercial.' }] }
            ]
          }
        },
        {
          id: 'b_input_tmd38_actions',
          type: 'choice input',
          items: [
            { id: 'opt_tmd38_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_tmd38_to_pago' },
            { id: 'opt_tmd38_agent', content: '👩‍💼 Confirmar con Asesor', outgoingEdgeId: 'edge_tmd38_to_handover' },
            { id: 'opt_tmd38_back', content: '⬅️ Volver a Tomatodos', outgoingEdgeId: 'edge_tmd38_to_tomatodos' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // CATEGORÍA 5: LIBRETAS Y ECOLÓGICOS
    {
      id: 'group_cat_libretas',
      title: '📓 Libretas y Ecológicos — Modelos',
      graphCoordinates: { x: 1100, y: 1200 },
      blocks: [
        {
          id: 'b_libretas_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '📓 *Modelos Destacados de Libretas y Ecológicos JGIS*\nImpresión en bambú, cartón reciclado y ecocuero con grabado o serigrafía 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_libretas_models',
          type: 'choice input',
          items: [
            { id: 'opt_lib_01', content: '📓 Modelo LIB-01 (Libreta Ecológica con Lapicero)', outgoingEdgeId: 'edge_lib01_to_detail' },
            { id: 'opt_cat_back5', content: '⬅️ Volver a Categorías', outgoingEdgeId: 'edge_libb_to_cat' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_lib01',
      title: '📓 Detalle LIB-01 Ecológica',
      graphCoordinates: { x: 1500, y: 1200 },
      blocks: [
        { id: 'b_img_lib01', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/ECO.jpg' } },
        {
          id: 'b_text_lib01',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '📓 *LIBRETA ECOLOGICA LIB-01 CON LAPICERO DE CARTON*\n• Anillada, 80 hojas rayadas recicladas, incluye lapicero ecológico.\n\n💰 *Escala de Precios (Sin IGV)*:\n• 1 a 50 unidades: S/ 6.50 c/u\n• 51 a 499 unidades: S/ 4.80 c/u\n• 500+ unidades: S/ 4.20 c/u por mayor\n\nℹ️ *Disponibilidad*: Confirmada por asesor comercial.' }] }
            ]
          }
        },
        {
          id: 'b_input_lib01_actions',
          type: 'choice input',
          items: [
            { id: 'opt_lib01_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_lib01_to_pago' },
            { id: 'opt_lib01_agent', content: '👩‍💼 Confirmar con Asesor', outgoingEdgeId: 'edge_lib01_to_handover' },
            { id: 'opt_lib01_back', content: '⬅️ Volver a Libretas', outgoingEdgeId: 'edge_lib01_to_libretas' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // CATEGORÍA 6: BOLSAS NOTEX Y CAMBRELL
    {
      id: 'group_cat_bolsas',
      title: '🎒 Bolsas Notex y Cambrell — Modelos',
      graphCoordinates: { x: 1100, y: 1500 },
      blocks: [
        {
          id: 'b_bolsas_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🎒 *Modelos Destacados de Bolsas Notex y Cambrell*\nEstructura termosellada y cosida, estampado serigráfico a 1 o más colores 👇' }] }
            ]
          }
        },
        {
          id: 'b_input_bolsas_models',
          type: 'choice input',
          items: [
            { id: 'opt_bol_10', content: '🎒 Modelo BOL-10 (Bolsa Notex 30x40cm)', outgoingEdgeId: 'edge_bol10_to_detail' },
            { id: 'opt_cat_back6', content: '⬅️ Volver a Categorías', outgoingEdgeId: 'edge_bolb_to_cat' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_model_bol10',
      title: '🎒 Detalle BOL-10 Notex 30x40',
      graphCoordinates: { x: 1500, y: 1500 },
      blocks: [
        { id: 'b_img_bol10', type: 'image', content: { url: 'https://bot.jgispublicidad.pe/images/NOTEX.jpg' } },
        {
          id: 'b_text_bol10',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🎒 *BOLSA NOTEX TERMOSELLADA 30x40cm BOL-10*\n• 80 gramos. Ideal para ferias, merchandising y regalos corporativos.\n\n💰 *Escala de Precios (Sin IGV)*:\n• 100 unidades: S/ 1.50 c/u\n• 500 unidades: S/ 1.10 c/u\n• 1,000+ unidades: S/ 0.85 c/u por millar\n\nℹ️ *Disponibilidad*: Confirmada por asesor comercial.' }] }
            ]
          }
        },
        {
          id: 'b_input_bol10_actions',
          type: 'choice input',
          items: [
            { id: 'opt_bol10_pay', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_bol10_to_pago' },
            { id: 'opt_bol10_agent', content: '👩‍💼 Confirmar con Asesor', outgoingEdgeId: 'edge_bol10_to_handover' },
            { id: 'opt_bol10_back', content: '⬅️ Volver a Bolsas', outgoingEdgeId: 'edge_bol10_to_bolsas' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 4️⃣ PASARELA DE PAGO OFICIAL JGIS (YAPE / BCP / PLIN)
    // -----------------------------------------------------------------------
    {
      id: 'group_pasarela_pago',
      title: '💳 Pasarela de Pago Oficial JGIS',
      graphCoordinates: { x: 2000, y: 0 },
      blocks: [
        {
          id: 'b_pago_speech',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '💳 *PASARELA DE PAGO OFICIAL — CORPORACION JGIS* 🇵🇪\n\n' }] },
              { children: [{ text: '📱 *Yape / Plin*: `969732451` (Titular: Corporación JGIS)\n\n' }] },
              { children: [{ text: '🏦 *Banco BCP*\n• Cuenta Corriente (Soles): `1912434894087`\n• CCI: `00219100243489408755`' }] },
              { children: [{ text: '\n\n📍 *Recojo en Tienda*: C.C. Centro Lima, Sótano Pasaje "H" Stand 560 (Puerta 7 Boulevard).\n⏱️ *Tiempo de Producción*: 48 horas tras confirmación.' }] }
            ]
          }
        },
        {
          id: 'b_input_pago_final',
          type: 'choice input',
          items: [
            { id: 'opt_pago_voucher', content: '✅ Ya realicé mi pago (Enviar Voucher)', outgoingEdgeId: 'edge_pago_to_solicitar_voucher' },
            { id: 'opt_pago_asesor', content: '👩‍💼 Hablar con un Asesor', outgoingEdgeId: 'edge_pago_to_handover' },
            { id: 'opt_pago_menu', content: '⬅️ Volver al Menú Principal', outgoingEdgeId: 'edge_pago_to_menu' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },
    {
      id: 'group_solicitar_voucher',
      title: '📸 Recepción & Validación de Voucher',
      graphCoordinates: { x: 2200, y: 0 },
      blocks: [
        {
          id: 'b_solicitar_voucher_msg',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '📸 *¡Excelente! Por favor, adjunta aquí la foto o captura de pantalla de tu voucher de pago (Yape/BCP).*' }] },
              { children: [{ text: '\n\nNuestros asesores comprobarán la transferencia y pasarán tu pedido inmediatamente a producción 🚀.' }] }
            ]
          }
        },
        {
          id: 'b_input_voucher_file',
          type: 'picture input',
          outgoingEdgeId: 'edge_voucher_to_confirmacion',
          options: { labels: { placeholder: 'Adjunta tu imagen de voucher aquí...' } }
        }
      ]
    },
    {
      id: 'group_confirmacion_voucher',
      title: '✅ Confirmación de Voucher Recibido',
      graphCoordinates: { x: 2400, y: 0 },
      blocks: [
        {
          id: 'b_confirmacion_voucher_msg',
          type: 'text',
          outgoingEdgeId: 'edge_voucher_confirm_to_handover',
          content: {
            richText: [
              { children: [{ text: '✅ *¡Voucher de pago recibido con éxito!* 📸\n\nHe notificado a nuestro equipo comercial en Chatwoot para validar tu transferencia. Un asesor confirmará tu orden en breve. ¡Gracias por tu compra en Corporación JGIS! 🏬✨' }] }
            ]
          }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 5️⃣ ATENCIÓN HUMANA & HANDOVER (CHATWOOT)
    // -----------------------------------------------------------------------
    {
      id: 'group_handover',
      title: '👩‍💼 Atención Humana & Chatwoot',
      graphCoordinates: { x: 2600, y: 0 },
      blocks: [
        {
          id: 'b_handover_msg',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '👩‍💼 ¡Perfecto! He derivado tu conversación con nuestro equipo comercial en Chatwoot.' }] },
              { children: [{ text: 'Un asesor continuará tu atención en breve por este mismo medio. ¡Gracias por confiar en Corporación JGIS! 🏬✨' }] }
            ]
          }
        }
      ]
    }
  ];

  const edges = [
    { id: 'edge_start_apertura', from: { blockId: 'event_start' }, to: { groupId: 'group_apertura' } },
    { id: 'edge_menu_to_trucker', from: { blockId: 'b_input_menu_principal', itemId: 'opt_menu_trucker' }, to: { groupId: 'group_trucker_calificacion' } },
    { id: 'edge_menu_to_catalogo', from: { blockId: 'b_input_menu_principal', itemId: 'opt_menu_catalogo' }, to: { groupId: 'group_catalogo_categorias' } },
    { id: 'edge_menu_to_b2b', from: { blockId: 'b_input_menu_principal', itemId: 'opt_menu_b2b' }, to: { groupId: 'group_handover' } },
    { id: 'edge_menu_to_pedidos', from: { blockId: 'b_input_menu_principal', itemId: 'opt_menu_pedidos' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_menu_to_handover', from: { blockId: 'b_input_menu_principal', itemId: 'opt_menu_asesor' }, to: { groupId: 'group_handover' } },

    // Edges Trucker
    { id: 'edge_trucker_to_galeria', from: { blockId: 'b_input_trucker_uso' }, to: { groupId: 'group_trucker_galeria_cantidad' } },
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
    { id: 'edge_tc_to_pago', from: { blockId: 'b_input_trucker_cierre', itemId: 'opt_tc_pago' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_tc_to_handover', from: { blockId: 'b_input_trucker_cierre', itemId: 'opt_tc_asesor' }, to: { groupId: 'group_handover' } },

    // Edges Categorías & Submenús
    { id: 'edge_cat_to_lap_metal', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_lap_metal' }, to: { groupId: 'group_cat_lap_metal' } },
    { id: 'edge_cat_to_lap_plast', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_lap_plast' }, to: { groupId: 'group_cat_lap_plast' } },
    { id: 'edge_cat_to_tazas', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_tazas' }, to: { groupId: 'group_cat_tazas' } },
    { id: 'edge_cat_to_tomatodos', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_tomatodos' }, to: { groupId: 'group_cat_tomatodos' } },
    { id: 'edge_cat_to_menu', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_menu' }, to: { groupId: 'group_apertura' } },

    // Lapiceros Metálicos
    { id: 'edge_lm18_to_detail', from: { blockId: 'b_input_lap_metal_models', itemId: 'opt_lm_18' }, to: { groupId: 'group_model_lm18' } },
    { id: 'edge_lys01_to_detail', from: { blockId: 'b_input_lap_metal_models', itemId: 'opt_lys_01' }, to: { groupId: 'group_model_lys01' } },
    { id: 'edge_2086r_to_detail', from: { blockId: 'b_input_lap_metal_models', itemId: 'opt_2086_r' }, to: { groupId: 'group_model_2086r' } },
    { id: 'edge_set1_to_detail', from: { blockId: 'b_input_lap_metal_models', itemId: 'opt_set_1' }, to: { groupId: 'group_model_set1' } },
    { id: 'edge_lmb_to_cat', from: { blockId: 'b_input_lap_metal_models', itemId: 'opt_cat_back1' }, to: { groupId: 'group_catalogo_categorias' } },

    // Detalle Metálicos -> Pago/Handover/Volver
    { id: 'edge_lm18_to_pago', from: { blockId: 'b_input_lm18_actions', itemId: 'opt_lm18_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_lm18_to_handover', from: { blockId: 'b_input_lm18_actions', itemId: 'opt_lm18_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_lm18_to_metal', from: { blockId: 'b_input_lm18_actions', itemId: 'opt_lm18_back' }, to: { groupId: 'group_cat_lap_metal' } },

    { id: 'edge_lys01_to_pago', from: { blockId: 'b_input_lys01_actions', itemId: 'opt_lys01_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_lys01_to_handover', from: { blockId: 'b_input_lys01_actions', itemId: 'opt_lys01_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_lys01_to_metal', from: { blockId: 'b_input_lys01_actions', itemId: 'opt_lys01_back' }, to: { groupId: 'group_cat_lap_metal' } },

    { id: 'edge_2086r_to_pago', from: { blockId: 'b_input_2086r_actions', itemId: 'opt_2086r_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_2086r_to_handover', from: { blockId: 'b_input_2086r_actions', itemId: 'opt_2086r_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_2086r_to_metal', from: { blockId: 'b_input_2086r_actions', itemId: 'opt_2086r_back' }, to: { groupId: 'group_cat_lap_metal' } },

    { id: 'edge_set1_to_pago', from: { blockId: 'b_input_set1_actions', itemId: 'opt_set1_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_set1_to_handover', from: { blockId: 'b_input_set1_actions', itemId: 'opt_set1_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_set1_to_metal', from: { blockId: 'b_input_set1_actions', itemId: 'opt_set1_back' }, to: { groupId: 'group_cat_lap_metal' } },

    // Lapiceros Plásticos
    { id: 'edge_lp3111_to_detail', from: { blockId: 'b_input_lap_plast_models', itemId: 'opt_lp_3111' }, to: { groupId: 'group_model_lp3111' } },
    { id: 'edge_lp3115_to_detail', from: { blockId: 'b_input_lap_plast_models', itemId: 'opt_lp_3115' }, to: { groupId: 'group_model_lp3115' } },
    { id: 'edge_lpb_to_cat', from: { blockId: 'b_input_lap_plast_models', itemId: 'opt_cat_back2' }, to: { groupId: 'group_catalogo_categorias' } },

    { id: 'edge_lp3111_to_pago', from: { blockId: 'b_input_lp3111_actions', itemId: 'opt_lp3111_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_lp3111_to_handover', from: { blockId: 'b_input_lp3111_actions', itemId: 'opt_lp3111_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_lp3111_to_plast', from: { blockId: 'b_input_lp3111_actions', itemId: 'opt_lp3111_back' }, to: { groupId: 'group_cat_lap_plast' } },

    { id: 'edge_lp3115_to_pago', from: { blockId: 'b_input_lp3115_actions', itemId: 'opt_lp3115_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_lp3115_to_handover', from: { blockId: 'b_input_lp3115_actions', itemId: 'opt_lp3115_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_lp3115_to_plast', from: { blockId: 'b_input_lp3115_actions', itemId: 'opt_lp3115_back' }, to: { groupId: 'group_cat_lap_plast' } },

    // Tazas y Mugs (Filtro de 2 Pasos: Capacidad -> Modelo/Diseño)
    { id: 'edge_mug_to_cap_chico', from: { blockId: 'b_input_tazas_models', itemId: 'opt_mug_cap_chico' }, to: { groupId: 'group_mugs_cap_chico' } },
    { id: 'edge_mug_to_cap_mediano', from: { blockId: 'b_input_tazas_models', itemId: 'opt_mug_cap_mediano' }, to: { groupId: 'group_mugs_cap_mediano' } },
    { id: 'edge_mug_to_cap_grande', from: { blockId: 'b_input_tazas_models', itemId: 'opt_mug_cap_grande' }, to: { groupId: 'group_mugs_cap_grande' } },
    { id: 'edge_mug_to_all_models', from: { blockId: 'b_input_tazas_models', itemId: 'opt_mug_cap_todos' }, to: { groupId: 'group_mugs_all_models' } },
    { id: 'edge_tzb_to_cat', from: { blockId: 'b_input_tazas_models', itemId: 'opt_cat_back3' }, to: { groupId: 'group_catalogo_categorias' } },

    // Chicos
    { id: 'edge_mug7059_to_detail', from: { blockId: 'b_input_mugs_chico', itemId: 'opt_mug_7059' }, to: { groupId: 'group_model_mug7059' } },
    { id: 'edge_ptkl360_to_detail', from: { blockId: 'b_input_mugs_chico', itemId: 'opt_mug_ptkl360' }, to: { groupId: 'group_model_ptkl360' } },
    { id: 'edge_chico_to_cap', from: { blockId: 'b_input_mugs_chico', itemId: 'opt_mugs_back_cap1' }, to: { groupId: 'group_cat_tazas' } },

    // Medianos
    { id: 'edge_tm075_to_detail', from: { blockId: 'b_input_mugs_mediano', itemId: 'opt_mug_tm075' }, to: { groupId: 'group_model_tm075' } },
    { id: 'edge_tm075_1_to_detail', from: { blockId: 'b_input_mugs_mediano', itemId: 'opt_mug_tm075_1' }, to: { groupId: 'group_model_tm075_1' } },
    { id: 'edge_mediano_to_cap', from: { blockId: 'b_input_mugs_mediano', itemId: 'opt_mugs_back_cap2' }, to: { groupId: 'group_cat_tazas' } },

    // Grandes
    { id: 'edge_mug8091_to_detail', from: { blockId: 'b_input_mugs_grande', itemId: 'opt_mug_8091' }, to: { groupId: 'group_model_mug8091' } },
    { id: 'edge_mug8077zn_to_detail', from: { blockId: 'b_input_mugs_grande', itemId: 'opt_mug_8077zn' }, to: { groupId: 'group_model_mug8077zn' } },
    { id: 'edge_grande_to_cap', from: { blockId: 'b_input_mugs_grande', itemId: 'opt_mugs_back_cap3' }, to: { groupId: 'group_cat_tazas' } },

    // Todos
    { id: 'edge_all_to_cap', from: { blockId: 'b_input_mugs_all', itemId: 'opt_mugs_back_cap4' }, to: { groupId: 'group_cat_tazas' } },

    // Detalles Mugs -> Pago/Handover/Volver
    { id: 'edge_mug7059_to_pago', from: { blockId: 'b_input_mug7059_actions', itemId: 'opt_mug7059_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_mug7059_to_handover', from: { blockId: 'b_input_mug7059_actions', itemId: 'opt_mug7059_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_mug7059_to_mugs', from: { blockId: 'b_input_mug7059_actions', itemId: 'opt_mug7059_back' }, to: { groupId: 'group_cat_tazas' } },

    { id: 'edge_tm075_to_pago', from: { blockId: 'b_input_tm075_actions', itemId: 'opt_tm075_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_tm075_to_handover', from: { blockId: 'b_input_tm075_actions', itemId: 'opt_tm075_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_tm075_to_mugs', from: { blockId: 'b_input_tm075_actions', itemId: 'opt_tm075_back' }, to: { groupId: 'group_cat_tazas' } },

    { id: 'edge_tm075_1_to_pago', from: { blockId: 'b_input_tm075_1_actions', itemId: 'opt_tm075_1_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_tm075_1_to_handover', from: { blockId: 'b_input_tm075_1_actions', itemId: 'opt_tm075_1_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_tm075_1_to_mugs', from: { blockId: 'b_input_tm075_1_actions', itemId: 'opt_tm075_1_back' }, to: { groupId: 'group_cat_tazas' } },

    { id: 'edge_mug8091_to_pago', from: { blockId: 'b_input_mug8091_actions', itemId: 'opt_mug8091_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_mug8091_to_handover', from: { blockId: 'b_input_mug8091_actions', itemId: 'opt_mug8091_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_mug8091_to_mugs', from: { blockId: 'b_input_mug8091_actions', itemId: 'opt_mug8091_back' }, to: { groupId: 'group_cat_tazas' } },

    { id: 'edge_ptkl360_to_pago', from: { blockId: 'b_input_ptkl360_actions', itemId: 'opt_ptkl360_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_ptkl360_to_handover', from: { blockId: 'b_input_ptkl360_actions', itemId: 'opt_ptkl360_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_ptkl360_to_mugs', from: { blockId: 'b_input_ptkl360_actions', itemId: 'opt_ptkl360_back' }, to: { groupId: 'group_cat_tazas' } },

    { id: 'edge_mug8077zn_to_pago', from: { blockId: 'b_input_mug8077zn_actions', itemId: 'opt_mug8077zn_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_mug8077zn_to_handover', from: { blockId: 'b_input_mug8077zn_actions', itemId: 'opt_mug8077zn_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_mug8077zn_to_mugs', from: { blockId: 'b_input_mug8077zn_actions', itemId: 'opt_mug8077zn_back' }, to: { groupId: 'group_cat_tazas' } },

    { id: 'edge_cat_to_libretas', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_libretas' }, to: { groupId: 'group_cat_libretas' } },
    { id: 'edge_cat_to_bolsas', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_bolsas' }, to: { groupId: 'group_cat_bolsas' } },

    // Libretas
    { id: 'edge_lib01_to_detail', from: { blockId: 'b_input_libretas_models', itemId: 'opt_lib_01' }, to: { groupId: 'group_model_lib01' } },
    { id: 'edge_libb_to_cat', from: { blockId: 'b_input_libretas_models', itemId: 'opt_cat_back5' }, to: { groupId: 'group_catalogo_categorias' } },
    { id: 'edge_lib01_to_pago', from: { blockId: 'b_input_lib01_actions', itemId: 'opt_lib01_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_lib01_to_handover', from: { blockId: 'b_input_lib01_actions', itemId: 'opt_lib01_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_lib01_to_libretas', from: { blockId: 'b_input_lib01_actions', itemId: 'opt_lib01_back' }, to: { groupId: 'group_cat_libretas' } },

    // Bolsas Notex
    { id: 'edge_bol10_to_detail', from: { blockId: 'b_input_bolsas_models', itemId: 'opt_bol_10' }, to: { groupId: 'group_model_bol10' } },
    { id: 'edge_bolb_to_cat', from: { blockId: 'b_input_bolsas_models', itemId: 'opt_cat_back6' }, to: { groupId: 'group_catalogo_categorias' } },
    { id: 'edge_bol10_to_pago', from: { blockId: 'b_input_bol10_actions', itemId: 'opt_bol10_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_bol10_to_handover', from: { blockId: 'b_input_bol10_actions', itemId: 'opt_bol10_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_bol10_to_bolsas', from: { blockId: 'b_input_bol10_actions', itemId: 'opt_bol10_back' }, to: { groupId: 'group_cat_bolsas' } },

    // Tomatodos
    { id: 'edge_tmd38_to_detail', from: { blockId: 'b_input_tomatodos_models', itemId: 'opt_tm_tmd38' }, to: { groupId: 'group_model_tmd38' } },
    { id: 'edge_tmb_to_cat', from: { blockId: 'b_input_tomatodos_models', itemId: 'opt_cat_back4' }, to: { groupId: 'group_catalogo_categorias' } },

    { id: 'edge_tmd38_to_pago', from: { blockId: 'b_input_tmd38_actions', itemId: 'opt_tmd38_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_tmd38_to_handover', from: { blockId: 'b_input_tmd38_actions', itemId: 'opt_tmd38_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_tmd38_to_tomatodos', from: { blockId: 'b_input_tmd38_actions', itemId: 'opt_tmd38_back' }, to: { groupId: 'group_cat_tomatodos' } },

    // Pasarela de Pago & Solicitud de Voucher
    { id: 'edge_pago_to_solicitar_voucher', from: { blockId: 'b_input_pago_final', itemId: 'opt_pago_voucher' }, to: { groupId: 'group_solicitar_voucher' } },
    { id: 'edge_pago_to_handover_asesor', from: { blockId: 'b_input_pago_final', itemId: 'opt_pago_asesor' }, to: { groupId: 'group_handover' } },
    { id: 'edge_pago_to_menu', from: { blockId: 'b_input_pago_final', itemId: 'opt_pago_menu' }, to: { groupId: 'group_apertura' } },
    { id: 'edge_voucher_to_confirmacion', from: { blockId: 'b_input_voucher_file' }, to: { groupId: 'group_confirmacion_voucher' } },
    { id: 'edge_voucher_confirm_to_handover', from: { blockId: 'b_confirmacion_voucher_msg' }, to: { groupId: 'group_handover' } }
  ];

  const typebotSchema = {
    version: '6',
    id: typebotId,
    name: name,
    events: events,
    groups: groups,
    edges: edges,
    variables: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const schemaPath = path.join(__dirname, '..', 'src', 'config', 'typebot_master_schema.json');
  fs.writeFileSync(schemaPath, JSON.stringify(typebotSchema, null, 2), 'utf8');

  const pool = db.getPool();
  if (!pool) {
    console.log('⚠️ DATABASE_URL no está configurada en entorno local.');
    console.log(`📄 Esquema de Typebot V6 guardado en archivo local: src/config/typebot_master_schema.json`);
    console.log('✅ FLUJO MAESTRO COMPILADO Y LISTO PARA DEPLOY VPS');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateTypebotQuery = `
      UPDATE "Typebot"
      SET name = $1,
          "groups" = $2::jsonb,
          events = $3::jsonb,
          edges = $4::jsonb,
          "updatedAt" = NOW()
      WHERE id = $5;
    `;
    await client.query(updateTypebotQuery, [
      name,
      JSON.stringify(groups),
      JSON.stringify(events),
      JSON.stringify(edges),
      typebotId
    ]);

    const updatePublicTypebotQuery = `
      UPDATE "PublicTypebot"
      SET typebot = $1::jsonb,
          "updatedAt" = NOW()
      WHERE "typebotId" = $2;
    `;
    await client.query(updatePublicTypebotQuery, [
      JSON.stringify(typebotSchema),
      typebotId
    ]);

    await client.query('COMMIT');
    console.log('✅ FLUJO MAESTRO PUBLICADO EXITOSAMENTE EN TYPEBOT V6 (POSTGRESQL)');
    console.log(`🤖 ID de Typebot: ${typebotId}`);
    console.log('✨ Menús jerárquicos por botones, modelos exactos y pasarela de pago Yape/BCP integrados.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ ERROR AL PUBLICAR FLUJO EN TYPEBOT:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  publishMasterFlow().catch(console.error);
}

module.exports = { publishMasterFlow };
