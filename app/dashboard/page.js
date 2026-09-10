'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function DashboardPage() {
  const [guru, setGuru] = useState(null);
  const [ujianList, setUjianList] = useState([]);
  const [loadingUjian, setLoadingUjian] = useState(true);
  const router = useRouter();

  const [editingId, setEditingId] = useState(null);
  const [editJudul, setEditJudul] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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

  function mulaiEdit(ujian) {
    setEditingId(ujian.id);
    setEditJudul(ujian.judul);
    setEditKelas(ujian.kelas);
  }

  function batalEdit() {
    setEditingId(null);
    setEditJudul('');
    setEditKelas('');
  }

  async function simpanEdit(ujianId) {
    if (!editJudul || !editKelas) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from('ujian')
      .update({ judul: editJudul, kelas: editKelas })
      .eq('id', ujianId);
    setSavingEdit(false);
    if (!error) {
      batalEdit();
      fetchUjian(guru.id);
    }
  }

  async function hapusUjian(ujianId, judul) {
    const yakin = confirm(`Hapus ujian "${judul}"? Semua soal dan jawaban siswa yang terkait akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.`);
    if (!yakin) return;

    setDeletingId(ujianId);
    await supabase.from('jawaban_siswa').delete().eq('ujian_id', ujianId);
    await supabase.from('soal').delete().eq('ujian_id', ujianId);
    await supabase.from('ujian').delete().eq('id', ujianId);
    setDeletingId(null);
    fetchUjian(guru.id);
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
              const sedangEdit = editingId === ujian.id;

              if (sedangEdit) {
                return (
                  <div
                    key={ujian.id}
                    style={{
                      background: 'var(--paper-card)',
                      borderRadius: '8px',
                      border: '1px solid var(--brass)',
                      padding: '1.1rem 1.25rem',
                    }}
                  >
                    <div style={{ marginBottom: '0.6rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Judul Ujian</label>
                      <input
                        type="text"
                        className="input"
                        value={editJudul}
                        onChange={(e) => setEditJudul(e.target.value)}
                      />
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Kelas</label>
                      <input
                        type="text"
                        className="input"
                        value={editKelas}
                        onChange={(e) => setEditKelas(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => simpanEdit(ujian.id)}
                        disabled={savingEdit}
                        className="btn-primary"
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                      >
                        {savingEdit ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button onClick={batalEdit} className="btn-text">Batal</button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={ujian.id}
                  style={{
                    background: 'var(--paper-card)',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    borderLeftWidth: '3px',
                    borderLeftColor: terbit ? 'var(--brass)' : 'var(--line)',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: deletingId === ujian.id ? 0.5 : 1,
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => mulaiEdit(ujian)} className="btn-text">Edit</button>
                    <button onClick={() => hapusUjian(ujian.id, ujian.judul)} className="btn-text" style={{ color: 'var(--danger)' }}>Hapus</button>
                    <a href={`/ujian/${ujian.id}/soal`} className="btn-text">Kelola soal</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
