'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

export default function HasilUjianPage() {
  const { id } = useParams();
  const [ujian, setUjian] = useState(null);
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: ujianData } = await supabase.from('ujian').select('*').eq('id', id).single();
    const { data: siswaData } = await supabase.from('jawaban_siswa').select('*').eq('ujian_id', id).order('nama', { ascending: true });
    setUjian(ujianData);
    setDaftar(siswaData || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!ujian) {
    return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Ujian tidak ditemukan.</p>;
  }

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <a href={`/ujian/${id}/soal`} style={{ color: '#666', fontSize: '0.9rem', textDecoration: 'none' }}>← Kembali ke Soal</a>
      <h1 style={{ margin: '0.5rem 0' }}>Hasil Ujian</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>{ujian.judul} — Kelas {ujian.kelas}</p>

      {daftar.length === 0 && <p style={{ color: '#666' }}>Belum ada siswa yang mengerjakan.</p>}

      {daftar.map((s) => {
        const totalNilai = Number(s.skor_otomatis || 0) + Number(s.skor_manual || 0);
        return (
          <div key={s.id} style={{ border: '1px solid #eee', borderRadius: '6px', padding: '1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 'bold' }}>{s.nama} <span style={{ fontWeight: 'normal', color: '#666', fontSize: '0.85rem' }}>({s.nis})</span></p>
              <p style={{ fontSize: '0.85rem', color: '#666' }}>
                Kelas {s.kelas} · Nilai: <strong>{totalNilai}</strong> · Status: {s.status}
              </p>
            </div>
            <a href={`/ujian/${id}/hasil/${s.id}`} style={{ padding: '0.4rem 0.8rem', background: '#111', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem' }}>
              Lihat & Koreksi
            </a>
          </div>
        );
      })}
    </div>
  );
}
