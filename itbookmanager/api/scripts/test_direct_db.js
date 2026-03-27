const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  console.log('Testing direct connection to:', process.env.DB_HOST);
  try {
    const start = Date.now();
    const res = await pool.query('SELECT NOW()');
    console.log('Success! Latency:', Date.now() - start, 'ms');
    console.log('Result:', res.rows[0]);
    process.exit(0);
  } catch (e) {
    console.error('Failed!', e.message);
    process.exit(1);
  }
}

testConnection();
