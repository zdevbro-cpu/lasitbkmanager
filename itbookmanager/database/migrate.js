const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'itbookmanager',
};

async function migrate() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log(`Connected to ${DB_CONFIG.database} @ ${DB_CONFIG.host}`);

  const sqlDir = __dirname;
  const files = fs.readdirSync(sqlDir)
    .filter(f => f.match(/^\d{3}_.*\.sql$/))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
    console.log(`Running ${file}...`);
    try {
      await client.query(sql);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`  ~ ${file} (already exists, skipping)`);
      } else {
        console.error(`  ✗ ${file}: ${err.message}`);
        await client.end();
        process.exit(1);
      }
    }
  }

  await client.end();
  console.log('\nMigration complete.');
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
