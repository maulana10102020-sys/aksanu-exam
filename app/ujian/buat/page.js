'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function BuatUjianPage() {
  const [judul, setJudul] = useState('');
  const [kelas, setKelas] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const guruStr = localStorage.getItem('guru');
    if (!guruStr) {
      router.push('/login');
      return;
    }
    const guru = JSON.parse(guruStr);

    const { data, error: insertError } = await supabase
      .from('ujian')
      .insert([
        {
          guru_id: guru.id,
          judul: judul,
          kelas: kelas,
          total_bobot: 0,
          status: 'draft',
        },
      ])
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError('Gagal menyimpan: ' + insertError.message);
      return;
    }

    // Nanti diarahkan ke halaman tambah soal untuk ujian ini
    router.push('/dashboard');
  }

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto', padding: '2rem', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Buat Ujian Baru</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Judul Ujian</label>
          <input
            type="text"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: Ujian Akhir Semester Akhlak"
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Kelas</label>
          <input
            type="text"
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            placeholder="Contoh: XII"
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
          {loading ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
        </button>
      </form>
    </div>
  );
}
