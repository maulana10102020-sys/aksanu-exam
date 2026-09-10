'use client';

import { useEffect, useState } from 'react';

const OPSI = ['Sombong', 'Tawadhu', 'Riya', 'Dengki'];
const INDEKS_BENAR = 1;
const REKAP = [
  { nama: 'Ahmad Fauzi', nilai: 92 },
  { nama: 'Siti Nur A.', nilai: 85 },
  { nama: 'Budi Santoso', nilai: 78 },
];

const URUTAN = [
  { grup: 'buat', fase: 'judul', durasi: 700 },
  { grup: 'buat', fase: 'pertanyaan', durasi: 900 },
  { grup: 'buat', fase: 'opsi', durasi: 1000 },
  { grup: 'buat', fase: 'bobot', durasi: 700 },
  { grup: 'buat', fase: 'tersimpan', durasi: 900 },
  { grup: 'kerjakan', fase: 'idle', durasi: 700 },
  { grup: 'kerjakan', fase: 'ke-opsi', durasi: 800 },
  { grup: 'kerjakan', fase: 'pilih', durasi: 700 },
  { grup: 'kerjakan', fase: 'ke-kirim', durasi: 800 },
  { grup: 'kerjakan', fase: 'kirim', durasi: 500 },
  { grup: 'kerjakan', fase: 'hasil', durasi: 1800 },
  { grup: 'rekap', fase: 'header', durasi: 400 },
  { grup: 'rekap', fase: 'baris1', durasi: 500 },
  { grup: 'rekap', fase: 'baris2', durasi: 500 },
  { grup: 'rekap', fase: 'baris3', durasi: 500 },
  { grup: 'rekap', fase: 'selesai', durasi: 1900 },
];

