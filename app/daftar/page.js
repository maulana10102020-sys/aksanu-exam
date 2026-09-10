'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function DaftarPage() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDaftar(e) {
    e.preventDefault();
    setError('');

    if (!nama || !email || !password) {
      setError('Semua kolom wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);

    const { data: sudahAda } = await supabase
      .from('guru')
      .select('id')
      .eq('email', email)
      .single();

    if (sudahAda) {
      setLoading(false);
      setError('Email ini sudah terdaftar. Coba masuk saja.');
      return;
    }

    const { data, error: insertError } = await supabase
      .from('guru')
      .insert([{ nama, email, password }])
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError('Gagal mendaftar: ' + insertError.message);
      return;
    }

    localStorage.setItem('guru', JSON.stringify(data));
    router.push('/dashboard');
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', letterSpacing: '0.02em', color: '#BFD3F2', marginBottom: '0.5rem' }}>
            Aksanu
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.6rem', fontWeight: 500, lineHeight: 1.15, margin: 0, maxWidth: '380px' }}>
            Mulai susun ujian pertamamu hari ini.
          </h1>
        </div>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: '#B7C6E0', maxWidth: '380px', lineHeight: 1.6 }}>
          Daftar sebagai guru, lalu buat ujian, susun soal, dan bagikan satu tautan ke siswa.
        </p>
      </div>

      <div className="auth-form-wrap">
        <form onSubmit={handleDaftar} style={{ width: '100%', maxWidth: '360px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 500, margin: '0 0 0.3rem' }}>
            Daftar sebagai guru
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginBottom: '1.75rem' }}>
            Gratis, tidak perlu kartu kredit.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Nama Lengkap</label>
            <input
              type="text"
              className="input"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kata Sandi</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', textAlign: 'center', marginBottom: '1rem' }}>
            {loading ? 'Mendaftarkan...' : 'Daftar'}
          </button>

          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', textAlign: 'center' }}>
            Sudah punya akun? <a href="/login" style={{ color: 'var(--brass-strong-dark)', fontWeight: 600 }}>Masuk</a>
          </p>
        </form>
      </div>
    </div>
  );
}
