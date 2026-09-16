'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function KerjakanInstanPage() {
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

  useEffect(() => { fetchUjian(); }, [kode]);

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
    setError('');
    setSubmitting(true);
    const { skor, rekap } = hitungSkorDanRekap();
    const { error: insertError } = await supabase.from('jawaban_siswa').insert([
      { ujian_id: ujian.id, nama, nis, kelas, jawaban: JSON.stringify(jawaban), skor_otomatis: skor, status: 'terkirim' },
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

  if (step === 'selesai') {
    const benar = rekapAkhir.filter((r) => r.status === 'benar').map((r) => r.nomor);
    const salah = rekapAkhir.filter((r) => r.status === 'salah').map((r) => r.nomor);
    const menunggu = rekapAkhir.filter((r) => r.status === 'uraian').map((r) => r.nomor);

    return (
      <div style={{ minHeight: '100vh', background: gradasiBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1rem, 5vw, 2rem)' }}>
        <div className="fade-in-up" style={{ maxWidth: '460px', width: '100%', background: 'var(--paper-card)', borderRadius: '18px', padding: 'clamp(1.5rem, 6vw, 2.5rem) clamp(1.25rem, 5vw, 2rem)', textAlign: 'center', boxShadow: '0 30px 60px -30px rgba(15,42,74,0.4)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>JAWABAN TERKIRIM</p>
          <p style={{ marginBottom: '0.25rem' }}>Terima kasih, <strong>{nama}</strong></p>
          <p className="gradient-text" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.4rem, 12vw, 3.4rem)', fontWeight: 600, margin: '0.5rem 0 0' }}>{skorAkhir}</p>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem', fontSize: '0.9rem' }}>dari 100 poin (otomatis)</p>

          <div style={{ textAlign: 'left', borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.6rem' }}>Jawaban benar</p>
            <p style={{ marginBottom: '1.25rem', lineHeight: 2.4 }}>
              {benar.length > 0 ? benar.map((n) => (
                <span key={n} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--success)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, marginRight: '0.4rem' }}>{n}</span>
              )) : <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Tidak ada</span>}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.6rem' }}>Jawaban salah</p>
            <p style={{ marginBottom: menunggu.length > 0 ? '1.25rem' : 0, lineHeight: 2.4 }}>
              {salah.length > 0 ? salah.map((n) => (
                <span key={n} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--danger)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, marginRight: '0.4rem' }}>{n}</span>
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
          <p className="gradient-text" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Aksanu</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginBottom: '1rem' }}>Mode Kerjakan Instan</p>
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
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>Mulai</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: gradasiBg, padding: 'clamp(1rem, 4vw, 2rem)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ position: 'sticky', top: 0, background: 'rgba(244,247,251,0.9)', backdropFilter: 'blur(6px)', paddingBottom: '1rem', marginBottom: '1rem', zIndex: 5 }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: '0 0 0.2rem' }}>{ujian.judul}</p>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>{nama} · Kelas {kelas} · Terisi {jumlahTerjawab} dari {soalList.length}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {soalList.map((s, idx) => {
            let opsi = {};
            if (s.jenis === 'pg') { try { opsi = JSON.parse(s.kunci).opsi; } catch (e) {} }
            let pasangan = [];
            let kananOptions = [];
            if (s.jenis === 'menjodohkan') {
              try { pasangan = JSON.parse(s.kunci); kananOptions = [...new Set(pasangan.map((p) => p.kanan))]; } catch (e) {}
            }
            const fullWidth = s.jenis === 'menjodohkan' || s.jenis === 'uraian';

            return (
              <div
                key={s.id}
                style={{
                  gridColumn: fullWidth ? '1 / -1' : 'auto',
                  background: 'var(--paper-card)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '0.9rem 1rem',
                }}
              >
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', margin: '0 0 0.3rem' }}>Nomor {idx + 1}</p>
                <p style={{ fontSize: '0.85rem', margin: '0 0 0.6rem', lineHeight: 1.4 }}>
                  {s.pertanyaan.length > 70 ? s.pertanyaan.slice(0, 70) + '…' : s.pertanyaan}
                </p>

                {s.jenis === 'pg' && (
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {['A', 'B', 'C', 'D', 'E'].filter((h) => opsi[h]).map((huruf) => {
                      const aktif = jawaban[s.id] === huruf;
                      return (
                        <button
                          key={huruf}
                          type="button"
                          onClick={() => setJawabanSoal(s.id, huruf)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '6px',
                            border: aktif ? '2px solid var(--brass-strong)' : '1px solid var(--line)',
                            background: aktif ? 'var(--brass-strong)' : '#fff',
                            color: aktif ? '#fff' : 'var(--ink-soft)',
                            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                          }}
                        >
                          {huruf}
                        </button>
                      );
                    })}
                  </div>
                )}

                {s.jenis === 'benar_salah' && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {['Benar', 'Salah'].map((opt) => {
                      const aktif = jawaban[s.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setJawabanSoal(s.id, opt)}
                          style={{
                            padding: '0.4rem 0.8rem', borderRadius: '6px',
                            border: aktif ? '2px solid var(--brass-strong)' : '1px solid var(--line)',
                            background: aktif ? 'var(--brass-strong)' : '#fff',
                            color: aktif ? '#fff' : 'var(--ink-soft)',
                            fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {s.jenis === 'isian' && (
                  <input type="text" className="input" style={{ marginTop: 0 }} value={jawaban[s.id] || ''} onChange={(e) => setJawabanSoal(s.id, e.target.value)} />
                )}

                {s.jenis === 'uraian' && (
                  <textarea className="input" style={{ marginTop: 0 }} rows={3} value={jawaban[s.id] || ''} onChange={(e) => setJawabanSoal(s.id, e.target.value)} />
                )}

                {s.jenis === 'menjodohkan' && (
                  <div>
                    {pasangan.map((p, i2) => (
                      <div key={i2} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ minWidth: '80px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>{p.kiri}</span>
                        <select
                          className="input"
                          style={{ marginTop: 0, flex: 1 }}
                          value={(jawaban[s.id] && jawaban[s.id][i2]) || ''}
                          onChange={(e) => setJawabanMenjodohkan(s.id, i2, e.target.value)}
                        >
                          <option value="">— pilih —</option>
                          {kananOptions.map((opt, oi) => <option key={oi} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary" style={{ width: '100%', textAlign: 'center', padding: '0.9rem' }}>
          {submitting ? 'Mengirim...' : 'Kirim Jawaban'}
        </button>
      </div>
    </div>
  );
}
