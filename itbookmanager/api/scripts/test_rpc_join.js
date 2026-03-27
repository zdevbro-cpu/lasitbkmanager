const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testJoinRpc() {
  const sql = `
    SELECT t.qr_code, t.store_id, b.name as store_name 
    FROM tablets t 
    LEFT JOIN branches b ON b.id = t.store_id 
    WHERE t.store_id IS NOT NULL 
    LIMIT 5
  `;
  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: sql,
    params: []
  });
  if (error) { console.error('Error:', error.message); return; }
  console.log('Join Result:', data);
  
  const bcount = await supabase.rpc('exec_sql', { query_text: 'SELECT count(*) FROM branches', params: [] });
  console.log('Branches count:', bcount.data);
}

testJoinRpc();
