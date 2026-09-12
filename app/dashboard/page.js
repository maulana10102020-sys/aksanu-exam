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
    if (!stored) { router.push('/login'); return; }
    const guruData = JSON.parse(stored);
    setGuru(guruData);
    fetchUjian(guruData.id);
  }, [router]);

  async function fetchUjian(guruId) {
    setLoadingUjian(true);
    const { data, error } = await supabase.from('ujian').select('*').eq('guru_id', guruId).order('id', { ascending: false });
    if (!error && data) setUjianList(data);
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
    setEditingId(null); setEditJudul(''); setEditKelas('');
  }
  async function simpanEdit(ujianId) {
    if (!editJudul || !editKelas) return;
    setSavingEdit(true);
    const { error } = await supabase.from('ujian').update({ judul: editJudul, kelas: editKelas }).eq('id', ujianId);
    setSavingEdit(false);
    if (!error) { batalEdit(); fetchUjian(guru.id); }
  }
  async function hapusUjian(ujianId, judul) {
    const yakin = confirm(`Hapus ujian "${judul}"? Semua soal dan jawaban siswa yang terkait akan ikut terhapus.`);
    if (!yakin) return;
    setDeletingId(ujianId);
    await supabase.from('jawaban_siswa').delete().eq('ujian_id', ujianId);
    await supabase.from('soal').delete().eq('ujian_id', ujianId);
    await supabase.from('ujian').delete().eq('id', ujianId);
    setDeletingId(null);
    fetchUjian(guru.id);
  }

  if (!guru) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const inisial = guru.nama ? guru.nama.trim().charAt(0).toUpperCase() : 'G';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #EAF1FB 0%, #F4F7FB 45%, #FCEDE3 100%)',
    }}>
      <header style={{ padding: '1.4rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)', borderBottom: '1px solid var(--line)' }}>
        <p className="gradient-text" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Aksanu</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--brass), var(--brass-strong))',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem', fontWeight: 700,
          }}>
            {inisial}
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', margin: 0 }}>{guru.nama}</p>
          <button onClick={handleLogout} className="btn-text">Keluar</button>
        </div>
      </header>

      <main style={{ maxWidth: '980px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.75rem' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 500, margin: 0 }}>Ujian saya</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/bank-soal" className="btn-text">Bank Soal</a>
          <a href="/ujian/buat" className="btn-primary">Buat ujian baru</a>
        </div>
      </div>

        {loadingUjian && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <div className="spinner" />
          </div>
        )}

        {!loadingUjian && ujianList.length === 0 && (
          <div style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '2rem', background: 'var(--paper-card)' }}>
            <p style={{ color: 'var(--ink-soft)', margin: 0 }}>Belum ada ujian. Buat yang pertama untuk mulai menyusun soal.</p>
          </div>
        )}

        {!loadingUjian && ujianList.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {ujianList.map((ujian) => {
              const terbit = ujian.status === 'terbit';
              const sedangEdit = editingId === ujian.id;

              if (sedangEdit) {
                return (
                  <div key={ujian.id} style={{ background: 'var(--paper-card)', borderRadius: '10px', border: '1px solid var(--brass-strong)', padding: '1.1rem' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>Judul</label>
                    <input type="text" className="input" value={editJudul} onChange={(e) => setEditJudul(e.target.value)} style={{ marginBottom: '0.6rem' }} />
                    <label style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>Kelas</label>
                    <input type="text" className="input" value={editKelas} onChange={(e) => setEditKelas(e.target.value)} style={{ marginBottom: '0.8rem' }} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => simpanEdit(ujian.id)} disabled={savingEdit} className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}>
                        {savingEdit ? '...' : 'Simpan'}
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
                    borderRadius: '10px',
                    border: '1px solid var(--line)',
                    borderTop: `4px solid ${terbit ? 'var(--brass-strong)' : 'var(--line)'}`,
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '170px',
                    opacity: deletingId === ujian.id ? 0.5 : 1,
                    boxShadow: '0 8px 20px -14px rgba(15,42,74,0.25)',
                  }}
                >
                  <div>
                    <p style={{
                      fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 500, margin: '0 0 0.35rem',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {ujian.judul}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: 0 }}>
                      Kelas {ujian.kelas} · {ujian.total_bobot}/100 · {terbit ? 'Terbit' : 'Draf'}
                    </p>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <a href={`/ujian/${ujian.id}/soal`} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', display: 'block', textAlign: 'center', marginBottom: '0.5rem' }}>
                      Kelola soal
                    </a>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem', fontSize: '0.78rem' }}>
                      <a href={`/ujian/${ujian.id}/review`} className="btn-text" style={{ fontSize: '0.78rem' }}>Review</a>
                      <button onClick={() => mulaiEdit(ujian)} className="btn-text" style={{ fontSize: '0.78rem' }}>Edit</button>
                      <button onClick={() => hapusUjian(ujian.id, ujian.judul)} className="btn-text" style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>Hapus</button>
                    </div>
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
