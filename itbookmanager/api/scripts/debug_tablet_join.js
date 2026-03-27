const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugJoin() {
  const sql = `
    SELECT t.qr_code, t.store_id, b.name as store_name, b.id as branch_id
    FROM tablets t 
    LEFT JOIN branches b ON b.id = t.store_id 
    WHERE t.qr_code IN ('TAB-000003', 'TAB-000004', 'TAB-000005')
  `;
  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: sql,
    params: []
  });
  if (error) { console.error('Error:', error.message); return; }
  console.log('Join Result:', JSON.stringify(data, null, 2));
  
  const b = await supabase.rpc('exec_sql', { query_text: "SELECT id, name FROM branches WHERE name = '서초 라스브러리'", params: [] });
  console.log('Seocho Branch in DB:', b.data);
}

debugJoin();
