const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/typebot'
  });
  try {
    await client.connect();
    const res = await client.query('SELECT groups FROM "Typebot" WHERE id = \'o6jypntclntjiubkcf33vo50\'');
    if (res.rows.length === 0) {
      console.log('No flow found');
      return;
    }
    const groups = res.rows[0].groups;
    const webhookBlock = groups
      .flatMap(g => g.blocks)
      .find(b => b.type === 'webhook');
    console.log(JSON.stringify(webhookBlock, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
