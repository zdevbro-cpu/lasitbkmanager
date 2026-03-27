const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const QRCode = require('qrcode');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQr() {
  const code = 'LITB-00001';
  console.log('Generating QR for:', code);
  try {
    const buf = await QRCode.toBuffer(code);
    console.log('Buffer generated! Size:', buf.length);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testQr();
