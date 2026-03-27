const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  console.log('Adding missing columns to members table...');
  const sql = `
    ALTER TABLE members ADD COLUMN IF NOT EXISTS payment_plan_name TEXT;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS plan_amount NUMERIC DEFAULT 0;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS plan_discounted_amt NUMERIC DEFAULT 0;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS payment_method TEXT;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS last_payment_date DATE;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS next_payment_date DATE;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });
  if (error) {
    console.error('Migration Failed:', error.message);
  } else {
    console.log('Migration Successful!');
  }
}

migrate();
