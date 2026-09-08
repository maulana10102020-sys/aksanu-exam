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
      setError('Email atau password salah.');
      return;
    }

    // Simpan info guru yang login (sementara pakai localStorage, sederhana dulu)
    localStorage.setItem('guru', JSON.stringify(data));
    router.push('/dashboard');
  }

  return (
    <div style={{ maxWidth: '360px', margin: '4rem auto', padding: '2rem', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Login Guru</h1>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
        {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.6rem', background: '#111', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}