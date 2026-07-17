const { execSync } = require('child_process');

try {
  const result = execSync('docker exec typebot-db psql -U postgres -d typebot -c "SELECT * FROM \\"PublicTypebot\\" WHERE \\"typebotId\\" = \'o6jypntclntjiubkcf33vo50\';"').toString();
  console.log(result);
} catch (err) {
  console.error(err.message);
}
