const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const botId = 'test-bot-12345';
    const workspaceId = 'cmrmhukft00002lnhgzcmtgft';
    const startEventId = 'start-event-1';
    const groupId = 'group-1';
    const blockId = 'text-block-1';
    
    const groups = [
      {
        id: groupId,
        title: 'Group #1',
        blocks: [
          {
            id: blockId,
            type: 'text',
            content: {
              richText: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'Hola, esta es una prueba.'
                    }
                  ]
                }
              ]
            }
          }
        ],
        graphCoordinates: { x: 200, y: 100 }
      }
    ];
    
    const edges = [
      {
        id: 'edge-1',
        from: { eventId: startEventId },
        to: { groupId: groupId }
      }
    ];
    
    const events = [
      {
        id: startEventId,
        type: 'start',
        graphCoordinates: { x: 0, y: 100 }
      }
    ];
    
    const escapedGroups = JSON.stringify(groups).replace(/'/g, "''");
    const escapedEdges = JSON.stringify(edges).replace(/'/g, "''");
    const escapedEvents = JSON.stringify(events).replace(/'/g, "''");
    
    const sqlContent = `
-- Delete existing test bot if any
DELETE FROM "PublicTypebot" WHERE "typebotId" = '${botId}';
DELETE FROM "Typebot" WHERE "id" = '${botId}';

-- Insert into Typebot (development)
INSERT INTO "Typebot" (
  "id", "createdAt", "updatedAt", "name", "groups", "variables", "edges", "theme", "settings", 
  "publicId", "workspaceId", "isArchived", "isClosed", "version", "events"
) VALUES (
  '${botId}', NOW(), NOW(), 'Test Bot', '${escapedGroups}'::jsonb, '[]'::jsonb, '${escapedEdges}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  '${botId}', '${workspaceId}', false, false, '6.1', '${escapedEvents}'::jsonb
);

-- Insert into PublicTypebot (published)
INSERT INTO "PublicTypebot" (
  "id", "typebotId", "createdAt", "updatedAt", "groups", "variables", "edges", "theme", "settings",
  "events", "version"
) VALUES (
  'public-test-bot-12345', '${botId}', NOW(), NOW(), '${escapedGroups}'::jsonb, '[]'::jsonb, '${escapedEdges}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  '${escapedEvents}'::jsonb, '6.1'
);
`;

    const sqlPath = path.join(__dirname, 'create-test-bot.sql');
    fs.writeFileSync(sqlPath, sqlContent, 'utf8');
    console.log('SQL generated at:', sqlPath);
    
    // Copy and execute in DB container
    execSync(`docker cp ${sqlPath} typebot-db:/tmp/create-test-bot.sql`);
    const dbResult = execSync(`docker exec typebot-db psql -U postgres -d typebot -f /tmp/update-edges.sql`).toString();
    const dbResult2 = execSync(`docker exec typebot-db psql -U postgres -d typebot -f /tmp/create-test-bot.sql`).toString();
    console.log('Database insert result:\n', dbResult2);
    
    // 5. Test starting chat
    console.log('Testing startChat for new bot...');
    const axios = require('axios');
    const response = await axios.post(`http://localhost:8082/api/v1/typebots/${botId}/startChat`, {});
    console.log('startChat Status:', response.status);
    console.log('startChat Response:', JSON.stringify(response.data, null, 2));

  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, JSON.stringify(err.response.data));
    } else {
      console.error('Error:', err.message);
    }
  }
}

main();
