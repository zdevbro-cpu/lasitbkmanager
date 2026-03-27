const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCols() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: "SELECT column_name FROM information_schema.columns WHERE table_name = 'members'"
  });
  if (error) { console.error('Error:', error.message); return; }
  console.log('Columns:', data.map(c => c.column_name).join(', '));
}

checkCols();
