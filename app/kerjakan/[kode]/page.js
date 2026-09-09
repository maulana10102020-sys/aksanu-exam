'use client';

import { useEffect, useState } from 'react';
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
  const [skorOtomatis, setSkorOtomatis] = useState(null);

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

  function hitungSkor() {
    let skor = 0;
    soalList.forEach((s) => {
      const jwb = jawaban[s.id];
      if (s.jenis === 'pg') {
        try {
          const kunci = JSON.parse(s.kunci);
          if (jwb === kunci.jawaban) skor += Number(s.bobot);
        } catch (e) {}
      } else if (s.jenis === 'benar_salah') {
        if (jwb === s.kunci) skor += Number(s.bobot);
      } else if (s.jenis === 'isian') {
        if (jwb && s.kunci && jwb.trim().toLowerCase() === s.kunci.trim().toLowerCase()) {
          skor += Number(s.bobot);
        }
      } else if (s.jenis === 'menjodohkan') {
        try {
          const pasangan = JSON.parse(s.kunci);
          const bobotPerItem = Number(s.bobot) / pasangan.length;
          pasangan.forEach((p, idx) => {
            const jwbSiswa = jwb ? jwb[idx] : '';
            if (jwbSiswa && jwbSiswa.trim().toLowerCase() === p.kanan.trim().toLowerCase()) {
              skor += bobotPerItem;
            }
          });
        } catch (e) {}
      }
      // uraian: tidak dihitung otomatis, perlu koreksi manual guru
    });
    return Math.round(skor);
  }

  async function handleSubmit() {
    setSubmitting(true);
    const skor = hitungSkor();
    const { error: insertError } = await supabase.from('jawaban_siswa').insert([
      {
        ujian_id: ujian.id,
        nama: nama,
        nis: nis,
        kelas: kelas,
        jawaban: JSON.stringify(jawaban),
        skor_otomatis: skor,
        status: 'terkirim',
      },
    ]);
    setSubmitting(false);
    if (!insertError) {
      setSkorOtomatis(skor);
      setStep('selesai');
    } else {
      setError('Gagal mengirim jawaban: ' + insertError.message);
    }
  }

  if (loading) {
    return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Memuat...</p>;
  }

  if (!ujian) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h1>Ujian tidak ditemukan</h1>
        <p style={{ color: '#666' }}>Link mungkin salah atau ujian belum diterbitkan.</p>
      </div>
    );
  }

  const adaUraian = soalList.some((s) => s.jenis === 'uraian');

  if (step === 'selesai') {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1rem' }}>Jawaban Terkirim ✅</h1>
        <p style={{ marginBottom: '0.5rem' }}>Terima kasih, <strong>{nama}</strong>.</p>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Skor otomatis sementara: <strong>{skorOtomatis}</strong>
          {adaUraian && ' (belum termasuk soal uraian yang perlu dikoreksi guru)'}
        </p>
      </div>
    );
  }

  if (step === 'identitas') {
    return (
      <div style={{ maxWidth: '420px', margin: '4rem auto', padding: '2rem', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>{ujian.judul}</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>Kelas {ujian.kelas}</p>
        <form onSubmit={handleMulai}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Nama Lengkap</label>
            <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>NIS</label>
            <input type="text" value={nis} onChange={(e) => setNis(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Kelas</label>
            <input type="text" value={kelas} onChange={(e) => setKelas(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
          </div>
          {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
          <button type="submit" style={{ width: '100%', padding: '0.6rem', background: '#111', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Mulai Mengerjakan
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '650px', margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>{ujian.judul}</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>{nama} — Kelas {kelas}</p>

      {soalList.map((s, i) => (
        <div key={s.id} style={{ border: '1px solid #eee', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.75rem' }}>{i + 1}. {s.pertanyaan}</p>

          {s.jenis === 'pg' && (() => {
            let opsi = {};
            try { opsi = JSON.parse(s.kunci).opsi; } catch (e) {}
            return (
              <div>
                {['A', 'B', 'C', 'D'].map((huruf) => (
                  <label key={huruf} style={{ display: 'block', marginBottom: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`soal-${s.id}`}
                      checked={jawaban[s.id] === huruf}
                      onChange={() => setJawabanSoal(s.id, huruf)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    {huruf}. {opsi[huruf]}
                  </label>
                ))}
              </div>
            );
          })()}

          {s.jenis === 'benar_salah' && (
            <div>
              {['Benar', 'Salah'].map((opt) => (
                <label key={opt} style={{ display: 'block', marginBottom: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`soal-${s.id}`}
                    checked={jawaban[s.id] === opt}
                    onChange={() => setJawabanSoal(s.id, opt)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {s.jenis === 'isian' && (
            <input
              type="text"
              value={jawaban[s.id] || ''}
              onChange={(e) => setJawabanSoal(s.id, e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          )}

          {s.jenis === 'uraian' && (
            <textarea
              value={jawaban[s.id] || ''}
              onChange={(e) => setJawabanSoal(s.id, e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          )}

          {s.jenis === 'menjodohkan' && (() => {
            let pasangan = [];
            try { pasangan = JSON.parse(s.kunci); } catch (e) {}
            return (
              <div>
                {pasangan.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ minWidth: '30px' }}>{p.kiri}</span>
                    <span>→</span>
                    <input
                      type="text"
                      placeholder="Jawaban"
                      value={(jawaban[s.id] && jawaban[s.id][idx]) || ''}
                      onChange={(e) => setJawabanMenjodohkan(s.id, idx, e.target.value)}
                      style={{ flex: 1, padding: '0.4rem' }}
                    />
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      ))}

      {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{ width: '100%', padding: '0.8rem', background: '#111', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}
      >
        {submitting ? 'Mengirim...' : 'Kirim Jawaban'}
      </button>
    </div>
  );
}
