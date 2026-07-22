require('dotenv').config();
const { Pool } = require('pg');

async function publishJgisCommercialFlow() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@jgis-postgres:5432/typebot'
  });

  console.log('🤖 =========================================================================');
  console.log('⚡ CONFIGURANDO Y PUBLICANDO FLUJO COMERCIAL TYPEBOT PARA JGIS PUBLICIDAD');
  console.log('🤖 =========================================================================\n');

  const typebotId = 'jgis-publicidad-bot-f33vo50';
  const name = 'JGIS Flujo Comercial Principal (Gorras + Pagos + Menú Navetation)';

  // Definición del Flujo Typebot v6
  const flowObj = {
    name,
    groups: [
      {
        id: 'group_bienvenida',
        title: '👋 Bienvenida y Galería Meta Ads',
        graphPosition: { x: 0, y: 0 },
        blocks: [
          {
            id: 'b_saludo',
            type: 'text',
            content: {
              richText: [
                { children: [{ text: '👋 ¡Hola! Muchas gracias por comunicarte con *Corporación JGIS Publicidad*.' }] },
                { children: [{ text: 'Te adjuntamos las fotos oficiales de nuestro catálogo y anuncios en Meta Ads 🧢📦:' }] }
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
            id: 'b_terminos_pago',
            type: 'text',
            content: {
              richText: [
                { children: [{ text: '📌 *CONDICIONES DE TRABAJO Y ENTREGAS:*' }] },
                { children: [{ text: '1️⃣ *Inicio de Trabajo:* Se empieza a trabajar e imprimir tu merchandise una vez depositado el *50% de adelanto*.' }] },
                { children: [{ text: '2️⃣ *Entrega Final:* Se entrega el producto final o se realiza el despacho a provincia/lima una vez depositado el *saldo restante (50%)*.' }] },
                { children: [{ text: '\n💳 *Datos para Abono de Adelanto:*' }] },
                { children: [{ text: '📱 Yape / Plin: *969732451* (Titular: Corporación JGIS)' }] },
                { children: [{ text: '🏦 BCP Cta Cte Soles: *1912434894087* (CCI: 00219100243489408755)' }] }
              ]
            }
          },
          {
            id: 'b_menu_pregunta',
            type: 'choice input',
            options: {
              isMultipleChoice: false,
              items: [
                { id: 'opt_1', content: '🧢 Cotizar Gorras por Cantidad' },
                { id: 'opt_2', content: '📍 Ver Ubicación de Tienda' },
                { id: 'opt_3', content: '👩‍💼 Hablar con un Asesor en Vivo' }
              ]
            }
          }
        ]
      },
      {
        id: 'group_ubicacion',
        title: '📍 Tienda y Dirección',
        graphPosition: { x: 400, y: 0 },
        blocks: [
          {
            id: 'b_dir_text',
            type: 'text',
            content: {
              richText: [
                { children: [{ text: '📍 *Nuestra Tienda Física:*' }] },
                { children: [{ text: '🏢 Galería Centro Comercial Centro Lima' }] },
                { children: [{ text: '🔻 Sótano – Pasaje "H", Stand 560 (Cerca de Puerta 7 - Boulevard)' }] },
                { children: [{ text: '⏰ *Horario:* Lunes a Sábado de 9:00 am a 7:00 pm' }] }
              ]
            }
          }
        ]
      },
      {
        id: 'group_asesor',
        title: '👩‍💼 Atención Humana',
        graphPosition: { x: 800, y: 0 },
        blocks: [
          {
            id: 'b_asesor_text',
            type: 'text',
            content: {
              richText: [
                { children: [{ text: '¡Excelente! He derivado tu chat con nuestro equipo de ventas. Un asesor comercial te atenderá en breve. 😊' }] }
              ]
            }
          }
        ]
      }
    ],
    variables: [
      { id: 'v_opcion', name: 'Opcion_Seleccionada' }
    ],
    edges: []
  };

  const groups = JSON.stringify(flowObj.groups);
  const variables = JSON.stringify(flowObj.variables);
  const edges = JSON.stringify(flowObj.edges);
  const theme = JSON.stringify({ general: { background: { type: 'Color', content: '#ffffff' } } });
  const settings = JSON.stringify({ typingEmulation: { enabled: true, speed: 30 } });
  const now = new Date();

  try {
    // 1. Obtener workspace
    const wsRes = await pool.query(`SELECT id FROM "Workspace" LIMIT 1;`);
    const workspaceId = wsRes.rows[0]?.id || 'workspace-jgis';

    // 2. Actualizar o Insertar en "Typebot"
    await pool.query(
      `INSERT INTO "Typebot" (id, name, groups, variables, edges, theme, settings, "publicId", "workspaceId", "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $1, $8, $9, $9, '6')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, groups = EXCLUDED.groups, variables = EXCLUDED.variables, edges = EXCLUDED.edges, "updatedAt" = EXCLUDED."updatedAt";`,
      [typebotId, name, groups, variables, edges, theme, settings, workspaceId, now]
    );

    // 3. Publicar en "PublicTypebot"
    await pool.query(
      `INSERT INTO "PublicTypebot" (id, "typebotId", groups, variables, edges, theme, settings, "createdAt", "updatedAt", version)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $7, '6')
       ON CONFLICT (id) DO UPDATE SET groups = EXCLUDED.groups, variables = EXCLUDED.variables, edges = EXCLUDED.edges, "updatedAt" = EXCLUDED."updatedAt";`,
      [typebotId, groups, variables, edges, theme, settings, now]
    );

    const editUrl = `https://bot.jgispublicidad.pe/typebot/typebots/${typebotId}/edit`;

    console.log('🎉 =========================================================================');
    console.log('✅ ¡FLUJO COMERCIAL CONFIGURADO Y PUBLICADO EXITOSAMENTE EN TYPEBOT!');
    console.log('🎉 =========================================================================');
    console.log(`📌 Nombre del Flujo : ${name}`);
    console.log(`🔑 Typebot ID       : ${typebotId}`);
    console.log(`🔗 Enlace Editor UI  : ${editUrl}`);
    console.log('=========================================================================\n');

  } catch (err) {
    console.error('❌ Error guardando el flujo comercial en Typebot DB:', err.message);
  } finally {
    await pool.end();
  }
}

publishJgisCommercialFlow();
