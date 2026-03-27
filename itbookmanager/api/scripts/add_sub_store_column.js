const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addColumn() {
  const sql = "ALTER TABLE public.tablets ADD COLUMN IF NOT EXISTS sub_store_name character varying(100);";
  console.log('Running SQL:', sql);
  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: sql,
    params: []
  });
  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  console.log('Success!', data);
}

addColumn();
