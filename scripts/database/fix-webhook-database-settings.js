const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const botId = 'o6jypntclntjiubkcf33vo50';
    const blockId = 'wb7k4o8xroumbd8kpg4qkbq6';
    
    // 1. Fetch current groups
    const groupsOutput = execSync(`docker exec typebot-db psql -U postgres -d typebot -t -A -c "SELECT groups FROM \\"Typebot\\" WHERE id = '${botId}';"`).toString().trim();
    if (!groupsOutput) {
      console.log('Could not fetch groups');
      return;
    }
    
    const groups = JSON.parse(groupsOutput);
    
    // 2. Set inline responseMapping options
    groups.forEach(group => {
      group.blocks.forEach(block => {
        if (block.id === blockId) {
          block.options = {
            responseMapping: [
              { bodyPath: 'message', variableId: 't7t3kuz4dnwc5tatsonvjuto' },
              { bodyPath: 'imageUrl', variableId: '869oi7estszj6f951dh643pm' }
            ]
          };
          console.log('Updated inline options for block:', block);
        }
      });
    });
    
    // 3. Generate SQL update statement
    const escapedGroups = JSON.stringify(groups).replace(/'/g, "''");
    
    const sqlContent = `
-- Delete existing webhook record if any
DELETE FROM "Webhook" WHERE "id" = '${blockId}';

-- Insert correct webhook settings
INSERT INTO "Webhook" ("id", "url", "method", "queryParams", "headers", "body", "typebotId", "createdAt", "updatedAt")
VALUES (
  '${blockId}',
  'http://host.docker.internal:3000/api/search',
  'POST',
  '[]'::jsonb,
  '[{"key": "Content-Type", "value": "application/json"}]'::jsonb,
  '{\\n  "query": "{{busquedaProducto}}",\\n  "quantity": {{cantidadSelected}},\\n  "name": "{{nombreClient}}"\\n}',
  '${botId}',
  NOW(),
  NOW()
);

-- Update Typebot and PublicTypebot groups
UPDATE "Typebot" SET "groups" = '${escapedGroups}'::jsonb WHERE "id" = '${botId}';
UPDATE "PublicTypebot" SET "groups" = '${escapedGroups}'::jsonb WHERE "typebotId" = '${botId}';
`;

    const sqlPath = path.join(__dirname, 'fix-webhook-database-settings.sql');
    fs.writeFileSync(sqlPath, sqlContent, 'utf8');
    
    // 4. Copy and execute in DB
    execSync(`docker cp ${sqlPath} typebot-db:/tmp/fix-webhook-database-settings.sql`);
    const dbResult = execSync(`docker exec typebot-db psql -U postgres -d typebot -f /tmp/fix-webhook-database-settings.sql`).toString();
    console.log('Database update result:\n', dbResult);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
