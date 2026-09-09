'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: queryError } = await supabase
      .from('guru')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    setLoading(false);

    if (queryError || !data) {
      setError('Email atau kata sandi tidak cocok. Coba lagi.');
      return;
    }

    localStorage.setItem('guru', JSON.stringify(data));
    router.push('/dashboard');
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', letterSpacing: '0.02em', color: '#C9B79A', marginBottom: '0.5rem' }}>
            Aksanu
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.6rem', fontWeight: 500, lineHeight: 1.15, margin: 0, maxWidth: '380px' }}>
            Susun, terbitkan, dan nilai ujian tanpa berkas kertas.
          </h1>
        </div>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: '#B7BFD1', maxWidth: '380px', lineHeight: 1.6 }}>
          Guru menyusun soal dan bobot nilai, siswa mengerjakan lewat satu tautan, dan hasilnya masuk otomatis.
        </p>
      </div>

      <div className="auth-form-wrap">
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '360px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 500, margin: '0 0 0.3rem' }}>
            Masuk sebagai guru
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginBottom: '1.75rem' }}>
            Kelola ujian dan soal dari sini.
          </p>

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

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
