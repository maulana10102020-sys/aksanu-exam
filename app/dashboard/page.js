'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [guru, setGuru] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('guru');
    if (!stored) {
      router.push('/login');
      return;
    }
    setGuru(JSON.parse(stored));
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('guru');
    router.push('/login');
  }

  if (!guru) {
    return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Memuat...</p>;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '3rem auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Dashboard Guru</h1>
        <button
          onClick={handleLogout}
          style={{ padding: '0.5rem 1rem', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
        >
          Keluar
        </button>
      </div>

      <p style={{ marginBottom: '2rem' }}>
        Selamat datang, <strong>{guru.nama}</strong> 👋
      </p>

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Ujian Saya</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>Belum ada ujian yang dibuat.</p>
        
          href="/ujian/buat"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1.2rem',
            background: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          + Buat Ujian Baru
        </a>
      </div>
    </div>
  );
}