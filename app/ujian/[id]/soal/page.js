'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

export default function KelolaSoalPage() {
  const { id } = useParams();
  const router = useRouter();

  const [ujian, setUjian] = useState(null);
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [jenis, setJenis] = useState('pg');
  const [pertanyaan, setPertanyaan] = useState('');
  const [bobot, setBobot] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [opsiA, setOpsiA] = useState('');
  const [opsiB, setOpsiB] = useState('');
  const [opsiC, setOpsiC] = useState('');
  const [opsiD, setOpsiD] = useState('');
  const [kunciPG, setKunciPG] = useState('A');

  const [kunciBS, setKunciBS] = useState('Benar');

  const [kunciIsian, setKunciIsian] = useState('');

  const [pasangan, setPasangan] = useState([{ kiri: '', kanan: '' }]);

  const [rubrik, setRubrik] = useState([{ aspek: '', bobot: '' }]);

  useEffect(() => {
    const stored = localStorage.getItem('guru');
    if (!stored) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: ujianData } = await supabase.from('ujian').select('*').eq('id', id).single();
    const { data: soalData } = await supabase.from('soal').select('*').eq('ujian_id', id).order('id', { ascending: true });
    setUjian(ujianData);
    setSoalList(soalData || []);
    setLoading(false);
  }

  const totalBobot = soalList.reduce((sum, s) => sum + Number(s.bobot || 0), 0);
  let statusColor = '#e0a800';
  let statusText = `🟡 Total Bobot: ${totalBobot} / 100 — masih tersedia ${100 - totalBobot} poin`;
  if (totalBobot === 100) {
    statusColor = '#28a745';
    statusText = `🟢 Total Bobot: 100 / 100 — VALID`;
  } else if (totalBobot > 100) {
    statusColor = '#dc3545';
    statusText = `🔴 Total Bobot: ${totalBobot} / 100 — kelebihan ${totalBobot - 100} poin`;
  }

  function resetForm() {
    setPertanyaan('');
    setBobot('');
    setOpsiA(''); setOpsiB(''); setOpsiC(''); setOpsiD(''); setKunciPG('A');
    setKunciBS('Benar');
    setKunciIsian('');
    setPasangan([{ kiri: '', kanan: '' }]);
    setRubrik([{ aspek: '', bobot: '' }]);
  }

  function tambahBarisPasangan() {
    setPasangan([...pasangan, { kiri: '', kanan: '' }]);
  }
  function hapusBarisPasangan(idx) {
    setPasangan(pasangan.filter((_, i) => i !== idx));
  }
  function updatePasangan(idx, field, value) {
    const copy = [...pasangan];
    copy[idx][field] = value;
    setPasangan(copy);
  }

  function tambahBarisRubrik() {
    setRubrik([...rubrik, { aspek: '', bobot: '' }]);
  }
  function hapusBarisRubrik(idx) {
    setRubrik(rubrik.filter((_, i) => i !== idx));
  }
  function updateRubrik(idx, field, value) {
    const copy = [...rubrik];
    copy[idx][field] = value;
    setRubrik(copy);
  }

  async function handleAddSoal(e) {
    e.preventDefault();
    setError('');

    if (!pertanyaan || !bobot) {
      setError('Pertanyaan dan bobot wajib diisi.');
      return;
    }

    let kunciData = '';

    if (jenis === 'pg') {
      if (!opsiA || !opsiB || !opsiC || !opsiD) {
        setError('Semua pilihan A-D wajib diisi.');
        return;
      }
      kunciData = JSON.stringify({ opsi: { A: opsiA, B: opsiB, C: opsiC, D: opsiD }, jawaban: kunciPG });
    } else if (jenis === 'benar_salah') {
      kunciData = kunciBS;
    } else if (jenis === 'isian') {
      if (!kunciIsian) {
        setError('Kunci jawaban isian wajib diisi.');
        return;
      }
      kunciData = kunciIsian;
    } else if (jenis === 'menjodohkan') {
      const valid = pasangan.filter((p) => p.kiri && p.kanan);
      if (valid.length === 0) {
        setError('Isi minimal 1 pasangan yang lengkap.');
        return;
      }
      kunciData = JSON.stringify(valid);
    } else if (jenis === 'uraian') {
      const valid = rubrik.filter((r) => r.aspek && r.bobot);
      if (valid.length === 0) {
        setError('Isi minimal 1 aspek rubrik.');
        return;
      }
      kunciData = JSON.stringify(valid);
    }

    setSaving(true);
    const { error: insertError } = await supabase.from('soal').insert([
      {
        ujian_id: id,
        jenis: jenis,
        pertanyaan: pertanyaan,
        bobot: Number(bobot),
        kunci: kunciData,
      },
    ]);
    setSaving(false);

    if (insertError) {
      setError('Gagal menyimpan: ' + insertError.message);
      return;
    }

    resetForm();
    fetchData();
  }

  async function handleDeleteSoal(soalId) {
    if (!confirm('Hapus soal ini?')) return;
    await supabase.from('soal').delete().eq('id', soalId);
    fetchData();
  }

  function renderKunciDisplay(s) {
    try {
      if (s.jenis === 'pg') {
        const parsed = JSON.parse(s.kunci);
        return (
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            <p>A. {parsed.opsi.A}</p>
            <p>B. {parsed.opsi.B}</p>
            <p>C. {parsed.opsi.C}</p>
            <p>D. {parsed.opsi.D}</p>
            <p style={{ fontWeight: 'bold' }}>Kunci: {parsed.jawaban}</p>
          </div>
        );
      }
      if (s.jenis === 'menjodohkan') {
        const parsed = JSON.parse(s.kunci);
        return (
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            {parsed.map((p, i) => (
              <p key={i}>{p.kiri} → {p.kanan}</p>
            ))}
          </div>
        );
      }
      if (s.jenis === 'uraian') {
        const parsed = JSON.parse(s.kunci);
        return (
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            {parsed.map((r, i) => (
              <p key={i}>{r.aspek}: {r.bobot} poin</p>
            ))}
          </div>
        );
      }
    } catch (e) {}
    return <p style={{ fontSize: '0.85rem', color: '#666' }}>Kunci: {s.kunci}</p>;
  }

  if (loading) {
    return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Memuat...</p>;
  }

  if (!ujian) {
    return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Ujian tidak ditemukan.</p>;
  }

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <a href="/dashboard" style={{ color: '#666', fontSize: '0.9rem', textDecoration: 'none' }}>← Kembali ke Dashboard</a>
      <h1 style={{ margin: '0.5rem 0' }}>{ujian.judul}</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Kelas {ujian.kelas} · <a href={`/ujian/${id}/review`} style={{ color: '#111' }}>Review & Terbitkan →</a>
      </p>

      <div style={{ padding: '0.8rem 1rem', background: statusColor, color: '#fff', borderRadius: '6px', marginBottom: '2rem', fontWeight: 'bold' }}>
        {statusText}
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Tambah Soal</h2>
        <form onSubmit={handleAddSoal}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Jenis Soal</label>
            <select value={jenis} onChange={(e) => setJenis(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}>
              <option value="pg">Pilihan Ganda</option>
              <option value="benar_salah">Benar/Salah</option>
              <option value="menjodohkan">Menjodohkan</option>
              <option value="isian">Isian</option>
              <option value="uraian">Uraian</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>{jenis === 'menjodohkan' ? 'Instruksi Soal' : 'Pertanyaan'}</label>
            <textarea
              value={pertanyaan}
              onChange={(e) => setPertanyaan(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>

          {jenis === 'pg' && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
              <label>Pilihan Jawaban</label>
              <input type="text" placeholder="A." value={opsiA} onChange={(e) => setOpsiA(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} />
              <input type="text" placeholder="B." value={opsiB} onChange={(e) => setOpsiB(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} />
              <input type="text" placeholder="C." value={opsiC} onChange={(e) => setOpsiC(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} />
              <input type="text" placeholder="D." value={opsiD} onChange={(e) => setOpsiD(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }} />
              <label style={{ display: 'block', marginTop: '0.75rem' }}>Kunci Jawaban</label>
              <select value={kunciPG} onChange={(e) => setKunciPG(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          )}

          {jenis === 'benar_salah' && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
              <label>Kunci Jawaban</label>
              <select value={kunciBS} onChange={(e) => setKunciBS(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}>
                <option value="Benar">Benar</option>
                <option value="Salah">Salah</option>
              </select>
            </div>
          )}

          {jenis === 'isian' && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
              <label>Kunci Jawaban (teks yang diharapkan)</label>
              <input type="text" value={kunciIsian} onChange={(e) => setKunciIsian(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
            </div>
          )}

          {jenis === 'menjodohkan' && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
              <label>Pasangan Jawaban</label>
              {pasangan.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                  <input type="text" placeholder="Item kiri (contoh: 1)" value={p.kiri} onChange={(e) => updatePasangan(idx, 'kiri', e.target.value)} style={{ flex: 1, padding: '0.5rem' }} />
                  <span>→</span>
                  <input type="text" placeholder="Jawaban (contoh: B)" value={p.kanan} onChange={(e) => updatePasangan(idx, 'kanan', e.target.value)} style={{ flex: 1, padding: '0.5rem' }} />
                  {pasangan.length > 1 && (
                    <button type="button" onClick={() => hapusBarisPasangan(idx)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={tambahBarisPasangan} style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                + Tambah Pasangan
              </button>
            </div>
          )}

          {jenis === 'uraian' && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
              <label>Rubrik Penilaian</label>
              {rubrik.map((r, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                  <input type="text" placeholder="Aspek (contoh: Ketepatan konsep)" value={r.aspek} onChange={(e) => updateRubrik(idx, 'aspek', e.target.value)} style={{ flex: 2, padding: '0.5rem' }} />
                  <input type="number" placeholder="Poin" value={r.bobot} onChange={(e) => updateRubrik(idx, 'bobot', e.target.value)} style={{ flex: 1, padding: '0.5rem' }} />
                  {rubrik.length > 1 && (
                    <button type="button" onClick={() => hapusBarisRubrik(idx)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={tambahBarisRubrik} style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                + Tambah Aspek
              </button>
              <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>Catatan: total poin rubrik sebaiknya sama dengan Bobot soal di bawah.</p>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label>Bobot Soal (poin)</label>
            <input
              type="number"
              value={bobot}
              onChange={(e) => setBobot(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>

          {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
          <button type="submit" disabled={saving} style={{ padding: '0.6rem 1.2rem', background: '#111', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {saving ? 'Menyimpan...' : '+ Tambah Soal'}
          </button>
        </form>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Daftar Soal ({soalList.length})</h2>
      {soalList.length === 0 && <p style={{ color: '#666' }}>Belum ada soal.</p>}
      {soalList.map((s, i) => (
        <div key={s.id} style={{ border: '1px solid #eee', borderRadius: '6px', padding: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 'bold' }}>Soal {i + 1} — {s.jenis} — {s.bobot} poin</p>
            <button onClick={() => handleDeleteSoal(s.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Hapus</button>
          </div>
          <p style={{ marginBottom: '0.5rem' }}>{s.pertanyaan}</p>
          {renderKunciDisplay(s)}
        </div>
      ))}
    </div>
  );
}
