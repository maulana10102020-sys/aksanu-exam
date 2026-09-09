'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

function generateKode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let kode = '';
  for (let i = 0; i < 6; i++) {
    kode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return kode;
}

export default function ReviewUjianPage() {
  const { id } = useParams();
  const [ujian, setUjian] = useState(null);
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: ujianData } = await supabase.from('ujian').select('*').eq('id', id).single();
    const { data: soalData } = await supabase.from('soal').select('*').eq('ujian_id', id);
    setUjian(ujianData);
    setSoalList(soalData || []);
    setLoading(false);
  }

  if (loading) {
    return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Memuat...</p>;
  }
  if (!ujian) {
    return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Ujian tidak ditemukan.</p>;
  }

  const totalBobot = soalList.reduce((sum, s) => sum + Number(s.bobot || 0), 0);
  const jumlahSoal = soalList.length;

  const jenisCount = {};
  soalList.forEach((s) => {
    jenisCount[s.jenis] = (jenisCount[s.jenis] || 0) + 1;
  });
  const labelJenis = {
    pg: 'Pilihan Ganda',
    benar_salah: 'Benar/Salah',
    menjodohkan: 'Menjodohkan',
    isian: 'Isian',
    uraian: 'Uraian',
  };

  const masalah = [];
  if (jumlahSoal === 0) masalah.push('Belum ada soal sama sekali.');
  if (totalBobot !== 100) masalah.push(`Total bobot harus tepat 100, saat ini ${totalBobot}.`);

  const valid = masalah.length === 0;

  async function handleTerbitkan() {
    setPublishing(true);
    let kode = ujian.kode_ujian;
    if (!kode) {
      kode = generateKode();
    }
    const { error } = await supabase
      .from('ujian')
      .update({ status: 'terbit', kode_ujian: kode })
      .eq('id', id);
    setPublishing(false);
    if (!error) {
      fetchData();
    }
  }

  const linkUjian = ujian.kode_ujian ? `${origin}/kerjakan/${ujian.kode_ujian}` : null;

  return (
    <div style={{ maxWidth: '650px', margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <a href={`/ujian/${id}/soal`} style={{ color: '#666', fontSize: '0.9rem', textDecoration: 'none' }}>← Kembali ke Soal</a>
      <h1 style={{ margin: '0.5rem 0' }}>Review Ujian</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>{ujian.judul} — Kelas {ujian.kelas}</p>

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <p>Jumlah Soal: <strong>{jumlahSoal}</strong></p>
        <p>Total Nilai: <strong>{totalBobot}</strong></p>
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Jenis Soal:</p>
          {Object.keys(jenisCount).length === 0 && <p style={{ color: '#888' }}>-</p>}
          {Object.entries(jenisCount).map(([jenis, count]) => (
            <p key={jenis} style={{ color: '#666', fontSize: '0.9rem' }}>{labelJenis[jenis] || jenis}: {count}</p>
          ))}
        </div>
      </div>

      {!ujian.kode_ujian && (
        <div style={{ padding: '1.5rem', borderRadius: '8px', background: valid ? '#e6f7ec' : '#fdecea', border: valid ? '1px solid #28a745' : '1px solid #dc3545', marginBottom: '1.5rem' }}>
          {valid ? (
            <p style={{ color: '#28a745', fontWeight: 'bold' }}>🟢 UJIAN VALID — siap diterbitkan</p>
          ) : (
            <div>
              <p style={{ color: '#dc3545', fontWeight: 'bold', marginBottom: '0.5rem' }}>🔴 UJIAN BELUM DAPAT DITERBITKAN</p>
              {masalah.map((m, i) => (
                <p key={i} style={{ color: '#dc3545', fontSize: '0.9rem' }}>❌ {m}</p>
              ))}
            </div>
          )}
          <button
            onClick={handleTerbitkan}
            disabled={!valid || publishing}
            style={{
              marginTop: '1rem',
              padding: '0.6rem 1.2rem',
              background: valid ? '#111' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: valid ? 'pointer' : 'not-allowed',
            }}
          >
            {publishing ? 'Menerbitkan...' : 'Terbitkan Ujian'}
          </button>
        </div>
      )}

      {ujian.kode_ujian && linkUjian && (
        <div style={{ padding: '1.5rem', borderRadius: '8px', background: '#e6f7ec', border: '1px solid #28a745' }}>
          <p style={{ color: '#28a745', fontWeight: 'bold', marginBottom: '0.75rem' }}>🟢 Ujian sudah diterbitkan!</p>
          <p style={{ marginBottom: '0.5rem' }}>Bagikan link ini ke siswa:</p>
          <div style={{ padding: '0.75rem', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
            {linkUjian}
          </div>
        </div>
      )}
    </div>
  );
}
