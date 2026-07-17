const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const botId = 'o6jypntclntjiubkcf33vo50';
    const blockWebhookId = 'wb7k4o8xroumbd8kpg4qkbq6';
    
    // 1. Correct events structure
    const events = [
      {
        id: 'v0t2t6oopuj23vdb6tpowo5u',
        type: 'start',
        outgoingEdgeId: 'zw08tj9wol0q2q3i4372hv4r',
        graphCoordinates: { x: 0, y: 150 }
      }
    ];
    
    // 2. Correct edges structure
    const edges = [
      {
        id: 'zw08tj9wol0q2q3i4372hv4r',
        from: { eventId: 'v0t2t6oopuj23vdb6tpowo5u' },
        to: { groupId: 'exao9trxde9luucdfikqaszb' }
      },
      {
        id: 'jggg68fr9xmzk6htnyu2ib03',
        from: { blockId: 'lowpae24szrntg6o49hctatt' },
        to: { groupId: 'ygzfwe3aqdfwfl2b02j3uwao' }
      },
      {
        id: 'qhd1wz9km1hc2zdy3che0cvx',
        from: { blockId: 'y3yykv4gdbpas96vgy2sn1iy' },
        to: { groupId: 'nmotxvmc5wj9ptwsabshvosr' }
      }
    ];
    
    // 3. Fetch and modify groups (blocks)
    const groupsOutput = execSync(`docker exec typebot-db psql -U postgres -d typebot -t -A -c "SELECT groups FROM \\"Typebot\\" WHERE id = '${botId}';"`).toString().trim();
    if (!groupsOutput) {
      console.log('Could not fetch groups');
      return;
    }
    
    const groups = JSON.parse(groupsOutput);
    
    groups.forEach(group => {
      group.blocks.forEach(block => {
        // Fix Name input connection
        if (block.id === 'lowpae24szrntg6o49hctatt') {
          block.outgoingEdgeId = 'jggg68fr9xmzk6htnyu2ib03';
        }
        // Fix Quantity input connection
        if (block.id === 'y3yykv4gdbpas96vgy2sn1iy') {
          block.outgoingEdgeId = 'qhd1wz9km1hc2zdy3che0cvx';
        }
        // Fix Webhook casing and add inline response mapping and isCustomBody
        if (block.id === blockWebhookId) {
          block.type = 'Webhook'; // Capital W!
          block.webhookId = blockWebhookId;
          block.options = {
            isCustomBody: true, // Force the engine to use the custom body template!
            responseMapping: [
              { bodyPath: 'message', variableId: 't7t3kuz4dnwc5tatsonvjuto' },
              { bodyPath: 'imageUrl', variableId: '869oi7estszj6f951dh643pm' }
            ]
          };
        }
      });
    });
    
    const escapedEvents = JSON.stringify(events).replace(/'/g, "''");
    const escapedEdges = JSON.stringify(edges).replace(/'/g, "''");
    const escapedGroups = JSON.stringify(groups).replace(/'/g, "''");
    
    // 4. Generate combined SQL statement
    const sqlContent = `
-- Update Typebot
UPDATE "Typebot" 
SET "events" = '${escapedEvents}'::jsonb, 
    "edges" = '${escapedEdges}'::jsonb, 
    "groups" = '${escapedGroups}'::jsonb 
WHERE "id" = '${botId}';

-- Update PublicTypebot
UPDATE "PublicTypebot" 
SET "events" = '${escapedEvents}'::jsonb, 
    "edges" = '${escapedEdges}'::jsonb, 
    "groups" = '${escapedGroups}'::jsonb 
WHERE "typebotId" = '${botId}';

-- Ensure Webhook table contains connection settings for the HTTP Request
DELETE FROM "Webhook" WHERE "id" = '${blockWebhookId}';
INSERT INTO "Webhook" ("id", "url", "method", "queryParams", "headers", "body", "typebotId", "createdAt", "updatedAt")
VALUES (
  '${blockWebhookId}',
  'http://host.docker.internal:3000/api/search',
  'POST',
  '[]'::jsonb,
  '[{"key": "Content-Type", "value": "application/json"}]'::jsonb,
  '{\\n  "query": "{{busquedaProducto}}",\\n  "quantity": {{cantidadSelected}},\\n  "name": "{{nombreClient}}"\\n}',
  '${botId}',
  NOW(),
  NOW()
);
`;

    const sqlPath = path.join(__dirname, 'apply-permanent-fix.sql');
    fs.writeFileSync(sqlPath, sqlContent, 'utf8');
    
    // 5. Copy and execute in DB
    execSync(`docker cp ${sqlPath} typebot-db:/tmp/apply-permanent-fix.sql`);
    execSync(`docker exec typebot-db psql -U postgres -d typebot -f /tmp/apply-permanent-fix.sql`);
    
    // 6. Test continueChat flow programmatically!
    console.log('\nTesting complete flow on a new session...');
    const axios = require('axios');
    const startRes = await axios.post('http://localhost:8082/api/v1/typebots/jgis-publicidad-bot-f33vo50/startChat', {});
    const sessionId = startRes.data.sessionId;
    
    // Send Renato
    await axios.post(`http://localhost:8082/api/v1/sessions/${sessionId}/continueChat`, {
      message: { type: 'text', text: 'Renato' }
    });
    // Send Category
    await axios.post(`http://localhost:8082/api/v1/sessions/${sessionId}/continueChat`, {
      message: { type: 'text', text: '🏺 Tazas y Mugs' }
    });
    // Send Search Query
    await axios.post(`http://localhost:8082/api/v1/sessions/${sessionId}/continueChat`, {
      message: { type: 'text', text: 'taza con mango' }
    });
    // Send Quantity
    const finalRes = await axios.post(`http://localhost:8082/api/v1/sessions/${sessionId}/continueChat`, {
      message: { type: 'text', text: '100' }
    });
    
    console.log('Final Response:');
    console.log(JSON.stringify(finalRes.data, null, 2));

  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.message);
    }
  }
}

main();
