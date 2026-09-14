import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(request) {
  const { nama, email, password } = await request.json();

  if (!nama || !email || !password) {
    return NextResponse.json({ error: 'Semua kolom wajib diisi.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Kata sandi minimal 6 karakter.' }, { status: 400 });
  }

  const { data: sudahAda } = await supabase.from('guru').select('id').eq('email', email).single();
  if (sudahAda) {
    return NextResponse.json({ error: 'Email ini sudah terdaftar.' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('guru')
    .insert([{ nama, email, password: hash }])
    .select('id, nama, email')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ guru: data });
}
