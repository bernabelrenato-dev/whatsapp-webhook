const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const botId = 'o6jypntclntjiubkcf33vo50';
    
    // 1. Define events with outgoingEdgeId pointing to the start edge 'zw08tj9wol0q2q3i4372hv4r'
    const events = [
      {
        id: 'v0t2t6oopuj23vdb6tpowo5u',
        type: 'start',
        outgoingEdgeId: 'zw08tj9wol0q2q3i4372hv4r', // Crucial missing link!
        graphCoordinates: { x: 0, y: 150 }
      }
    ];
    
    const escapedEvents = JSON.stringify(events).replace(/'/g, "''");
    
    const sqlContent = `
UPDATE "Typebot" SET "events" = '${escapedEvents}'::jsonb WHERE "id" = '${botId}';
UPDATE "PublicTypebot" SET "events" = '${escapedEvents}'::jsonb WHERE "typebotId" = '${botId}';
`;

    const sqlPath = path.join(__dirname, 'fix-valentina-start-event.sql');
    fs.writeFileSync(sqlPath, sqlContent, 'utf8');
    
    // Copy and execute in DB
    execSync(`docker cp ${sqlPath} typebot-db:/tmp/fix-valentina-start-event.sql`);
    const dbResult = execSync(`docker exec typebot-db psql -U postgres -d typebot -f /tmp/fix-valentina-start-event.sql`).toString();
    console.log('Database update result:\n', dbResult);
    
    // Test startChat again
    console.log('Testing startChat for Valentina...');
    const axios = require('axios');
    const response = await axios.post(`http://localhost:8082/api/v1/typebots/jgis-publicidad-bot-f33vo50/startChat`, {});
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
