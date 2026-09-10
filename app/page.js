cat > "app/page.js" << 'EOF'
'use client';

import { useEffect, useState } from 'react';

const OPSI = ['Sombong', 'Tawadhu', 'Riya', 'Dengki'];
const INDEKS_BENAR = 1;

const URUTAN = [
  { fase: 'idle', durasi: 900 },
  { fase: 'ke-opsi', durasi: 900 },
  { fase: 'pilih', durasi: 800 },
  { fase: 'ke-kirim', durasi: 900 },
  { fase: 'kirim', durasi: 500 },
  { fase: 'hasil', durasi: 2600 },
];

export default function LandingPage() {
  const [langkah, setLangkah] = useState(0);
  const [skor, setSkor] = useState(0);
  const fase = URUTAN[langkah].fase;

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
        if (n >= target) {
          n = target;
          clearInterval(iv);
        }
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
  }[fase];

  const terpilih = fase === 'pilih' || fase === 'ke-kirim' || fase === 'kirim' || fase === 'hasil';
  const terkirim = fase === 'kirim' || fase === 'hasil';

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
            Susun soal, atur bobot nilai sampai tepat 100, dan bagikan satu tautan ke siswa. Pilihan ganda, benar/salah, isian, dan menjodohkan dinilai otomatis begitu jawaban masuk.
          </p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="/login" className="btn-primary">Buat akun guru</a>
            <a href="/login" className="btn-text">Sudah punya akun? Masuk</a>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '360px', height: '380px', background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 40px -20px rgba(30,42,74,0.25)' }}>
            {!terkirim && fase !== 'hasil' ? (
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: '0.4rem' }}>Ujian Akhlak · Bab 3</p>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', marginBottom: '1.25rem' }}>
                  Sikap rendah hati terhadap sesama disebut…
                </p>
                {OPSI.map((opt, i) => {
                  const aktif = terpilih && i === INDEKS_BENAR;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.6rem 0.75rem',
                        marginBottom: '0.5rem',
                        borderRadius: '6px',
                        border: `1px solid ${aktif ? 'var(--brass)' : 'var(--line)'}`,
                        background: aktif ? 'rgba(185,139,62,0.12)' : '#fff',
                        transition: 'all 0.3s ease',
                        fontSize: '0.9rem',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: aktif ? 'var(--brass-strong)' : 'var(--ink-soft)' }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </div>
                  );
                })}
                <div
                  style={{
                    marginTop: '0.75rem',
                    textAlign: 'center',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    background: fase === 'kirim' ? 'var(--brass-strong-dark)' : 'var(--brass-strong)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    transition: 'background 0.2s ease',
                  }}
                >
                  Kirim Jawaban
                </div>
              </div>
            ) : (
              <div className="fade-in-up" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '0.4rem' }}>Jawaban terkirim</p>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', fontWeight: 500, margin: 0, color: 'var(--brass-strong)' }}>
                  {skor}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>dari 100 poin</p>
              </div>
            )}

            <div className={`demo-cursor ${fase === 'pilih' || fase === 'kirim' ? 'pulse' : ''}`} style={posisiKursor} />
          </div>
        </div>
      </main>
    </div>
  );
}
EOF