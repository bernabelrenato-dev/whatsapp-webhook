const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const botId = 'o6jypntclntjiubkcf33vo50';
    
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
        to: { groupId: 'exao9trxde9luucdfikqaszb' } // Connecting back to the group
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
    
    const escapedEvents = JSON.stringify(events).replace(/'/g, "''");
    const escapedEdges = JSON.stringify(edges).replace(/'/g, "''");
    
    const sqlContent = `
UPDATE "Typebot" SET "events" = '${escapedEvents}'::jsonb, "edges" = '${escapedEdges}'::jsonb WHERE "id" = '${botId}';
UPDATE "PublicTypebot" SET "events" = '${escapedEvents}'::jsonb, "edges" = '${escapedEdges}'::jsonb WHERE "typebotId" = '${botId}';
`;

    const sqlPath = path.join(__dirname, 'apply-valentina-full-fix.sql');
    fs.writeFileSync(sqlPath, sqlContent, 'utf8');
    
    // Copy and execute in DB
    execSync(`docker cp ${sqlPath} typebot-db:/tmp/apply-valentina-full-fix.sql`);
    const dbResult = execSync(`docker exec typebot-db psql -U postgres -d typebot -f /tmp/apply-valentina-full-fix.sql`).toString();
    console.log('Database update result:\n', dbResult);
    
    // Test startChat
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
