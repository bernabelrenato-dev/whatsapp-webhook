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
    
    // 2. Add outgoingEdgeId to name input and quantity input blocks
    groups.forEach(group => {
      group.blocks.forEach(block => {
        if (block.id === 'lowpae24szrntg6o49hctatt') {
          block.outgoingEdgeId = 'jggg68fr9xmzk6htnyu2ib03';
          console.log('Fixed block lowpae24szrntg6o49hctatt (name input):', block);
        }
        if (block.id === 'y3yykv4gdbpas96vgy2sn1iy') {
          block.outgoingEdgeId = 'qhd1wz9km1hc2zdy3che0cvx';
          console.log('Fixed block y3yykv4gdbpas96vgy2sn1iy (quantity input):', block);
        }
      });
    });
    
    // 3. Generate SQL update statement
    const escapedGroups = JSON.stringify(groups).replace(/'/g, "''");
    
    const sqlContent = `
UPDATE "Typebot" SET "groups" = '${escapedGroups}'::jsonb WHERE "id" = '${botId}';
UPDATE "PublicTypebot" SET "groups" = '${escapedGroups}'::jsonb WHERE "typebotId" = '${botId}';
`;

    const sqlPath = path.join(__dirname, 'fix-blocks-outgoing-edges.sql');
    fs.writeFileSync(sqlPath, sqlContent, 'utf8');
    
    // 4. Copy and execute in DB
    execSync(`docker cp ${sqlPath} typebot-db:/tmp/fix-blocks-outgoing-edges.sql`);
    const dbResult = execSync(`docker exec typebot-db psql -U postgres -d typebot -f /tmp/fix-blocks-outgoing-edges.sql`).toString();
    console.log('Database update result:\n', dbResult);
    
    // 5. Test continueChat flow programmatically!
    console.log('\nTesting continueChat with name "Renato" on a new session...');
    const axios = require('axios');
    const startRes = await axios.post(`http://localhost:8082/api/v1/typebots/jgis-publicidad-bot-f33vo50/startChat`, {});
    const sessionId = startRes.data.sessionId;
    
    const continueRes = await axios.post(`http://localhost:8082/api/v1/sessions/${sessionId}/continueChat`, {
      message: {
        type: 'text',
        text: 'Renato'
      }
    });
    console.log('continueChat Status:', continueRes.status);
    console.log('continueChat Response Messages:', JSON.stringify(continueRes.data.messages.map(m => m.content?.richText?.[0]?.children?.[0]?.text || m), null, 2));
    
  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.message);
    }
  }
}

main();
