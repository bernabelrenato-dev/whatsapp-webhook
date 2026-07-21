const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/typebot'
  });
  
  await client.connect();
  
  console.log('Seeding JGIS Workspace, User and Typebot...');
  
  // 1. Crear el usuario
  await client.query(`
    INSERT INTO "User" (id, email, "emailVerified", "onboardingCategories") 
    VALUES ('user-jgis', 'ventas.centrolima@jgispublicidad.pe', NOW(), '[]'::jsonb)
    ON CONFLICT (id) DO NOTHING
  `);
  
  // 2. Crear el espacio de trabajo
  await client.query(`
    INSERT INTO "Workspace" (id, name, plan) 
    VALUES ('workspace-jgis', 'JGIS Publicidad', 'FREE')
    ON CONFLICT (id) DO NOTHING
  `);
  
  // 3. Asociar usuario al espacio de trabajo como Administrador
  await client.query(`
    INSERT INTO "MemberInWorkspace" ("userId", "workspaceId", role) 
    VALUES ('user-jgis', 'workspace-jgis', 'ADMIN')
    ON CONFLICT ("userId", "workspaceId") DO NOTHING
  `);
  
  // 4. Estructura de grupos de Typebot (Flujo de Captura de Datos)
  const groups = [
    {
      id: 'group-start',
      title: 'Inicio',
      graphCoordinates: { x: 0, y: 0 },
      blocks: [

        {
          id: 'block-msg-greeting',
          type: 'text',
          content: {
            richText: [{ type: 'p', children: [{ text: '¡Hola! Bienvenido a JGIS Publicidad. 😊 Valentina Rios a tu servicio. ¿Cuál es tu nombre?' }] }]
          }
        },
        {
          id: 'block-input-name',
          type: 'text input',
          options: {
            variableId: 'var-nombre'
          }
        }
      ]
    },
    {
      id: 'group-prod',
      title: 'Producto',
      graphCoordinates: { x: 300, y: 0 },
      blocks: [
        {
          id: 'block-msg-prod',
          type: 'text',
          content: {
            richText: [{ type: 'p', children: [{ text: 'Un placer, ' }, { text: '{{Nombre}}', bold: true }, { text: '. ¿Qué tipo de merchandising estás buscando hoy? (Por ejemplo: tazas, mochilas, bolsas ecológicas...)' }] }]
          }
        },
        {
          id: 'block-input-prod',
          type: 'text input',
          options: {
            variableId: 'var-producto'
          }
        }
      ]
    },
    {
      id: 'group-qty',
      title: 'Cantidad',
      graphCoordinates: { x: 600, y: 0 },
      blocks: [
        {
          id: 'block-msg-qty',
          type: 'text',
          content: {
            richText: [{ type: 'p', children: [{ text: 'Excelente. ¿Qué cantidad aproximada deseas cotizar? (Por ejemplo: 50, 100, 500 unidades)' }] }]
          }
        },
        {
          id: 'block-input-qty',
          type: 'number input',
          options: {
            variableId: 'var-cantidad'
          }
        }
      ]
    },
    {
      id: 'group-search',
      title: 'Búsqueda de Catálogo',
      graphCoordinates: { x: 900, y: 0 },
      blocks: [
        {
          id: 'block-webhook-search',
          type: 'webhook',
          options: {
            webhookId: 'webhook-search',
            url: 'https://bot.jgispublicidad.pe/api/search',
            method: 'POST',
            body: JSON.stringify({
              query: '{{Producto}}',
              quantity: '{{Cantidad}}',
              name: '{{Nombre}}',
              phone: '{{phone}}'
            }),
            responseVariables: [
              { key: 'success', variableId: 'var-success' },
              { key: 'message', variableId: 'var-message' },
              { key: 'imageUrl', variableId: 'var-imageUrl' },
              { key: 'action', variableId: 'var-action' }
            ]
          }
        },
        {
          id: 'block-msg-image',
          type: 'image',
          content: {
            type: 'url',
            url: '{{imageUrl}}'
          }
        },
        {
          id: 'block-msg-result',
          type: 'text',
          content: {
            richText: [{ type: 'p', children: [{ text: '{{message}}' }] }]
          }
        }
      ]
    }
  ];

  const variables = [
    { id: 'var-nombre', name: 'Nombre' },
    { id: 'var-producto', name: 'Producto' },
    { id: 'var-cantidad', name: 'Cantidad' },
    { id: 'var-success', name: 'success' },
    { id: 'var-message', name: 'message' },
    { id: 'var-imageUrl', name: 'imageUrl' },
    { id: 'var-action', name: 'action' }
  ];

  const edges = [
    { id: 'edge-0', from: { eventId: 'event-start' }, to: { groupId: 'group-start' } },
    { id: 'edge-1', from: { blockId: 'block-input-name' }, to: { groupId: 'group-prod' } },
    { id: 'edge-2', from: { blockId: 'block-input-prod' }, to: { groupId: 'group-qty' } },
    { id: 'edge-3', from: { blockId: 'block-input-qty' }, to: { groupId: 'group-search' } }
  ];

  const theme = { general: {}, chat: {} };
  const settings = { general: {} };
  const events = [
    {
      id: 'event-start',
      type: 'start',
      graphCoordinates: { x: 0, y: 0 }
    }
  ];

  await client.query(`
    INSERT INTO "Typebot" (id, name, "workspaceId", groups, variables, edges, theme, settings, version, "publicId", events)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (id) DO UPDATE 
    SET groups = EXCLUDED.groups, variables = EXCLUDED.variables, edges = EXCLUDED.edges, theme = EXCLUDED.theme, settings = EXCLUDED.settings, "publicId" = EXCLUDED."publicId", events = EXCLUDED.events
  `, [
    'jgis-publicidad-bot-f33vo50',
    'JGIS Publicidad Bot',
    'workspace-jgis',
    JSON.stringify(groups),
    JSON.stringify(variables),
    JSON.stringify(edges),
    JSON.stringify(theme),
    JSON.stringify(settings),
    '6',
    'jgis-publicidad-bot-f33vo50',
    JSON.stringify(events)
  ]);

  // 5. Publicar el Typebot para que el Viewer pueda servirlo
  await client.query(`
    INSERT INTO "PublicTypebot" (id, "typebotId", groups, variables, edges, theme, settings, version, events)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO UPDATE 
    SET groups = EXCLUDED.groups, variables = EXCLUDED.variables, edges = EXCLUDED.edges, theme = EXCLUDED.theme, settings = EXCLUDED.settings, events = EXCLUDED.events
  `, [
    'jgis-publicidad-bot-f33vo50',
    'jgis-publicidad-bot-f33vo50',
    JSON.stringify(groups),
    JSON.stringify(variables),
    JSON.stringify(edges),
    JSON.stringify(theme),
    JSON.stringify(settings),
    '6',
    JSON.stringify(events)
  ]);
  
  console.log('Database seeded and published successfully! JGIS Typebot is ready.');
  await client.end();
}

run().catch(err => {
  console.error('Error during database seed:', err);
  process.exit(1);
});
