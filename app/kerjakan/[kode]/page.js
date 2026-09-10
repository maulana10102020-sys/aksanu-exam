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

  const [pelanggaran, setPelanggaran] = useState(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => { fetchUjian(); }, [kode]);

  useEffect(() => {
    if (step !== 'mengerjakan') return;
    function handleVisibility() {
      if (document.hidden) {
        setPelanggaran((prev) => prev + 1);
      } else {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [step]);

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
    if (!nama || !nis || !kelas) { setError('Semua identitas wajib diisi.'); return; }
    setError('');
    setStep('mengerjakan');
  }

  function setJawabanSoal(soalId, value) { setJawaban({ ...jawaban, [soalId]: value }); }
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
    let closestIdx = 0, closestDist = Infinity;
    itemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dist = Math.abs((r.top + r.height / 2) - centerY);
      if (dist < closestDist) { closestDist = dist; closestIdx = idx; }
    });
    setActiveIndex(closestIdx);
  }

  function apaSudahDijawab(soal) {
    const j = jawaban[soal.id];
    if (soal.jenis === 'menjodohkan') return j && Object.values(j).some((v) => v && v.trim());
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
            if (jwbSiswa && jwbSiswa.trim().toLowerCase() === p.kanan.trim().toLowerCase()) { skor += bobotPerItem; } else { semuaBenar = false; }
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
      { ujian_id: ujian.id, nama, nis, kelas, jawaban: JSON.stringify(jawaban), skor_otomatis: skor, status: 'terkirim', pelanggaran },
    ]);
    setSubmitting(false);
    if (!insertError) { setSkorAkhir(skor); setRekapAkhir(rekap); setStep('selesai'); }
    else { setError('Gagal mengirim jawaban: ' + insertError.message); }
  }

  const gradasiBg = 'linear-gradient(160deg, #EAF1FB 0%, #F4F7FB 45%, #FCEDE3 100%)';

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: gradasiBg }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!ujian) {
    return (
      <div style={{ minHeight: '100vh', background: gradasiBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', textAlign: 'center', padding: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)' }}>Ujian tidak ditemukan</h1>
          <p style={{ color: 'var(--ink-soft)' }}>Tautan mungkin salah atau ujian belum diterbitkan.</p>
        </div>
      </div>
    );
  }

  const jumlahTerjawab = soalList.filter(apaSudahDijawab).length;
  const persenProgress = soalList.length ? (jumlahTerjawab / soalList.length) * 100 : 0;

  if (step === 'selesai') {
    const benar = rekapAkhir.filter((r) => r.status === 'benar').map((r) => r.nomor);
    const salah = rekapAkhir.filter((r) => r.status === 'salah').map((r) => r.nomor);
    const menunggu = rekapAkhir.filter((r) => r.status === 'uraian').map((r) => r.nomor);

    return (
      <div style={{ minHeight: '100vh', background: gradasiBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1rem, 5vw, 2rem)' }}>
        <div className="fade-in-up" style={{ maxWidth: '460px', width: '100%', background: 'var(--paper-card)', borderRadius: '18px', padding: 'clamp(1.5rem, 6vw, 2.5rem) clamp(1.25rem, 5vw, 2rem)', textAlign: 'center', boxShadow: '0 30px 60px -30px rgba(15,42,74,0.4)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>JAWABAN TERKIRIM</p>
          <p style={{ marginBottom: '0.25rem', fontFamily: 'var(--font-sans)' }}>Terima kasih, <strong>{nama}</strong></p>
          <p className="gradient-text" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.4rem, 12vw, 3.4rem)', fontWeight: 600, margin: '0.5rem 0 0' }}>{skorAkhir}</p>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem', fontSize: '0.9rem' }}>dari 100 poin (otomatis)</p>

          <div style={{ textAlign: 'left', borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.6rem' }}>Jawaban benar</p>
            <p style={{ marginBottom: '1.25rem', lineHeight: 2.4 }}>
              {benar.length > 0 ? benar.map((n) => (
                <span key={n} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--success)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, marginRight: '0.4rem', boxShadow: '0 4px 10px -4px rgba(47,125,79,0.5)' }}>{n}</span>
              )) : <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Tidak ada</span>}
            </p>

            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.6rem' }}>Jawaban salah</p>
            <p style={{ marginBottom: menunggu.length > 0 ? '1.25rem' : 0, lineHeight: 2.4 }}>
              {salah.length > 0 ? salah.map((n) => (
                <span key={n} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--danger)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, marginRight: '0.4rem', boxShadow: '0 4px 10px -4px rgba(179,66,58,0.5)' }}>{n}</span>
              )) : <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Tidak ada</span>}
            </p>

            {menunggu.length > 0 && (
              <>
                <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.6rem' }}>Menunggu koreksi guru</p>
                <p style={{ lineHeight: 2.4 }}>
                  {menunggu.map((n) => (
                    <span key={n} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--line)', background: '#fff', color: 'var(--ink)', fontSize: '0.8rem', fontWeight: 600, marginRight: '0.4rem' }}>{n}</span>
                  ))}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'identitas') {
    return (
      <div style={{ minHeight: '100vh', background: gradasiBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1rem, 5vw, 2rem)' }}>
        <div style={{ maxWidth: '420px', width: '100%', background: 'var(--paper-card)', borderRadius: '18px', padding: 'clamp(1.5rem, 6vw, 2.5rem) clamp(1.25rem, 5vw, 2rem)', boxShadow: '0 30px 60px -30px rgba(15,42,74,0.4)' }}>
          <p className="gradient-text" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Aksanu</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.25rem, 6vw, 1.5rem)', fontWeight: 500, margin: '0 0 0.25rem' }}>{ujian.judul}</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.75rem' }}>Kelas {ujian.kelas}</p>
          <form onSubmit={handleMulai}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Nama Lengkap</label>
              <input type="text" className="input" value={nama} onChange={(e) => setNama(e.target.value)} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>NIS</label>
              <input type="text" className="input" value={nis} onChange={(e) => setNis(e.target.value)} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kelas</label>
              <input type="text" className="input" value={kelas} onChange={(e) => setKelas(e.target.value)} />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginBottom: '1rem' }}>
              Selama mengerjakan, hindari berpindah tab atau aplikasi lain — ini akan tercatat.
            </p>
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>Mulai Mengerjakan</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', background: gradasiBg, overflow: 'hidden', position: 'relative' }}>
      {showToast && (
        <div className="fade-in-up" style={{ position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%)', background: 'var(--danger)', color: '#fff', padding: '0.6rem 1.1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 10px 25px -10px rgba(179,66,58,0.6)', zIndex: 50 }}>
          Kamu meninggalkan halaman ujian — ini tercatat sebagai pelanggaran.
        </div>
      )}

      <div style={{ padding: 'clamp(0.75rem, 3vw, 1rem) clamp(1rem, 4vw, 1.5rem) 0.85rem', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)', boxShadow: '0 8px 20px -16px rgba(15,42,74,0.3)' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: '0 0 0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ujian.judul} · {nama}</p>

        <div style={{ height: '5px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.75rem' }}>
          <div style={{ height: '100%', width: `${persenProgress}%`, background: 'linear-gradient(90deg, var(--brass), var(--brass-strong))', transition: 'width 0.3s ease' }} />
        </div>

        <div style={{ display: 'flex', gap: 'clamp(0.3rem, 1.5vw, 0.45rem)', overflowX: 'auto', paddingBottom: '0.15rem' }}>
          {soalList.map((s, idx) => {
            const dijawab = apaSudahDijawab(s);
            const aktif = idx === activeIndex;
            return (
              <button
                key={s.id}
                onClick={() => scrollToIndex(idx)}
                style={{
                  flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%',
                  border: aktif ? '2px solid var(--ink)' : '1px solid var(--line)',
                  background: dijawab ? 'linear-gradient(135deg, var(--brass), var(--brass-strong))' : '#fff',
                  color: dijawab ? '#fff' : 'var(--ink-soft)',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  boxShadow: aktif ? '0 0 0 4px rgba(242,98,42,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={containerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', scrollSnapType: 'y mandatory', padding: '18vh clamp(0.75rem, 4vw, 1.5rem)' }}>
        {soalList.map((s, idx) => {
          const distance = Math.abs(idx - activeIndex);
          const gaya = distance === 0
            ? { opacity: 1, filter: 'none', transform: 'scale(1)' }
            : distance === 1
            ? { opacity: 0.4, filter: 'blur(2px)', transform: 'scale(0.95)' }
            : { opacity: 0.1, filter: 'blur(4px)', transform: 'scale(0.92)' };

          let opsi = {};
          if (s.jenis === 'pg') { try { opsi = JSON.parse(s.kunci).opsi; } catch (e) {} }
          let pasangan = [];
          if (s.jenis === 'menjodohkan') { try { pasangan = JSON.parse(s.kunci); } catch (e) {} }

          return (
            <div
              key={s.id}
              ref={(el) => (itemRefs.current[idx] = el)}
              style={{
                scrollSnapAlign: 'center', maxWidth: 'min(560px, 100%)', margin: '0 auto clamp(1.5rem, 6vw, 3rem)',
                padding: 'clamp(1.1rem, 5vw, 1.85rem)', background: 'var(--paper-card)', borderRadius: '16px',
                boxShadow: '0 20px 45px -28px rgba(15,42,74,0.35)', transition: 'all 0.3s ease', ...gaya,
              }}
            >
              <span style={{ display: 'inline-block', fontSize: '0.75rem', color: 'var(--ink-soft)', background: 'var(--paper)', padding: '0.25rem 0.7rem', borderRadius: '999px', marginBottom: '0.9rem' }}>
                Soal {idx + 1} dari {soalList.length}
              </span>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.05rem, 4.5vw, 1.2rem)', lineHeight: 1.5, marginBottom: '1.25rem' }}>{s.pertanyaan}</p>

              {s.jenis === 'pg' && (
                <div>
                  {['A', 'B', 'C', 'D', 'E'].filter((h) => opsi[h]).map((huruf) => {
                    const aktif = jawaban[s.id] === huruf;
                    return (
                      <label key={huruf} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: 'clamp(0.6rem, 3vw, 0.75rem) clamp(0.75rem, 3vw, 1rem)', marginBottom: '0.55rem', borderRadius: '10px', border: `1.5px solid ${aktif ? 'var(--brass-strong)' : 'var(--line)'}`, background: aktif ? 'rgba(242,98,42,0.07)' : '#fff', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                        <input type="radio" name={`soal-${s.id}`} checked={aktif} onChange={() => setJawabanSoal(s.id, huruf)} style={{ display: 'none' }} />
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${aktif ? 'var(--brass-strong)' : 'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {aktif && <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--brass-strong)' }} />}
                        </span>
                        <span style={{ fontSize: 'clamp(0.9rem, 3.5vw, 1rem)' }}><strong style={{ color: 'var(--ink-soft)', marginRight: '0.3rem' }}>{huruf}</strong>{opsi[huruf]}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {s.jenis === 'benar_salah' && (
                <div>
                  {['Benar', 'Salah'].map((opt) => {
                    const aktif = jawaban[s.id] === opt;
                    return (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: 'clamp(0.6rem, 3vw, 0.75rem) clamp(0.75rem, 3vw, 1rem)', marginBottom: '0.55rem', borderRadius: '10px', border: `1.5px solid ${aktif ? 'var(--brass-strong)' : 'var(--line)'}`, background: aktif ? 'rgba(242,98,42,0.07)' : '#fff', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                        <input type="radio" name={`soal-${s.id}`} checked={aktif} onChange={() => setJawabanSoal(s.id, opt)} style={{ display: 'none' }} />
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${aktif ? 'var(--brass-strong)' : 'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {aktif && <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--brass-strong)' }} />}
                        </span>
                        <span style={{ fontSize: 'clamp(0.9rem, 3.5vw, 1rem)' }}>{opt}</span>
                      </label>
                    );
                  })}
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
                    <div key={i2} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ minWidth: '30px', fontWeight: 600, color: 'var(--ink-soft)', fontSize: 'clamp(0.85rem, 3.5vw, 1rem)' }}>{p.kiri}</span>
                      <span style={{ color: 'var(--ink-soft)' }}>→</span>
                      <input type="text" placeholder="Jawaban" value={(jawaban[s.id] && jawaban[s.id][i2]) || ''} onChange={(e) => setJawabanMenjodohkan(s.id, i2, e.target.value)} className="input" style={{ flex: 1, marginTop: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: 'clamp(0.7rem, 3vw, 0.9rem) clamp(1rem, 4vw, 1.5rem)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', boxShadow: '0 -8px 20px -16px rgba(15,42,74,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <button onClick={() => scrollToIndex(activeIndex - 1)} disabled={activeIndex === 0} className="btn-text" style={{ fontSize: 'clamp(0.85rem, 3.5vw, 0.95rem)', opacity: activeIndex === 0 ? 0.4 : 1, whiteSpace: 'nowrap' }}>← Sebelumnya</button>
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
        {activeIndex === soalList.length - 1 ? (
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary" style={{ fontSize: 'clamp(0.85rem, 3.5vw, 0.95rem)', whiteSpace: 'nowrap' }}>{submitting ? 'Mengirim...' : 'Kirim Jawaban'}</button>
        ) : (
          <button onClick={() => scrollToIndex(activeIndex + 1)} className="btn-text" style={{ fontSize: 'clamp(0.85rem, 3.5vw, 0.95rem)', whiteSpace: 'nowrap' }}>Selanjutnya →</button>
        )}
      </div>
    </div>
  );
}
