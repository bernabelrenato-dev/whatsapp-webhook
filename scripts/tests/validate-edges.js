const { execSync } = require('child_process');

try {
  console.log('👁️ Consultando grupos y conexiones en vivo desde PostgreSQL...');
  const groupsOutput = execSync('docker exec typebot-db psql -U postgres -d typebot -t -A -c "SELECT groups FROM \\"PublicTypebot\\" WHERE \\"typebotId\\" = \'o6jypntclntjiubkcf33vo50\';"').toString();
  const groups = JSON.parse(groupsOutput.trim());
  
  const groupIds = groups.map(g => g.id);
  const blockIds = groups.flatMap(g => g.blocks).map(b => b.id);
  
  console.log('--- DB GROUPS ---');
  console.log('Group IDs:', groupIds);
  console.log('Block Count:', blockIds.length);
  
  // Now let's fetch edges from the database to see if they are correct
  const edgesOutput = execSync('docker exec typebot-db psql -U postgres -d typebot -t -A -c "SELECT edges FROM \\"PublicTypebot\\" WHERE \\"typebotId\\" = \'o6jypntclntjiubkcf33vo50\';"').toString();
  
  const edges = JSON.parse(edgesOutput.trim());
  console.log('\n--- DB EDGES ---');
  edges.forEach((edge, idx) => {
    const fromId = edge.from.blockId || edge.from.eventId;
    const toGroupId = edge.to.groupId;
    
    const toGroupExists = groupIds.includes(toGroupId);
    console.log(`Edge ${idx + 1}: ${fromId} -> ${toGroupId} (Target Group Exists: ${toGroupExists})`);
  });
} catch (err) {
  console.error('Validation Error:', err.message);
}
