require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePassword(email, newPassword) {
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === email);
  
  if (!user) {
    console.error(`User ${email} not found in Supabase.`);
    return;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword
  });

  if (error) {
    console.error(`Error updating password for ${email}:`, error.message);
  } else {
    console.log(`Successfully updated password for ${email}.`);
  }
}

updatePassword('admin@las.com', '123456');
