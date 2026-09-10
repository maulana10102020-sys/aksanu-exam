'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function KerjakanUjianPage() {
  const { kode } = useParams();
  const [ujian, setUjian] = useState(null);
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('identitas');

  const [nama, setNama] = useState('');
  const [nis, setNis] = useState('');
  const [kelas, setKelas] = useState('');

  const [jawaban, setJawaban] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [skorAkhir, setSkorAkhir] = useState(0);
  const [rekapAkhir, setRekapAkhir] = useState([]);

  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchUjian();
  }, [kode]);

  async function fetchUjian() {
    setLoading(true);
    const { data: ujianData } = await supabase.from('ujian').select('*').eq('kode_ujian', kode).eq('status', 'terbit').single();
    if (ujianData) {
      const { data: soalData } = await supabase.from('soal').select('*').eq('ujian_id', ujianData.id).order('id', { ascending: true });
      setUjian(ujianData);
      setSoalList(soalData || []);
    }
    setLoading(false);
  }

  function handleMulai(e) {
    e.preventDefault();
    if (!nama || !nis || !kelas) {
      setError('Semua identitas wajib diisi.');
      return;
    }
    setError('');
    setStep('mengerjakan');
  }

  function setJawabanSoal(soalId, value) {
    setJawaban({ ...jawaban, [soalId]: value });
  }
  function setJawabanMenjodohkan(soalId, idx, value) {
    const current = jawaban[soalId] || {};
    setJawaban({ ...jawaban, [soalId]: { ...current, [idx]: value } });
  }

  function scrollToIndex(idx) {
    if (idx < 0 || idx >= soalList.length) return;
    const el = itemRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleScroll() {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    let closestIdx = 0;
    let closestDist = Infinity;
    itemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const itemCenter = r.top + r.height / 2;
      const dist = Math.abs(itemCenter - centerY);
      if (dist < closestDist) { closestDist = dist; closestIdx = idx; }
    });
    setActiveIndex(closestIdx);
  }

  function apaSudahDijawab(soal) {
    const j = jawaban[soal.id];
    if (soal.jenis === 'menjodohkan') {
      return j && Object.values(j).some((v) => v && v.trim());
    }
    return j && String(j).trim();
  }

  function hitungSkorDanRekap() {
    let skor = 0;
    const rekap = [];
    soalList.forEach((s, idx) => {
      const jwb = jawaban[s.id];
      let status = 'salah';
      if (s.jenis === 'pg') {
        try { const kunci = JSON.parse(s.kunci); if (jwb === kunci.jawaban) { skor += Number(s.bobot); status = 'benar'; } } catch (e) {}
      } else if (s.jenis === 'benar_salah') {
        if (jwb === s.kunci) { skor += Number(s.bobot); status = 'benar'; }
      } else if (s.jenis === 'isian') {
        if (jwb && s.kunci && jwb.trim().toLowerCase() === s.kunci.trim().toLowerCase()) { skor += Number(s.bobot); status = 'benar'; }
      } else if (s.jenis === 'menjodohkan') {
        try {
          const pasangan = JSON.parse(s.kunci);
          const bobotPerItem = Number(s.bobot) / pasangan.length;
          let semuaBenar = true;
          pasangan.forEach((p, i2) => {
            const jwbSiswa = jwb ? jwb[i2] : '';
            if (jwbSiswa && jwbSiswa.trim().toLowerCase() === p.kanan.trim().toLowerCase()) {
              skor += bobotPerItem;
            } else {
              semuaBenar = false;
            }
          });
          status = semuaBenar ? 'benar' : 'salah';
        } catch (e) {}
      } else if (s.jenis === 'uraian') {
        status = 'uraian';
      }
      rekap.push({ nomor: idx + 1, status });
    });
    return { skor: Math.round(skor), rekap };
  }

  async function handleSubmit() {
    setSubmitting(true);
    const { skor, rekap } = hitungSkorDanRekap();
    const { error: insertError } = await supabase.from('jawaban_siswa').insert([
      { ujian_id: ujian.id, nama, nis, kelas, jawaban: JSON.stringify(jawaban), skor_otomatis: skor, status: 'terkirim' },
    ]);
    setSubmitting(false);
    if (!insertError) {
      setSkorAkhir(skor);
      setRekapAkhir(rekap);
      setStep('selesai');
    } else {
      setError('Gagal mengirim jawaban: ' + insertError.message);
    }
  }

  if (loading) return <p style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Memuat...</p>;

  if (!ujian) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
        <h1>Ujian tidak ditemukan</h1>
        <p style={{ color: 'var(--ink-soft)' }}>Tautan mungkin salah atau ujian belum diterbitkan.</p>
      </div>
    );
  }

  if (step === 'selesai') {
    const benar = rekapAkhir.filter((r) => r.status === 'benar').map((r) => r.nomor);
    const salah = rekapAkhir.filter((r) => r.status === 'salah').map((r) => r.nomor);
    const menunggu = rekapAkhir.filter((r) => r.status === 'uraian').map((r) => r.nomor);

    return (
      <div style={{ maxWidth: '480px', margin: '3rem auto', padding: '2rem', fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', marginBottom: '0.5rem' }}>Jawaban Terkirim</h1>
        <p style={{ marginBottom: '1rem', color: 'var(--ink-soft)' }}>Terima kasih, <strong>{nama}</strong>.</p>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--brass-strong-dark)', margin: '0 0 0.25rem' }}>{skorAkhir}</p>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>dari 100 poin (otomatis)</p>

        <div style={{ textAlign: 'left', border: '1px solid var(--line)', borderRadius: '10px', padding: '1.25rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '0.5rem' }}>Jawaban benar</p>
          <p style={{ marginBottom: '1rem' }}>
            {benar.length > 0 ? benar.map((n) => (
              <span key={n} style={{ display: 'inline-block', width: '26px', height: '26px', lineHeight: '26px', textAlign: 'center', borderRadius: '50%', background: 'var(--success)', color: '#fff', fontSize: '0.8rem', marginRight: '0.35rem', marginBottom: '0.35rem' }}>{n}</span>
            )) : <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>-</span>}
          </p>

          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '0.5rem' }}>Jawaban salah</p>
          <p style={{ marginBottom: '1rem' }}>
            {salah.length > 0 ? salah.map((n) => (
              <span key={n} style={{ display: 'inline-block', width: '26px', height: '26px', lineHeight: '26px', textAlign: 'center', borderRadius: '50%', background: 'var(--danger)', color: '#fff', fontSize: '0.8rem', marginRight: '0.35rem', marginBottom: '0.35rem' }}>{n}</span>
            )) : <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>-</span>}
          </p>

          {menunggu.length > 0 && (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '0.5rem' }}>Menunggu koreksi guru</p>
              <p>
                {menunggu.map((n) => (
                  <span key={n} style={{ display: 'inline-block', width: '26px', height: '26px', lineHeight: '26px', textAlign: 'center', borderRadius: '50%', background: 'var(--line)', color: 'var(--ink)', fontSize: '0.8rem', marginRight: '0.35rem', marginBottom: '0.35rem' }}>{n}</span>
                ))}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (step === 'identitas') {
    return (
      <div style={{ maxWidth: '420px', margin: '4rem auto', padding: '2rem', fontFamily: 'var(--font-sans)', border: '1px solid var(--line)', borderRadius: '10px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', marginBottom: '0.25rem' }}>{ujian.judul}</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>Kelas {ujian.kelas}</p>
        <form onSubmit={handleMulai}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Nama Lengkap</label>
            <input type="text" className="input" value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>NIS</label>
            <input type="text" className="input" value={nis} onChange={(e) => setNis(e.target.value)} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kelas</label>
            <input type="text" className="input" value={kelas} onChange={(e) => setKelas(e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>Mulai Mengerjakan</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', background: 'var(--paper)', overflow: 'hidden' }}>
      <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--line)', background: 'var(--paper-card)' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: '0 0 0.6rem' }}>{ujian.judul} — {nama}</p>
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          {soalList.map((s, idx) => {
            const dijawab = apaSudahDijawab(s);
            const aktif = idx === activeIndex;
            return (
              <button
                key={s.id}
                onClick={() => scrollToIndex(idx)}
                style={{
                  flexShrink: 0,
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: aktif ? '2px solid var(--ink)' : '1px solid var(--line)',
                  background: dijawab ? 'var(--brass-strong)' : '#fff',
                  color: dijawab ? '#fff' : 'var(--ink-soft)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', scrollSnapType: 'y mandatory', padding: '25vh 1.5rem' }}
      >
        {soalList.map((s, idx) => {
          const distance = Math.abs(idx - activeIndex);
          const gaya = distance === 0
            ? { opacity: 1, filter: 'none', transform: 'scale(1)' }
            : distance === 1
            ? { opacity: 0.4, filter: 'blur(2px)', transform: 'scale(0.95)' }
            : { opacity: 0.12, filter: 'blur(4px)', transform: 'scale(0.92)' };

          let opsi = {};
          if (s.jenis === 'pg') {
            try { opsi = JSON.parse(s.kunci).opsi; } catch (e) {}
          }
          let pasangan = [];
          if (s.jenis === 'menjodohkan') {
            try { pasangan = JSON.parse(s.kunci); } catch (e) {}
          }

          return (
            <div
              key={s.id}
              ref={(el) => (itemRefs.current[idx] = el)}
              style={{
                scrollSnapAlign: 'center',
                maxWidth: '560px',
                margin: '0 auto 3rem',
                padding: '1.5rem',
                background: 'var(--paper-card)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                transition: 'all 0.3s ease',
                ...gaya,
              }}
            >
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.5rem' }}>Soal {idx + 1} dari {soalList.length}</p>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', marginBottom: '1.1rem' }}>{s.pertanyaan}</p>

              {s.jenis === 'pg' && (
                <div>
                  {['A', 'B', 'C', 'D', 'E'].filter((h) => opsi[h]).map((huruf) => (
                    <label key={huruf} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', marginBottom: '0.4rem', borderRadius: '6px', border: '1px solid var(--line)', cursor: 'pointer' }}>
                      <input type="radio" name={`soal-${s.id}`} checked={jawaban[s.id] === huruf} onChange={() => setJawabanSoal(s.id, huruf)} />
                      <span style={{ fontWeight: 600, color: 'var(--ink-soft)' }}>{huruf}</span>
                      {opsi[huruf]}
                    </label>
                  ))}
                </div>
              )}

              {s.jenis === 'benar_salah' && (
                <div>
                  {['Benar', 'Salah'].map((opt) => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', marginBottom: '0.4rem', borderRadius: '6px', border: '1px solid var(--line)', cursor: 'pointer' }}>
                      <input type="radio" name={`soal-${s.id}`} checked={jawaban[s.id] === opt} onChange={() => setJawabanSoal(s.id, opt)} />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {s.jenis === 'isian' && (
                <input type="text" className="input" value={jawaban[s.id] || ''} onChange={(e) => setJawabanSoal(s.id, e.target.value)} />
              )}

              {s.jenis === 'uraian' && (
                <textarea className="input" rows={4} value={jawaban[s.id] || ''} onChange={(e) => setJawabanSoal(s.id, e.target.value)} />
              )}

              {s.jenis === 'menjodohkan' && (
                <div>
                  {pasangan.map((p, i2) => (
                    <div key={i2} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ minWidth: '30px' }}>{p.kiri}</span>
                      <span>→</span>
                      <input type="text" placeholder="Jawaban" value={(jawaban[s.id] && jawaban[s.id][i2]) || ''} onChange={(e) => setJawabanMenjodohkan(s.id, i2, e.target.value)} className="input" style={{ flex: 1, marginTop: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0.9rem 1.25rem', borderTop: '1px solid var(--line)', background: 'var(--paper-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => scrollToIndex(activeIndex - 1)} disabled={activeIndex === 0} className="btn-text" style={{ fontSize: '1rem' }}>← Sebelumnya</button>
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        {activeIndex === soalList.length - 1 ? (
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">{submitting ? 'Mengirim...' : 'Kirim Jawaban'}</button>
        ) : (
          <button onClick={() => scrollToIndex(activeIndex + 1)} className="btn-text" style={{ fontSize: '1rem' }}>Selanjutnya →</button>
        )}
      </div>
    </div>
  );
}