export default function LandingPage() {
  const [langkah, setLangkah] = useState(0);
  const [skor, setSkor] = useState(0);
  const { grup, fase } = URUTAN[langkah];

  useEffect(() => {
    const t = setTimeout(() => {
      setLangkah((prev) => (prev + 1) % URUTAN.length);
    }, URUTAN[langkah].durasi);
    return () => clearTimeout(t);
  }, [langkah]);

  useEffect(() => {
    if (fase === 'hasil') {
      let n = 0;
      const target = 92;
      const iv = setInterval(() => {
        n += 8;
        if (n >= target) { n = target; clearInterval(iv); }
        setSkor(n);
      }, 40);
      return () => clearInterval(iv);
    } else {
      setSkor(0);
    }
  }, [fase]);

  const posisiKursor = {
    idle: { top: 24, left: 24, opacity: 1 },
    'ke-opsi': { top: 84 + INDEKS_BENAR * 46, left: 40, opacity: 1 },
    pilih: { top: 84 + INDEKS_BENAR * 46, left: 40, opacity: 1 },
    'ke-kirim': { top: 290, left: 90, opacity: 1 },
    kirim: { top: 290, left: 90, opacity: 1 },
    hasil: { top: 290, left: 90, opacity: 0 },
  }[fase] || { top: 24, left: 24, opacity: 0 };

  const terpilih = ['pilih', 'ke-kirim', 'kirim', 'hasil'].includes(fase);
  const sudahKirim = ['kirim', 'hasil'].includes(fase);
  const tampilHasil = grup === 'kerjakan' && fase === 'hasil';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--paper)', overflow: 'hidden' }}>
      <header style={{ padding: '1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: 0 }}>Aksanu</p>
        <a href="/login" className="btn-text" style={{ fontSize: '0.95rem' }}>Masuk</a>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', maxWidth: '1080px', margin: '0 auto', width: '100%', padding: '0 2.5rem', gap: '3rem' }}>
        <div style={{ flex: 1, maxWidth: '440px' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.6rem', fontWeight: 500, lineHeight: 1.15, margin: '0 0 1rem' }}>
            Ujian yang tersusun rapi, dinilai sendiri.
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: '2rem' }}>
            Susun soal, atur bobot nilai sampai tepat 100, dan bagikan satu tautan ke siswa. Jawaban dinilai otomatis begitu masuk, dan rekap nilai langsung tersusun.
          </p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="/login" className="btn-primary">Buat akun guru</a>
            <a href="/login" className="btn-text">Sudah punya akun? Masuk</a>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '360px', height: '380px', background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 40px -20px rgba(15,42,74,0.25)' }}>

            {grup === 'buat' && (
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: '0.9rem' }}>Tambah Soal</p>

                <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.25rem' }}>Pertanyaan</p>
                <div style={{ minHeight: '2.6rem', padding: '0.5rem 0.65rem', border: '1px solid var(--line)', borderRadius: '6px', marginBottom: '0.9rem', fontSize: '0.85rem' }}>
                  {['pertanyaan', 'opsi', 'bobot', 'tersimpan'].includes(fase) && (
                    <span className="fade-in-up">Sikap rendah hati terhadap sesama disebut…</span>
                  )}
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.25rem' }}>Pilihan Jawaban</p>
                <div style={{ marginBottom: '0.9rem' }}>
                  {['opsi', 'bobot', 'tersimpan'].includes(fase) &&
                    OPSI.map((o, i) => (
                      <p key={i} className="fade-in-up" style={{ fontSize: '0.82rem', margin: '0 0 0.3rem', color: 'var(--ink-soft)' }}>
                        {String.fromCharCode(65 + i)}. {o}
                      </p>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: 0 }}>Bobot</p>
                    {['bobot', 'tersimpan'].includes(fase) && (
                      <p className="fade-in-up" style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>10 poin</p>
                    )}
                  </div>
                  {fase === 'tersimpan' && (
                    <span className="fade-in-up" style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Tersimpan ✓</span>
                  )}
                </div>
              </div>
            )}

            {grup === 'kerjakan' && !tampilHasil && (
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: '0.4rem' }}>Ujian Akhlak · Bab 3</p>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', marginBottom: '1.25rem' }}>
                  Sikap rendah hati terhadap sesama disebut…
                </p>
                {OPSI.map((opt, i) => {
                  const aktif = terpilih && i === INDEKS_BENAR;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', marginBottom: '0.5rem', borderRadius: '6px', border: `1px solid ${aktif ? 'var(--brass-strong)' : 'var(--line)'}`, background: aktif ? 'rgba(242,98,42,0.1)' : '#fff', transition: 'all 0.3s ease', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600, color: aktif ? 'var(--brass-strong-dark)' : 'var(--ink-soft)' }}>{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </div>
                  );
                })}
                <div style={{ marginTop: '0.75rem', textAlign: 'center', padding: '0.6rem', borderRadius: '6px', background: sudahKirim ? 'var(--brass-strong-dark)' : 'var(--brass-strong)', color: '#fff', fontSize: '0.9rem', fontWeight: 600, transition: 'background 0.2s ease' }}>
                  Kirim Jawaban
                </div>
              </div>
            )}

            {tampilHasil && (
              <div className="fade-in-up" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '0.4rem' }}>Jawaban terkirim</p>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', fontWeight: 500, margin: 0, color: 'var(--brass-strong-dark)' }}>{skor}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>dari 100 poin</p>
              </div>
            )}

            {grup === 'rekap' && (
              <div>
                <p className="fade-in-up" style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: '0.4rem' }}>Rekap Nilai</p>
                <p className="fade-in-up" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', marginBottom: '1.25rem' }}>Ujian Akhlak · Bab 3</p>
                {REKAP.map((r, i) => {
                  const tampil = (fase === 'baris1' && i === 0) || (fase === 'baris2' && i <= 1) || ((fase === 'baris3' || fase === 'selesai') && i <= 2);
                  if (!tampil) return null;
                  return (
                    <div key={i} className="fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--line)', fontSize: '0.9rem' }}>
                      <span>{r.nama}</span>
                      <span style={{ fontWeight: 600, color: 'var(--brass-strong-dark)' }}>{r.nilai}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {grup === 'kerjakan' && (
              <div className={`demo-cursor ${fase === 'pilih' || fase === 'kirim' ? 'pulse' : ''}`} style={posisiKursor} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
