const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const botId = 'o6jypntclntjiubkcf33vo50';
    
    // 1. Fetch current groups
    const groupsOutput = execSync(`docker exec typebot-db psql -U postgres -d typebot -t -A -c "SELECT groups FROM \\"Typebot\\" WHERE id = '${botId}';"`).toString().trim();
    if (!groupsOutput) {
      console.log('Could not fetch groups');
      return;
    }
    
    const groups = JSON.parse(groupsOutput);
    
    // 2. Change block type from 'webhook' to 'Webhook' (uppercase W)
    groups.forEach(group => {
      group.blocks.forEach(block => {
        if (block.id === 'wb7k4o8xroumbd8kpg4qkbq6') {
          block.type = 'Webhook';
          console.log('Fixed block wb7k4o8xroumbd8kpg4qkbq6 (type to Webhook):', block);
        }
      });
    });
    
    // 3. Generate SQL update statement
    const escapedGroups = JSON.stringify(groups).replace(/'/g, "''");
    
    const sqlContent = `
UPDATE "Typebot" SET "groups" = '${escapedGroups}'::jsonb WHERE "id" = '${botId}';
UPDATE "PublicTypebot" SET "groups" = '${escapedGroups}'::jsonb WHERE "typebotId" = '${botId}';
`;

    const sqlPath = path.join(__dirname, 'fix-webhook-casing.sql');
    fs.writeFileSync(sqlPath, sqlContent, 'utf8');
    
    // 4. Copy and execute in DB
    execSync(`docker cp ${sqlPath} typebot-db:/tmp/fix-webhook-casing.sql`);
    const dbResult = execSync(`docker exec typebot-db psql -U postgres -d typebot -f /tmp/fix-webhook-casing.sql`).toString();
    console.log('Database update result:\n', dbResult);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
