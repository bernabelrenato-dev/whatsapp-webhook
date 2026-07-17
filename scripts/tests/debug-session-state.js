const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const botId = 'o6jypntclntjiubkcf33vo50';
    const blockWebhookId = 'wb7k4o8xroumbd8kpg4qkbq6';
    
    // 1. Fetch current groups
    const groupsOutput = execSync(`docker exec typebot-db psql -U postgres -d typebot -t -A -c "SELECT groups FROM \\"Typebot\\" WHERE id = '${botId}';"`).toString().trim();
    if (!groupsOutput) {
      console.log('Could not fetch groups');
      return;
    }
    
    const groups = JSON.parse(groupsOutput);
    
    // 2. Add a dummy text input block at the end of the last group to pause execution!
    const lastGroup = groups.find(g => g.id === 'nmotxvmc5wj9ptwsabshvosr');
    
    // Remove previous dummy blocks if any, then add it
    lastGroup.blocks = lastGroup.blocks.filter(b => b.id !== 'dummy-text-input-id');
    lastGroup.blocks.push({
      id: 'dummy-text-input-id',
      type: 'text input',
      options: {
        labels: {
          placeholder: 'Escribe algo para finalizar...'
        }
      }
    });
    
    const escapedGroups = JSON.stringify(groups).replace(/'/g, "''");
    
    // 3. Write SQL to file and execute
    const sqlContent = `
UPDATE "Typebot" SET "groups" = '${escapedGroups}'::jsonb WHERE "id" = '${botId}';
UPDATE "PublicTypebot" SET "groups" = '${escapedGroups}'::jsonb WHERE "typebotId" = '${botId}';
`;
    const sqlPath = path.join(__dirname, '..', 'database', 'debug-session-state.sql');
    fs.writeFileSync(sqlPath, sqlContent, 'utf8');
    
    execSync(`docker cp ${sqlPath} typebot-db:/tmp/debug-session-state.sql`);
    execSync(`docker exec typebot-db psql -U postgres -d typebot -f /tmp/debug-session-state.sql`);
    
    console.log('Added dummy block and updated database.');
    
    // 4. Restart container
    execSync('docker restart typebot-viewer');
    await new Promise(r => setTimeout(r, 3000));
    
    // 5. Test flow
    console.log('Testing flow...');
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
    
    console.log('Final Response Status:', finalRes.status);
    console.log('Final Response Data:', JSON.stringify(finalRes.data, null, 2));
    
    // 6. Query ChatSession state from database
    console.log('\nQuerying ChatSession state...');
    const sessionOutput = execSync(`docker exec typebot-db psql -U postgres -d typebot -t -A -c "SELECT state FROM \\"ChatSession\\" WHERE id = '${sessionId}';"`).toString().trim();
    if (sessionOutput) {
      const stateObj = JSON.parse(sessionOutput);
      console.log('Session variables:');
      console.log(JSON.stringify(stateObj.typebotsQueue[0]?.typebot?.variables, null, 2));
    } else {
      console.log('Could not find ChatSession!');
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
