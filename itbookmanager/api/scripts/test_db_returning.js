require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { db } = require('../dist/db'); // Use dist/db if it's compiled, or use ts-node for src/db

async function testUpdate() {
  const result = await db.query(
    "UPDATE tablets SET notes = 'test' WHERE qr_code = 'TAB-000001' RETURNING id",
    []
  );
  console.log('Result Rows:', result.rows);
  console.log('Result rowCount:', result.rowCount);
}

testUpdate();
