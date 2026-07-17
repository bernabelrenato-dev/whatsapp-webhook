const fs = require('fs');
const path = require('path');

const jsonPath = 'C:\\Users\\USER\\Downloads\\jgis-whatsapp-bot-flow.json';
const sqlPath = path.join(__dirname, 'update.sql');

try {
  const flow = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const groupsJson = JSON.stringify(flow.groups);
  
  // Escape single quotes for SQL
  const escapedGroups = groupsJson.replace(/'/g, "''");
  
  const sqlContent = `
UPDATE "Typebot" SET "groups" = '${escapedGroups}'::jsonb WHERE "id" = 'o6jypntclntjiubkcf33vo50';
UPDATE "PublicTypebot" SET "groups" = '${escapedGroups}'::jsonb WHERE "typebotId" = 'o6jypntclntjiubkcf33vo50';
`;

  fs.writeFileSync(sqlPath, sqlContent, 'utf8');
  console.log('SQL update file generated successfully at:', sqlPath);
} catch (err) {
  console.error('Error generating SQL file:', err.message);
}
