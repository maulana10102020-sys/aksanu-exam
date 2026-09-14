import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email dan kata sandi wajib diisi.' }, { status: 400 });
  }

  const { data: guruData, error } = await supabase.from('guru').select('*').eq('email', email).single();

  if (error || !guruData) {
    return NextResponse.json({ error: 'Email atau kata sandi tidak cocok.' }, { status: 401 });
  }

  const cocok = await bcrypt.compare(password, guruData.password);
  if (!cocok) {
    return NextResponse.json({ error: 'Email atau kata sandi tidak cocok.' }, { status: 401 });
  }

  const { password: _pw, ...guruTanpaPassword } = guruData;
  return NextResponse.json({ guru: guruTanpaPassword });
}
