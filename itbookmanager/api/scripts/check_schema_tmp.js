const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const sql = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tablets'`;
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql, params: [] });
  console.log(error ? error : data);
}
check();
