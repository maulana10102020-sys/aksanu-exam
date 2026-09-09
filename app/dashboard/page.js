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
    return <p style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Memuat...</p>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <header style={{ borderBottom: '1px solid var(--line)', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: 0 }}>Aksanu</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', margin: 0 }}>{guru.nama}</p>
          <button onClick={handleLogout} className="btn-text">Keluar</button>
        </div>
      </header>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', fontWeight: 500, margin: 0 }}>Ujian saya</h1>
          <a href="/ujian/buat" className="btn-primary">Buat ujian baru</a>
        </div>

        {loadingUjian && <p style={{ color: 'var(--ink-soft)' }}>Memuat daftar ujian...</p>}

        {!loadingUjian && ujianList.length === 0 && (
          <div style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '2rem', background: 'var(--paper-card)' }}>
            <p style={{ color: 'var(--ink-soft)', margin: 0 }}>
              Belum ada ujian. Buat yang pertama untuk mulai menyusun soal.
            </p>
          </div>
        )}

        {!loadingUjian && ujianList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ujianList.map((ujian) => {
              const terbit = ujian.status === 'terbit';
              return (
                <div
                  key={ujian.id}
                  style={{
                    background: 'var(--paper-card)',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${terbit ? 'var(--brass)' : 'var(--line)'}`,
                    border: '1px solid var(--line)',
                    borderLeftWidth: '3px',
                    borderLeftColor: terbit ? 'var(--brass)' : 'var(--line)',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 500, margin: '0 0 0.25rem' }}>
                      {ujian.judul}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: 0 }}>
                      Kelas {ujian.kelas} · Bobot {ujian.total_bobot}/100 · {terbit ? 'Terbit' : 'Draf'}
                    </p>
                  </div>
                  <a href={`/ujian/${ujian.id}/soal`} className="btn-text">
                    Kelola soal
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
