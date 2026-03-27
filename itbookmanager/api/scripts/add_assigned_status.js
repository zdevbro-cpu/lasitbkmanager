const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addEnumValue() {
  const sql = "ALTER TYPE public.tablet_status ADD VALUE IF NOT EXISTS 'assigned';";
  console.log('Running SQL:', sql);
  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: sql,
    params: []
  });
  if (error) {
    if (error.message.includes('already exists')) {
        console.log('Value already exists.');
    } else {
        console.error('Error:', error.message);
        process.exit(1);
    }
  }
  console.log('Success!', data);
}

addEnumValue();
