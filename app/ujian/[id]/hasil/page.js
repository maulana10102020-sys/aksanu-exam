'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

function cekBenar(soal, jawabanSiswa) {
  const jwb = jawabanSiswa[soal.id];
  if (soal.jenis === 'pg') {
    try { const k = JSON.parse(soal.kunci); return jwb === k.jawaban; } catch (e) { return false; }
  } else if (soal.jenis === 'benar_salah') {
    return jwb === soal.kunci;
  } else if (soal.jenis === 'isian') {
    return !!(jwb && soal.kunci && jwb.trim().toLowerCase() === soal.kunci.trim().toLowerCase());
  } else if (soal.jenis === 'menjodohkan') {
    try {
      const pasangan = JSON.parse(soal.kunci);
      return pasangan.every((p, i) => jwb && jwb[i] && jwb[i].trim().toLowerCase() === p.kanan.trim().toLowerCase());
    } catch (e) { return false; }
  }
  return null;
}

export default function HasilUjianPage() {
  const { id } = useParams();
  const [ujian, setUjian] = useState(null);
  const [soalList, setSoalList] = useState([]);
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: ujianData } = await supabase.from('ujian').select('*').eq('id', id).single();
    const { data: soalData } = await supabase.from('soal').select('*').eq('ujian_id', id).order('id', { ascending: true });
    const { data: siswaData } = await supabase.from('jawaban_siswa').select('*').eq('ujian_id', id).order('nama', { ascending: true });
    setUjian(ujianData);
    setSoalList(soalData || []);
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

  const labelJenis = { pg: 'Pilihan Ganda', benar_salah: 'Benar/Salah', menjodohkan: 'Menjodohkan', isian: 'Isian', uraian: 'Uraian' };

  const statistik = soalList.map((s, idx) => {
    if (s.jenis === 'uraian') {
      return { nomor: idx + 1, jenis: s.jenis, uraian: true };
    }
    let benar = 0;
    daftar.forEach((siswa) => {
      let jawabanParsed = {};
      try { jawabanParsed = JSON.parse(siswa.jawaban || '{}'); } catch (e) {}
      if (cekBenar(s, jawabanParsed)) benar++;
    });
    const total = daftar.length;
    const persen = total > 0 ? Math.round((benar / total) * 100) : 0;
    return { nomor: idx + 1, jenis: s.jenis, benar, total, persen };
  });

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

        {daftar.length > 0 && soalList.length > 0 && (
          <div style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem', background: 'var(--paper-card)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 500, margin: '0 0 1rem' }}>Statistik Soal</h2>
            {statistik.map((st) => (
              <div key={st.nomor} style={{ marginBottom: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                  <span>Soal {st.nomor} <span style={{ color: 'var(--ink-soft)' }}>· {labelJenis[st.jenis]}</span></span>
                  {st.uraian ? (
                    <span style={{ color: 'var(--ink-soft)' }}>Perlu koreksi manual</span>
                  ) : (
                    <span style={{ fontWeight: 600, color: st.persen >= 70 ? 'var(--success)' : st.persen >= 40 ? '#C08829' : 'var(--danger)' }}>
                      {st.benar}/{st.total} benar ({st.persen}%)
                    </span>
                  )}
                </div>
                {!st.uraian && (
                  <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${st.persen}%`,
                      background: st.persen >= 70 ? 'var(--success)' : st.persen >= 40 ? '#C08829' : 'var(--danger)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

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
