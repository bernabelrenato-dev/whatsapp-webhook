const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@db:5432/typebot',
  });
  await client.connect();
  const res = await client.query('SELECT * FROM "Webhook"');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);
