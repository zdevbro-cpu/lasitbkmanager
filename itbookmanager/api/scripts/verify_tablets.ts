import { db } from '../src/db';

async function verify() {
  try {
    const res = await db.query("SELECT 'TAB-000001(TEST1)' SIMILAR TO 'TAB-[0-9]{6}%' AS m");
    console.log('SIMILAR TO:', res.rows[0].m);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

verify();
