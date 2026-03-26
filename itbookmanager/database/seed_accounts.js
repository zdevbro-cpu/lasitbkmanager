/**
 * 계정 생성 스크립트
 * 실행: node database/seed_accounts.js
 */

require('dotenv').config({ path: './api/.env' });
const admin = require('firebase-admin');
const { Pool } = require('pg');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
});

const ACCOUNTS = [
  {
    type: 'admin',
    role: 'superadmin',
    name: '관리자',
    email: 'admin@las.com',
    password: '123456',
  },
  {
    type: 'member',
    memberType: 'managed',
    name: '회원01',
    email: 'm01@las.com',
    password: '123456',
    phone: '010-0000-0001',
    planAmount: 1200000,
    planDiscountedAmt: 900000,
  },
];

async function createOrGetFirebaseUser(email, password, displayName) {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    console.log(`  [기존] Firebase: ${email} (uid: ${existing.uid})`);
    // 비밀번호 업데이트
    await admin.auth().updateUser(existing.uid, { password, displayName });
    return existing.uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  const user = await admin.auth().createUser({ email, password, displayName });
  console.log(`  [신규] Firebase: ${email} (uid: ${user.uid})`);
  return user.uid;
}

async function generateMemberNumber(client) {
  const now = new Date();
  const prefix = `MB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;
  const result = await client.query(
    `SELECT COUNT(*) FROM members WHERE member_number LIKE $1`, [prefix + '%']
  );
  return prefix + String(parseInt(result.rows[0].count) + 1).padStart(3, '0');
}

async function main() {
  console.log('=== 계정 생성 시작 ===\n');

  for (const acc of ACCOUNTS) {
    console.log(`[${acc.type.toUpperCase()}] ${acc.email}`);
    const uid = await createOrGetFirebaseUser(acc.email, acc.password, acc.name);

    if (acc.type === 'admin') {
      await db.query(
        `INSERT INTO admin_users (firebase_uid, name, email, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (firebase_uid) DO UPDATE SET name=$2, role=$4`,
        [uid, acc.name, acc.email, acc.role]
      );
      console.log(`  DB: admin_users 저장 (role: ${acc.role})\n`);

    } else {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const memberNumber = await generateMemberNumber(client);
        await client.query(
          `INSERT INTO members
             (firebase_uid, member_number, name, email, phone,
              member_type, member_status,
              plan_amount, plan_discounted_amt,
              joined_at, payment_start_date, current_week)
           VALUES ($1,$2,$3,$4,$5,$6::member_type,'active',$7,$8,NOW(),NOW(),1)
           ON CONFLICT (firebase_uid) DO UPDATE SET
             name=$3, member_type=$6::member_type,
             plan_amount=$7, plan_discounted_amt=$8,
             member_status='active'`,
          [uid, memberNumber, acc.name, acc.email, acc.phone,
           acc.memberType, acc.planAmount, acc.planDiscountedAmt]
        );
        await client.query('COMMIT');
        console.log(`  DB: members 저장 (번호: ${memberNumber}, 유형: ${acc.memberType})\n`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  }

  console.log('=== 완료 ===');
  console.log('┌──────────────────────────────────────────────┐');
  ACCOUNTS.forEach(a => {
    const role = a.type === 'admin' ? `관리자` : `회원(${a.memberType})`;
    console.log(`  [${role}]  ${a.email}  /  ${a.password}`);
  });
  console.log('└──────────────────────────────────────────────┘');

  await db.end();
  process.exit(0);
}

main().catch(e => { console.error('오류:', e.message); process.exit(1); });
