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
  const [showRef, setShowRef] = useState(false);

  const [nama, setNama] = useState('');
  const [nis, setNis] = useState('');
  const [kelas, setKelas] = useState('');

  const [teksJawaban, setTeksJawaban] = useState('');
  const [parseErrors, setParseErrors] = useState([]);
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

  function parseTeksJawaban() {
    const jawaban = {};
    const errs = [];
    const baris = teksJawaban.split('\n').map((b) => b.trim()).filter((b) => b);

    baris.forEach((b, idx) => {
      const match = b.match(/^(\d+)\s+(.+)$/);
      if (!match) {
        errs.push(`Baris "${b}" tidak dikenali. Format: nomor spasi jawaban.`);
        return;
      }
      const nomor = parseInt(match[1], 10);
      const jawabanRaw = match[2].trim();
      const soal = soalList[nomor - 1];
      if (!soal) {
        errs.push(`Nomor ${nomor} tidak ada di ujian ini.`);
        return;
      }

      if (soal.jenis === 'pg') {
        const huruf = jawabanRaw.toUpperCase().charAt(0);
        if (!['A', 'B', 'C', 'D', 'E'].includes(huruf)) {
          errs.push(`Nomor ${nomor}: jawaban harus A-E, ditulis "${jawabanRaw}".`);
          return;
        }
        jawaban[soal.id] = huruf;
      } else if (soal.jenis === 'benar_salah') {
        const lower = jawabanRaw.toLowerCase();
        if (lower.startsWith('b')) jawaban[soal.id] = 'Benar';
        else if (lower.startsWith('s')) jawaban[soal.id] = 'Salah';
        else { errs.push(`Nomor ${nomor}: jawaban harus Benar/Salah, ditulis "${jawabanRaw}".`); return; }
      } else if (soal.jenis === 'menjodohkan') {
        try {
          const pasangan = JSON.parse(soal.kunci);
          const jawabanIdx = {};
          jawabanRaw.split(';').forEach((pair) => {
            const [kiri, kanan] = pair.split('=').map((s) => s.trim());
            const idxPasangan = pasangan.findIndex((p) => p.kiri.toLowerCase() === (kiri || '').toLowerCase());
            if (idxPasangan >= 0) jawabanIdx[idxPasangan] = kanan;
          });
          jawaban[soal.id] = jawabanIdx;
        } catch (e) {
          errs.push(`Nomor ${nomor}: format menjodohkan salah, gunakan kiri=kanan;kiri=kanan.`);
        }
      } else {
        jawaban[soal.id] = jawabanRaw;
      }
    });

    return { jawaban, errs };
  }

  function hitungSkorDanRekap(jawaban) {
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
    const { jawaban, errs } = parseTeksJawaban();
    setParseErrors(errs);
    if (errs.length > 0) return;

    if (Object.keys(jawaban).length === 0) {
      setError('Belum ada jawaban yang ditulis.');
      return;
    }

    setSubmitting(true);
    const { skor, rekap } = hitungSkorDanRekap(jawaban);
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
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: '0 0 0.25rem' }}>{ujian.judul}</p>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>{nama} · Kelas {kelas} · {soalList.length} soal</p>

        <div style={{ background: 'var(--paper-card)', borderRadius: '14px', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 20px 45px -28px rgba(15,42,74,0.3)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '0.75rem' }}>
            Tulis jawaban satu baris per nomor, format: <strong>nomor spasi jawaban</strong>. Contoh:
          </p>
          <pre style={{ background: 'var(--paper)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontFamily: 'monospace' }}>
{`1 A
2 Benar
3 D
4 Jakarta`}
          </pre>
          <textarea
            className="input"
            rows={Math.max(8, soalList.length)}
            value={teksJawaban}
            onChange={(e) => setTeksJawaban(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}
            placeholder={`1 A\n2 B\n3 C`}
          />

          {parseErrors.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', background: 'rgba(179,66,58,0.08)', border: '1px solid var(--danger)', borderRadius: '8px' }}>
              <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Ada yang perlu diperbaiki:</p>
              {parseErrors.map((e, i) => <p key={i} style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: '0.2rem 0' }}>• {e}</p>)}
            </div>
          )}
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.75rem' }}>{error}</p>}
        </div>

        <button onClick={() => setShowRef(!showRef)} className="btn-text" style={{ marginBottom: '1rem' }}>
          {showRef ? 'Sembunyikan daftar soal' : 'Lihat daftar soal (referensi)'}
        </button>

        {showRef && (
          <div style={{ marginBottom: '1.5rem' }}>
            {soalList.map((s, idx) => {
              let opsi = {};
              if (s.jenis === 'pg') { try { opsi = JSON.parse(s.kunci).opsi; } catch (e) {} }
              return (
                <div key={s.id} style={{ background: 'var(--paper-card)', borderRadius: '8px', padding: '1rem', marginBottom: '0.6rem', border: '1px solid var(--line)' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>{idx + 1}. {s.pertanyaan}</p>
                  {s.jenis === 'pg' && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                      {['A','B','C','D','E'].filter((h) => opsi[h]).map((h) => <p key={h} style={{ margin: '0.1rem 0' }}>{h}. {opsi[h]}</p>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting} className="btn-primary" style={{ width: '100%', textAlign: 'center', padding: '0.9rem' }}>
          {submitting ? 'Mengirim...' : 'Kirim Jawaban'}
        </button>
      </div>
    </div>
  );
}
