const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUsers() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: "SELECT referral_code, name FROM users WHERE referral_code IS NOT NULL LIMIT 20"
  });
  if (error) { console.error('Error:', error.message); return; }
  console.log('Users:', JSON.stringify(data, null, 2));
}
checkUsers();
