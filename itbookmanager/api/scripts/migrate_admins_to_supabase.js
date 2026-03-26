require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const pg = require('pg');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const db = new pg.Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function migrateAdmins() {
  await db.connect();
  const resAdmins = await db.query('SELECT name, email FROM admin_users');
  console.log(`Migrating ${resAdmins.rowCount} admins to Supabase...`);

  for (const admin of resAdmins.rows) {
    const tempPassword = 'Login123!@#'; // 임시 비밀번호
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: admin.name }
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`User ${admin.email} already exists in Supabase. Linking...`);
        const { data: users } = await supabase.auth.admin.listUsers();
        const found = users.users.find(u => u.email === admin.email);
        if (found) {
          await db.query('UPDATE admin_users SET auth_uid = $1 WHERE email = $2', [found.id, admin.email]);
          console.log(`Linked ${admin.email} to UID ${found.id}`);
        }
      } else {
        console.error(`Error creating ${admin.email}:`, error.message);
      }
    } else {
      await db.query('UPDATE admin_users SET auth_uid = $1 WHERE email = $2', [user.user.id, admin.email]);
      console.log(`Created and Linked ${admin.email} (UID: ${user.user.id})`);
    }
  }
  await db.end();
}

migrateAdmins();
