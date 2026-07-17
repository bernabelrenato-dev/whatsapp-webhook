const { execSync } = require('child_process');

async function main() {
  try {
    const typebotId = 'o6jypntclntjiubkcf33vo50';
    
    // 1. Fetch current edges
    const edgesOutput = execSync(`docker exec typebot-db psql -U postgres -d typebot -t -A -c "SELECT edges FROM \\"Typebot\\" WHERE id = '${typebotId}';"`).toString().trim();
    if (!edgesOutput) {
      console.log('Could not fetch edges');
      return;
    }
    
    const edges = JSON.parse(edgesOutput);
    
    // 2. Find start edge and modify it to contain both groupId and blockId
    const startEventId = 'v0t2t6oopuj23vdb6tpowo5u';
    const targetGroupId = 'exao9trxde9luucdfikqaszb'; // Bienvenida
    const firstBlockId = 'jjwlh0ntrioy1rf7cjlz8m5v'; // The welcome text block
    
    edges.forEach(edge => {
      if (edge.from.eventId === startEventId) {
        edge.to.groupId = targetGroupId;
        edge.to.blockId = firstBlockId;
        console.log('Modified edge:', edge);
      }
    });
    
    // 3. Generate SQL update statement
    const escapedEdges = JSON.stringify(edges).replace(/'/g, "''");
    
    const sqlContent = `
UPDATE "Typebot" SET "edges" = '${escapedEdges}'::jsonb WHERE "id" = '${typebotId}';
UPDATE "PublicTypebot" SET "edges" = '${escapedEdges}'::jsonb WHERE "typebotId" = '${typebotId}';
`;
    
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, 'update-edges-v2.sql');
    fs.writeFileSync(sqlPath, sqlContent, 'utf8');
    
    // 4. Copy and execute in DB container
    execSync(`docker cp ${sqlPath} typebot-db:/tmp/update-edges-v2.sql`);
    const dbResult = execSync(`docker exec typebot-db psql -U postgres -d typebot -f /tmp/update-edges-v2.sql`).toString();
    console.log('Database update result:\n', dbResult);
    
  } catch (err) {
    console.error('Error modifying edges:', err.message);
  }
}

main();
