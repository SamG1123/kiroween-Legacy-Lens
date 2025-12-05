const { Client } = require('pg');

// Try with connection string
const connectionString = 'postgresql://postgres:postgres@127.0.0.1:5433/legacy_code_revival';
console.log('Trying connection:', connectionString);

const client = new Client({
  connectionString,
  connectionTimeoutMillis: 5000,
});

async function test() {
  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('✅ Query successful:', res.rows[0]);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

test();
