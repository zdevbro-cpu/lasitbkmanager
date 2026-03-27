const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { db } = require('../dist/db');

async function checkJoin() {
  const result = await db.query(
    `SELECT count(*) FROM tablets t JOIN branches b ON b.id = t.store_id`,
    []
  );
  console.log('Join Count:', result.rows[0]);
  
  const sample = await db.query(
    `SELECT t.qr_code, t.store_id, b.name as store_name 
     FROM tablets t 
     LEFT JOIN branches b ON b.id = t.store_id 
     LIMIT 5`,
    []
  );
  console.log('Sample Tablets:', sample.rows);
}

checkJoin().catch(console.error);
