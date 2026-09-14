require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: guruList, error } = await supabase.from('guru').select('*');
  if (error) { console.error(error); return; }

  for (const g of guruList) {
    if (g.password && g.password.startsWith('$2')) {
      console.log(`Lewati ${g.email}, sudah di-hash.`);
      continue;
    }
    const hash = await bcrypt.hash(g.password, 10);
    await supabase.from('guru').update({ password: hash }).eq('id', g.id);
    console.log(`Selesai hash untuk ${g.email}`);
  }
  console.log('Migrasi selesai.');
}

run();
