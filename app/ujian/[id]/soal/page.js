'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

export default function KelolaSoalPage() {
  const { id } = useParams();
  const router = useRouter();

  const [ujian, setUjian] = useState(null);
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [jenis, setJenis] = useState('pg');
  const [pertanyaan, setPertanyaan] = useState('');
  const [bobot, setBobot] = useState('');
  const [kunci, setKunci] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('guru');
    if (!stored) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: ujianData } = await supabase.from('ujian').select('*').eq('id', id).single();
    const { data: soalData } = await supabase.from('soal').select('*').eq('ujian_id', id).order('id', { ascending: true });
    setUjian(ujianData);
    setSoalList(soalData || []);
    setLoading(false);
  }

  const totalBobot = soalList.reduce((sum, s) => sum + Number(s.bobot || 0), 0);
  let statusColor = '#e0a800';
  let statusText = `🟡 Total Bobot: ${totalBobot} / 100 — masih tersedia ${100 - totalBobot} poin`;
  if (totalBobot === 100) {
    statusColor = '#28a745';
    statusText = `🟢 Total Bobot: 100 / 100 — VALID`;
  } else if (totalBobot > 100) {
    statusColor = '#dc3545';
    statusText = `🔴 Total Bobot: ${totalBobot} / 100 — kelebihan ${totalBobot - 100} poin`;
  }

  async function handleAddSoal(e) {
    e.preventDefault();
    setError('');

    if (!pertanyaan || !bobot) {
      setError('Pertanyaan dan bobot wajib diisi.');
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from('soal').insert([
      {
        ujian_id: id,
        jenis: jenis,
        pertanyaan: pertanyaan,
        bobot: Number(bobot),
        kunci: kunci,
      },
    ]);
    setSaving(false);

    if (insertError) {
      setError('Gagal menyimpan: ' + insertError.message);
      return;
    }

    setPertanyaan('');
    setBobot('');
    setKunci('');
    fetchData();
  }

  async function handleDeleteSoal(soalId) {
    if (!confirm('Hapus soal ini?')) return;
    await supabase.from('soal').delete().eq('id', soalId);
    fetchData();
  }

  if (loading) {
    return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Memuat...</p>;
  }

  if (!ujian) {
    return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Ujian tidak ditemukan.</p>;
  }

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <a href="/dashboard" style={{ color: '#666', fontSize: '0.9rem', textDecoration: 'none' }}>← Kembali ke Dashboard</a>
      <h1 style={{ margin: '0.5rem 0' }}>{ujian.judul}</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Kelas {ujian.kelas}</p>

      <div style={{ padding: '0.8rem 1rem', background: statusColor, color: '#fff', borderRadius: '6px', marginBottom: '2rem', fontWeight: 'bold' }}>
        {statusText}
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Tambah Soal</h2>
        <form onSubmit={handleAddSoal}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Jenis Soal</label>
            <select value={jenis} onChange={(e) => setJenis(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}>
              <option value="pg">Pilihan Ganda</option>
              <option value="benar_salah">Benar/Salah</option>
              <option value="menjodohkan">Menjodohkan</option>
              <option value="isian">Isian</option>
              <option value="uraian">Uraian</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Pertanyaan</label>
            <textarea
              value={pertanyaan}
              onChange={(e) => setPertanyaan(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Kunci Jawaban</label>
            <input
              type="text"
              value={kunci}
              onChange={(e) => setKunci(e.target.value)}
              placeholder="Contoh: C, atau Benar, atau isi jawaban"
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Bobot (poin)</label>
            <input
              type="number"
              value={bobot}
              onChange={(e) => setBobot(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>
          {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
          <button type="submit" disabled={saving} style={{ padding: '0.6rem 1.2rem', background: '#111', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {saving ? 'Menyimpan...' : '+ Tambah Soal'}
          </button>
        </form>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Daftar Soal ({soalList.length})</h2>
      {soalList.length === 0 && <p style={{ color: '#666' }}>Belum ada soal.</p>}
      {soalList.map((s, i) => (
        <div key={s.id} style={{ border: '1px solid #eee', borderRadius: '6px', padding: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 'bold' }}>Soal {i + 1} — {s.jenis} — {s.bobot} poin</p>
            <button onClick={() => handleDeleteSoal(s.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Hapus</button>
          </div>
          <p>{s.pertanyaan}</p>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>Kunci: {s.kunci}</p>
        </div>
      ))}
    </div>
  );
}