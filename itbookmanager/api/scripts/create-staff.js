/**
 * One-off script to create a staff user with a specific password.
 * Usage: node scripts/create-staff.js
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
  const email    = 'gospress.dckwak@gmail.com';
  const password = '123456';
  const name     = '영크리에이터';
  const role     = 'young_creator';

  // Check if already exists in DB
  const exists = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
  if (exists.rows.length > 0) {
    console.log('이미 존재하는 계정입니다:', exists.rows[0].id);
    await pool.end();
    process.exit(0);
  }

  // Create Firebase user
  let firebaseUser;
  try {
    firebaseUser = await admin.auth().createUser({ email, password, displayName: name });
    console.log('Firebase 사용자 생성:', firebaseUser.uid);
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      firebaseUser = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(firebaseUser.uid, { password, displayName: name });
      console.log('Firebase 기존 사용자 비밀번호 업데이트:', firebaseUser.uid);
    } else {
      throw e;
    }
  }

  // Insert into DB
  const result = await pool.query(
    `INSERT INTO admin_users (firebase_uid, name, email, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [firebaseUser.uid, name, email, role]
  );
  console.log('DB 등록 완료:', result.rows[0]);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
