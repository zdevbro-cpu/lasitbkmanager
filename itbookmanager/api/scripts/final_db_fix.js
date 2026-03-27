const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDataOnceAndForAll() {
  console.log('🚀 Fixing Database State...');
  
  // 1. Tablets: Assign status to assigned where assigned to store or sub_store
  // store_id IS NOT NULL OR sub_store_name IS NOT NULL
  const sqlTablets = "UPDATE tablets SET status = 'assigned' WHERE (store_id IS NOT NULL OR sub_store_name IS NOT NULL) AND status = 'stock';";
  console.log('  🔄 Updating tablet statuses...');
  const r1 = await supabase.rpc('exec_sql', { query_text: sqlTablets, params: [] });
  if (r1.error) console.error('  ❌ Tablets error:', r1.error.message);
  else console.log('  ✅ Tablet statuses updated.');

  // 2. Members: Sync qr_code with member_number (No MBR- prefix)
  console.log('  🔄 Syncing member QR codes with member numbers...');
  const sqlMembers = "UPDATE members SET qr_code = member_number WHERE qr_code IS NULL OR qr_code LIKE 'MBR-%';";
  const r2 = await supabase.rpc('exec_sql', { query_text: sqlMembers, params: [] });
  if (r2.error) console.error('  ❌ Members error:', r2.error.message);
  else console.log('  ✅ Member QR codes synced.');

  console.log('\n🎉 Database Fix Complete!');
}

fixDataOnceAndForAll();
