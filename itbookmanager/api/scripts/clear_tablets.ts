import { db } from '../src/db';

async function run() {
  try {
    await db.query('UPDATE members SET current_tablet_id = NULL WHERE 1=1;');
    await db.query('DELETE FROM tablet_loans WHERE 1=1;');
    await db.query('DELETE FROM tablets WHERE 1=1;');
    console.log('All tablets deleted successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
