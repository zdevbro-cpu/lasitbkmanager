import { db } from '../src/db';

async function run() {
  try {
    await db.query('ALTER TABLE tablets ALTER COLUMN qr_code TYPE VARCHAR(255);');
    await db.query('ALTER TABLE tablets ALTER COLUMN serial_number TYPE VARCHAR(255);');
    console.log('ALTER successfully');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
