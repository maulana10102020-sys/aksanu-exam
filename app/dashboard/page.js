'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function DashboardPage() {
  const [guru, setGuru] = useState(null);
  const [ujianList, setUjianList] = useState([]);
  const [loadingUjian, setLoadingUjian] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('guru');
    if (!stored) {
      router.push('/login');
      return;
    }
    const guruData = JSON.parse(stored);
    setGuru(guruData);
    fetchUjian(guruData.id);
  }, [router]);

  async function fetchUjian(guruId) {
    setLoadingUjian(true);
    const { data, error } = await supabase
      .from('ujian')
      .select('*')
      .eq('guru_id', guruId)
      .order('id', { ascending: false });

    if (!error && data) {
      setUjianList(data);
    }
    setLoadingUjian(false);
  }

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
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
          Keluar
        </button>
      </div>

      <p style={{ marginBottom: '2rem' }}>
        Selamat datang, <strong>{guru.nama}</strong> 👋
      </p>

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Ujian Saya</h2>
          <a href="/ujian/buat" style={{ padding: '0.5rem 1rem', background: '#111', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '0.9rem' }}>
            + Buat Ujian Baru
          </a>
        </div>

        {loadingUjian && <p style={{ color: '#666' }}>Memuat ujian...</p>}

        {!loadingUjian && ujianList.length === 0 && (
          <p style={{ color: '#666' }}>Belum ada ujian yang dibuat.</p>
        )}

        {!loadingUjian && ujianList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ujianList.map((ujian) => (
              <div key={ujian.id} style={{ border: '1px solid #eee', borderRadius: '6px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 'bold' }}>{ujian.judul}</p>
                  <p style={{ fontSize: '0.85rem', color: '#666' }}>
                    Kelas {ujian.kelas} · Bobot {ujian.total_bobot}/100 · Status: {ujian.status}
                  </p>
                </div>
                <a href={`/ujian/${ujian.id}/soal`} style={{ padding: '0.4rem 0.8rem', background: '#eee', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', color: '#111' }}>
                  Kelola Soal
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}