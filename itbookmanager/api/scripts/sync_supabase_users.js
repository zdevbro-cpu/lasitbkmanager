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

async function syncUsers() {
  await db.connect();
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }

  console.log(`Found ${users.length} users in Supabase.`);
  for (const user of users) {
    const res = await db.query(
      'UPDATE admin_users SET auth_uid = $1 WHERE email = $2 RETURNING id',
      [user.id, user.email]
    );
    if (res.rowCount > 0) {
      console.log(`Updated admin_user: ${user.email} -> ${user.id}`);
    } else {
      const resMember = await db.query(
        'UPDATE members SET auth_uid = $1 WHERE email = $2 RETURNING id',
        [user.id, user.email]
      );
      if (resMember.rowCount > 0) {
        console.log(`Updated member: ${user.email} -> ${user.id}`);
      } else {
        console.log(`User ${user.email} not found in DB.`);
      }
    }
  }
  await db.end();
}

syncUsers();
