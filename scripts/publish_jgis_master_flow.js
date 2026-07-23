require('dotenv').config();
const db = require('../src/utils/db');
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
    // 3️⃣ FLUJO 2: CATÁLOGO MULTICATEGORÍA CON MODELOS EXACTOS
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
            { id: 'opt_cat_menu', content: '⬅️ Volver al Menú Principal', outgoingEdgeId: 'edge_cat_to_menu' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // CATEGORÍA: LAPICEROS METÁLICOS
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
              { children: [{ text: '🖊️ *Modelos Destacados de Lapiceros Metálicos JGIS*\nSelecciona un modelo para ver su foto, precio por volumen y realizar tu pedido 👇' }] }
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
            { id: 'opt_cat_back1', content: '⬅️ Volver a Categorías', outgoingEdgeId: 'edge_lmb_to_cat' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // DETALLE MODELO LM-18
    {
      id: 'group_model_lm18',
      title: '🖊️ Detalle LM-18',
      graphCoordinates: { x: 1500, y: -200 },
      blocks: [
        {
          id: 'b_img_lm18',
          type: 'image',
          content: { url: 'https://bot.jgispublicidad.pe/images/METAL.jpeg' }
        },
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

    // DETALLE MODELO LYS-01
    {
      id: 'group_model_lys01',
      title: '🖊️ Detalle LYS-01',
      graphCoordinates: { x: 1500, y: -50 },
      blocks: [
        {
          id: 'b_img_lys01',
          type: 'image',
          content: { url: 'https://bot.jgispublicidad.pe/images/LYS-01.jpg' }
        },
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

    // DETALLE MODELO 2086-R
    {
      id: 'group_model_2086r',
      title: '🖊️ Detalle 2086-R',
      graphCoordinates: { x: 1500, y: 100 },
      blocks: [
        {
          id: 'b_img_2086r',
          type: 'image',
          content: { url: 'https://bot.jgispublicidad.pe/images/2086-R-RP-2351.jpeg' }
        },
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

    // CATEGORÍA: LAPICEROS PLÁSTICOS
    {
      id: 'group_cat_lap_plast',
      title: '🖊️ Lapiceros Plásticos — Modelos',
      graphCoordinates: { x: 1100, y: 250 },
      blocks: [
        {
          id: 'b_lap_plast_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🖊️ *Lapiceros Plásticos Publicitarios JGIS*\n• Impresión serigrafía / tampografía a full color\n• Ideal para eventos masivos, campañas y ferias\n\n💰 *Precios por Mayor*: Desde S/ 0.25 c/u por millar' }] }
            ]
          }
        },
        {
          id: 'b_input_lap_plast_actions',
          type: 'choice input',
          items: [
            { id: 'opt_lp_pago', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_lp_to_pago' },
            { id: 'opt_lp_agent', content: '👩‍💼 Cotizar con Asesor', outgoingEdgeId: 'edge_lp_to_handover' },
            { id: 'opt_lp_back', content: '⬅️ Volver a Categorías', outgoingEdgeId: 'edge_lpb_to_cat' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // CATEGORÍA: TAZAS Y MUGS
    {
      id: 'group_cat_tazas',
      title: '☕ Mugs y Tazas',
      graphCoordinates: { x: 1100, y: 400 },
      blocks: [
        {
          id: 'b_tazas_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '☕ *Tazas y Mugs Personalizados JGIS*\n• Taza Mágica termosensible MTT-10 (desde S/ 11.00 c/u)\n• Mug Térmico Acero MUG-32 (desde S/ 15.50 c/u)\n• Taza Pizarra MTT-08 (desde S/ 7.50 c/u)' }] }
            ]
          }
        },
        {
          id: 'b_input_tazas_actions',
          type: 'choice input',
          items: [
            { id: 'opt_tz_pago', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_tz_to_pago' },
            { id: 'opt_tz_agent', content: '👩‍💼 Cotizar con Asesor', outgoingEdgeId: 'edge_tz_to_handover' },
            { id: 'opt_tz_back', content: '⬅️ Volver a Categorías', outgoingEdgeId: 'edge_tzb_to_cat' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // CATEGORÍA: TOMATODOS
    {
      id: 'group_cat_tomatodos',
      title: '🍶 Tomatodos y Botellas',
      graphCoordinates: { x: 1100, y: 550 },
      blocks: [
        {
          id: 'b_tomatodos_intro',
          type: 'text',
          content: {
            richText: [
              { children: [{ text: '🍶 *Tomatodos y Botellas de Aluminio / Metal JGIS*\n• Tomatodo Metálico TMD-02 (desde S/ 9.00 c/u)\n• Tomatodo Premium Acabado Mate 1.2L TMD-38\n• Tomatodo Aluminio Tapa Bambú TMD-48' }] }
            ]
          }
        },
        {
          id: 'b_input_tomatodos_actions',
          type: 'choice input',
          items: [
            { id: 'opt_tm_pago', content: '💳 Pasarela de Pago (Yape / BCP)', outgoingEdgeId: 'edge_tm_to_pago' },
            { id: 'opt_tm_agent', content: '👩‍💼 Cotizar con Asesor', outgoingEdgeId: 'edge_tm_to_handover' },
            { id: 'opt_tm_back', content: '⬅️ Volver a Categorías', outgoingEdgeId: 'edge_tmb_to_cat' }
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
      graphCoordinates: { x: 1900, y: 0 },
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
            { id: 'opt_pago_voucher', content: '✅ Ya realicé mi pago (Enviar Voucher)', outgoingEdgeId: 'edge_pago_to_handover' },
            { id: 'opt_pago_asesor', content: '👩‍💼 Hablar con un Asesor', outgoingEdgeId: 'edge_pago_to_handover' },
            { id: 'opt_pago_menu', content: '⬅️ Volver al Menú Principal', outgoingEdgeId: 'edge_pago_to_menu' }
          ],
          options: { isMultipleChoice: false }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // 5️⃣ ATENCIÓN HUMANA & HANDOVER (CHATWOOT)
    // -----------------------------------------------------------------------
    {
      id: 'group_handover',
      title: '👩‍💼 Atención Humana & Chatwoot',
      graphCoordinates: { x: 2300, y: 0 },
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

    // Edges Categorías & Modelos
    { id: 'edge_cat_to_lap_metal', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_lap_metal' }, to: { groupId: 'group_cat_lap_metal' } },
    { id: 'edge_cat_to_lap_plast', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_lap_plast' }, to: { groupId: 'group_cat_lap_plast' } },
    { id: 'edge_cat_to_tazas', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_tazas' }, to: { groupId: 'group_cat_tazas' } },
    { id: 'edge_cat_to_tomatodos', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_tomatodos' }, to: { groupId: 'group_cat_tomatodos' } },
    { id: 'edge_cat_to_menu', from: { blockId: 'b_input_cat_opcion', itemId: 'opt_cat_menu' }, to: { groupId: 'group_apertura' } },

    // Edges Lapiceros Metal
    { id: 'edge_lm18_to_detail', from: { blockId: 'b_input_lap_metal_models', itemId: 'opt_lm_18' }, to: { groupId: 'group_model_lm18' } },
    { id: 'edge_lys01_to_detail', from: { blockId: 'b_input_lap_metal_models', itemId: 'opt_lys_01' }, to: { groupId: 'group_model_lys01' } },
    { id: 'edge_2086r_to_detail', from: { blockId: 'b_input_lap_metal_models', itemId: 'opt_2086_r' }, to: { groupId: 'group_model_2086r' } },
    { id: 'edge_lmb_to_cat', from: { blockId: 'b_input_lap_metal_models', itemId: 'opt_cat_back1' }, to: { groupId: 'group_catalogo_categorias' } },

    // Edges Detalle Modelo -> Pago / Handover
    { id: 'edge_lm18_to_pago', from: { blockId: 'b_input_lm18_actions', itemId: 'opt_lm18_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_lm18_to_handover', from: { blockId: 'b_input_lm18_actions', itemId: 'opt_lm18_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_lm18_to_metal', from: { blockId: 'b_input_lm18_actions', itemId: 'opt_lm18_back' }, to: { groupId: 'group_cat_lap_metal' } },

    { id: 'edge_lys01_to_pago', from: { blockId: 'b_input_lys01_actions', itemId: 'opt_lys01_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_lys01_to_handover', from: { blockId: 'b_input_lys01_actions', itemId: 'opt_lys01_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_lys01_to_metal', from: { blockId: 'b_input_lys01_actions', itemId: 'opt_lys01_back' }, to: { groupId: 'group_cat_lap_metal' } },

    { id: 'edge_2086r_to_pago', from: { blockId: 'b_input_2086r_actions', itemId: 'opt_2086r_pay' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_2086r_to_handover', from: { blockId: 'b_input_2086r_actions', itemId: 'opt_2086r_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_2086r_to_metal', from: { blockId: 'b_input_2086r_actions', itemId: 'opt_2086r_back' }, to: { groupId: 'group_cat_lap_metal' } },

    // Edges Categorías Varios -> Pago / Handover / Volver
    { id: 'edge_lp_to_pago', from: { blockId: 'b_input_lap_plast_actions', itemId: 'opt_lp_pago' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_lp_to_handover', from: { blockId: 'b_input_lap_plast_actions', itemId: 'opt_lp_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_lpb_to_cat', from: { blockId: 'b_input_lap_plast_actions', itemId: 'opt_lp_back' }, to: { groupId: 'group_catalogo_categorias' } },

    { id: 'edge_tz_to_pago', from: { blockId: 'b_input_tazas_actions', itemId: 'opt_tz_pago' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_tz_to_handover', from: { blockId: 'b_input_tazas_actions', itemId: 'opt_tz_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_tzb_to_cat', from: { blockId: 'b_input_tazas_actions', itemId: 'opt_tz_back' }, to: { groupId: 'group_catalogo_categorias' } },

    { id: 'edge_tm_to_pago', from: { blockId: 'b_input_tomatodos_actions', itemId: 'opt_tm_pago' }, to: { groupId: 'group_pasarela_pago' } },
    { id: 'edge_tm_to_handover', from: { blockId: 'b_input_tomatodos_actions', itemId: 'opt_tm_agent' }, to: { groupId: 'group_handover' } },
    { id: 'edge_tmb_to_cat', from: { blockId: 'b_input_tomatodos_actions', itemId: 'opt_tm_back' }, to: { groupId: 'group_catalogo_categorias' } },

    // Edges Pasarela de Pago -> Handover / Menú
    { id: 'edge_pago_to_handover', from: { blockId: 'b_input_pago_final', itemId: 'opt_pago_voucher' }, to: { groupId: 'group_handover' } },
    { id: 'edge_pago_to_menu', from: { blockId: 'b_input_pago_final', itemId: 'opt_pago_menu' }, to: { groupId: 'group_apertura' } }
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

publishMasterFlow().catch(console.error);
