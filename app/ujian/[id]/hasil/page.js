'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

export default function HasilUjianPage() {
  const { id } = useParams();
  const [ujian, setUjian] = useState(null);
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: ujianData } = await supabase.from('ujian').select('*').eq('id', id).single();
    const { data: siswaData } = await supabase.from('jawaban_siswa').select('*').eq('ujian_id', id).order('nama', { ascending: true });
    setUjian(ujianData);
    setDaftar(siswaData || []);
    setLoading(false);
  }

  function unduhCSV() {
    const header = ['Nama', 'NIS', 'Kelas', 'Skor Otomatis', 'Skor Manual', 'Total Nilai', 'Status', 'Pelanggaran'];
    const rows = daftar.map((s) => [
      s.nama, s.nis, s.kelas, s.skor_otomatis || 0, s.skor_manual || 0,
      Number(s.skor_otomatis || 0) + Number(s.skor_manual || 0), s.status, s.pelanggaran || 0,
    ]);
    const csvContent = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hasil-${(ujian?.judul || 'ujian').replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const gradasiBg = 'linear-gradient(160deg, #EAF1FB 0%, #F4F7FB 45%, #FCEDE3 100%)';

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: gradasiBg }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!ujian) return <p style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Ujian tidak ditemukan.</p>;

  return (
    <div style={{ minHeight: '100vh', background: gradasiBg }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <a href={`/ujian/${id}/soal`} className="btn-text">← Kembali ke Soal</a>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 500, margin: 0 }}>Hasil Ujian</h1>
          {daftar.length > 0 && (
            <button onClick={unduhCSV} className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Unduh CSV</button>
          )}
        </div>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.75rem' }}>{ujian.judul} — Kelas {ujian.kelas}</p>

        {daftar.length === 0 && (
          <div style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '2rem', background: 'var(--paper-card)' }}>
            <p style={{ color: 'var(--ink-soft)', margin: 0 }}>Belum ada siswa yang mengerjakan.</p>
          </div>
        )}

        {daftar.map((s) => {
          const totalNilai = Number(s.skor_otomatis || 0) + Number(s.skor_manual || 0);
          const sudahDikoreksi = s.status === 'dikoreksi';
          return (
            <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '1.1rem 1.25rem', marginBottom: '0.75rem', background: 'var(--paper-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 20px -16px rgba(15,42,74,0.2)' }}>
              <div>
                <p style={{ fontWeight: 600, margin: '0 0 0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {s.nama} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: '0.85rem' }}>({s.nis})</span>
                  {s.pelanggaran > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#fff', background: 'var(--danger)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                      ⚠ {s.pelanggaran}x keluar tab
                    </span>
                  )}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: 0 }}>
                  Kelas {s.kelas} · Nilai: <strong style={{ color: 'var(--ink)' }}>{totalNilai}</strong> ·{' '}
                  <span style={{ color: sudahDikoreksi ? 'var(--success)' : 'var(--ink-soft)' }}>{sudahDikoreksi ? 'Dikoreksi' : 'Terkirim'}</span>
                </p>
              </div>
              <a href={`/ujian/${id}/hasil/${s.id}`} className="btn-text">Lihat & Koreksi</a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
