/**
 * Bulk create branch manager accounts for all existing stores.
 * Format: [storeCode]admin@las.com / 123456
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const admin = require('firebase-admin');
const { Pool } = require('pg');

// Init Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
});

async function main() {
  console.log('--- 지점 관리자 계정 생성 시작 ---');
  
  // 1. Get all active stores
  const storesRes = await pool.query('SELECT id, code, name FROM stores WHERE is_active = true');
  const stores = storesRes.rows;
  console.log(`총 ${stores.length}개의 활성 지점을 찾았습니다.`);

  const password = '123456';

  for (const store of stores) {
    const email = `${store.code.toLowerCase()}admin@las.com`;
    const name = `${store.name} 관리자`;
    const role = 'store_manager';

    console.log(`\nProcessing: ${store.code} (${store.name}) -> ${email}`);

    // A. Check if user already exists in DB
    const exists = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
    let staffId;

    // B. Create/Update Firebase User
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({ email, password, displayName: name });
      console.log(`- Firebase 사용자 생성 완료: ${firebaseUser.uid}`);
    } catch (e) {
      if (e.code === 'auth/email-already-exists' || e.code === 'auth/uid-already-exists') {
        firebaseUser = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(firebaseUser.uid, { password, displayName: name });
        console.log(`- Firebase 기존 사용자 업데이트 완료: ${firebaseUser.uid}`);
      } else {
        console.error(`- Firebase 오류 (${email}):`, e.message);
        continue;
      }
    }

    // C. Insert/Update in DB
    if (exists.rows.length > 0) {
      await pool.query(
        `UPDATE admin_users 
         SET firebase_uid = $1, name = $2, role = $3, store_id = $4, is_active = true
         WHERE email = $5`,
        [firebaseUser.uid, name, role, store.id, email]
      );
      console.log(`- DB 기존 정보 업데이트 완료`);
    } else {
      await pool.query(
        `INSERT INTO admin_users (firebase_uid, name, email, role, store_id, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [firebaseUser.uid, name, email, role, store.id]
      );
      console.log(`- DB 신규 등록 완료`);
    }
  }

  console.log('\n--- 모든 작업이 완료되었습니다 ---');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
