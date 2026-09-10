'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

function generateKode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let kode = '';
  for (let i = 0; i < 6; i++) kode += chars.charAt(Math.floor(Math.random() * chars.length));
  return kode;
}

export default function ReviewUjianPage() {
  const { id } = useParams();
  const [ujian, setUjian] = useState(null);
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [disalin, setDisalin] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: ujianData } = await supabase.from('ujian').select('*').eq('id', id).single();
    const { data: soalData } = await supabase.from('soal').select('*').eq('ujian_id', id);
    setUjian(ujianData);
    setSoalList(soalData || []);
    setLoading(false);
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

  const totalBobot = soalList.reduce((sum, s) => sum + Number(s.bobot || 0), 0);
  const jumlahSoal = soalList.length;

  const jenisCount = {};
  soalList.forEach((s) => { jenisCount[s.jenis] = (jenisCount[s.jenis] || 0) + 1; });
  const labelJenis = { pg: 'Pilihan Ganda', benar_salah: 'Benar/Salah', menjodohkan: 'Menjodohkan', isian: 'Isian', uraian: 'Uraian' };

  const masalah = [];
  if (jumlahSoal === 0) masalah.push('Belum ada soal sama sekali.');
  if (totalBobot !== 100) masalah.push(`Total bobot harus tepat 100, saat ini ${totalBobot}.`);
  const valid = masalah.length === 0;

  async function handleTerbitkan() {
    setPublishing(true);
    let kode = ujian.kode_ujian;
    if (!kode) kode = generateKode();
    const { error } = await supabase.from('ujian').update({ status: 'terbit', kode_ujian: kode }).eq('id', id);
    setPublishing(false);
    if (!error) fetchData();
  }

  function salinLink() {
    navigator.clipboard.writeText(linkUjian);
    setDisalin(true);
    setTimeout(() => setDisalin(false), 1800);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const linkUjian = ujian.kode_ujian ? `${siteUrl}/kerjakan/${ujian.kode_ujian}` : null;

  return (
    <div style={{ minHeight: '100vh', background: gradasiBg }}>
      <div style={{ maxWidth: '650px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <a href={`/ujian/${id}/soal`} className="btn-text">← Kembali ke Soal</a>
          <a href={`/ujian/${id}/hasil`} className="btn-text">Lihat Hasil Siswa →</a>
        </div>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 500, margin: '0.5rem 0 0.25rem' }}>Review Ujian</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.75rem' }}>{ujian.judul} — Kelas {ujian.kelas}</p>

        <div style={{ border: '1px solid var(--line)', borderRadius: '14px', padding: '1.75rem', marginBottom: '1.5rem', background: 'var(--paper-card)', boxShadow: '0 20px 45px -28px rgba(15,42,74,0.3)' }}>
          <div style={{ display: 'flex', gap: '2.5rem', marginBottom: '1.25rem' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: '0 0 0.2rem' }}>Jumlah Soal</p>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 600, margin: 0 }}>{jumlahSoal}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: '0 0 0.2rem' }}>Total Nilai</p>
              <p className="gradient-text" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 600, margin: 0 }}>{totalBobot}</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.5rem', fontWeight: 600 }}>Jenis Soal</p>
            {Object.keys(jenisCount).length === 0 && <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>Belum ada soal</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {Object.entries(jenisCount).map(([jenis, count]) => (
                <span key={jenis} style={{ fontSize: '0.82rem', color: 'var(--ink)', background: 'var(--paper)', padding: '0.3rem 0.7rem', borderRadius: '999px' }}>
                  {labelJenis[jenis] || jenis}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {!ujian.kode_ujian && (
          <div style={{ padding: '1.75rem', borderRadius: '14px', background: valid ? 'rgba(47,125,79,0.08)' : 'rgba(179,66,58,0.08)', border: `1px solid ${valid ? 'var(--success)' : 'var(--danger)'}` }}>
            {valid ? (
              <p style={{ color: 'var(--success)', fontWeight: 600, margin: 0 }}>Ujian valid — siap diterbitkan</p>
            ) : (
              <div>
                <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '0.5rem' }}>Ujian belum dapat diterbitkan</p>
                {masalah.map((m, i) => <p key={i} style={{ color: 'var(--danger)', fontSize: '0.9rem', margin: '0.2rem 0' }}>• {m}</p>)}
              </div>
            )}
            <button onClick={handleTerbitkan} disabled={!valid || publishing} className="btn-primary" style={{ marginTop: '1.1rem', opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>
              {publishing ? 'Menerbitkan...' : 'Terbitkan Ujian'}
            </button>
          </div>
        )}

        {ujian.kode_ujian && linkUjian && (
          <div style={{ padding: '1.75rem', borderRadius: '14px', background: 'rgba(47,125,79,0.08)', border: '1px solid var(--success)' }}>
            <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '1rem' }}>Ujian sudah diterbitkan</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '0.6rem' }}>Bagikan tautan ini ke siswa</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, padding: '0.75rem 1rem', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {linkUjian}
              </div>
              <button onClick={salinLink} className="btn-primary" style={{ flexShrink: 0, fontSize: '0.85rem' }}>
                {disalin ? 'Disalin ✓' : 'Salin'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
