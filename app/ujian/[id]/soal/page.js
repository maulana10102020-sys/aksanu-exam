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
  const [opsiE, setOpsiE] = useState('');
  const [kunciPG, setKunciPG] = useState('A');

  const [kunciBS, setKunciBS] = useState('Benar');
  const [kunciIsian, setKunciIsian] = useState('');
  const [pasangan, setPasangan] = useState([{ kiri: '', kanan: '' }]);
  const [rubrik, setRubrik] = useState([{ aspek: '', bobot: '' }]);

  useEffect(() => {
    const stored = localStorage.getItem('guru');
    if (!stored) { router.push('/login'); return; }
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
  let statusWarna = 'var(--ink-soft)';
  let statusBg = 'var(--line)';
  let statusText = `Total bobot ${totalBobot} / 100 — masih tersedia ${100 - totalBobot} poin`;
  if (totalBobot === 100) {
    statusWarna = '#fff'; statusBg = 'var(--success)';
    statusText = 'Total bobot 100 / 100 — valid, siap diterbitkan';
  } else if (totalBobot > 100) {
    statusWarna = '#fff'; statusBg = 'var(--danger)';
    statusText = `Total bobot ${totalBobot} / 100 — kelebihan ${totalBobot - 100} poin`;
  } else if (totalBobot > 0) {
    statusWarna = 'var(--ink)'; statusBg = '#F5DCC0';
  }

  function resetForm() {
    setPertanyaan(''); setBobot('');
    setOpsiA(''); setOpsiB(''); setOpsiC(''); setOpsiD(''); setOpsiE(''); setKunciPG('A');
    setKunciBS('Benar'); setKunciIsian('');
    setPasangan([{ kiri: '', kanan: '' }]);
    setRubrik([{ aspek: '', bobot: '' }]);
  }

  function tambahBarisPasangan() { setPasangan([...pasangan, { kiri: '', kanan: '' }]); }
  function hapusBarisPasangan(idx) { setPasangan(pasangan.filter((_, i) => i !== idx)); }
  function updatePasangan(idx, field, value) {
    const copy = [...pasangan]; copy[idx][field] = value; setPasangan(copy);
  }
  function tambahBarisRubrik() { setRubrik([...rubrik, { aspek: '', bobot: '' }]); }
  function hapusBarisRubrik(idx) { setRubrik(rubrik.filter((_, i) => i !== idx)); }
  function updateRubrik(idx, field, value) {
    const copy = [...rubrik]; copy[idx][field] = value; setRubrik(copy);
  }

  const opsiPGTersedia = ['A', 'B', 'C', 'D', ...(opsiE.trim() ? ['E'] : [])];

  async function handleAddSoal(e) {
    e.preventDefault();
    setError('');
    if (!pertanyaan || !bobot) { setError('Pertanyaan dan bobot wajib diisi.'); return; }

    let kunciData = '';
    if (jenis === 'pg') {
      if (!opsiA || !opsiB || !opsiC || !opsiD) { setError('Pilihan A sampai D wajib diisi. Opsi E boleh dikosongkan.'); return; }
      if (kunciPG === 'E' && !opsiE.trim()) { setError('Opsi E kosong, tidak bisa dijadikan kunci jawaban.'); return; }
      kunciData = JSON.stringify({ opsi: { A: opsiA, B: opsiB, C: opsiC, D: opsiD, E: opsiE }, jawaban: kunciPG });
    } else if (jenis === 'benar_salah') {
      kunciData = kunciBS;
    } else if (jenis === 'isian') {
      if (!kunciIsian) { setError('Kunci jawaban isian wajib diisi.'); return; }
      kunciData = kunciIsian;
    } else if (jenis === 'menjodohkan') {
      const valid = pasangan.filter((p) => p.kiri && p.kanan);
      if (valid.length === 0) { setError('Isi minimal 1 pasangan yang lengkap.'); return; }
      kunciData = JSON.stringify(valid);
    } else if (jenis === 'uraian') {
      const valid = rubrik.filter((r) => r.aspek && r.bobot);
      if (valid.length === 0) { setError('Isi minimal 1 aspek rubrik.'); return; }
      kunciData = JSON.stringify(valid);
    }

    setSaving(true);
    const { error: insertError } = await supabase.from('soal').insert([
      { ujian_id: id, jenis, pertanyaan, bobot: Number(bobot), kunci: kunciData },
    ]);
    setSaving(false);
    if (insertError) { setError('Gagal menyimpan: ' + insertError.message); return; }
    resetForm();
    fetchData();
  }

  async function handleDeleteSoal(soalId) {
    if (!confirm('Hapus soal ini?')) return;
    await supabase.from('soal').delete().eq('id', soalId);
    fetchData();
  }

  const labelJenis = { pg: 'Pilihan Ganda', benar_salah: 'Benar/Salah', menjodohkan: 'Menjodohkan', isian: 'Isian', uraian: 'Uraian' };

  function renderKunciDisplay(s) {
    try {
      if (s.jenis === 'pg') {
        const parsed = JSON.parse(s.kunci);
        return (
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
            {['A','B','C','D','E'].filter((h) => parsed.opsi[h]).map((h) => <p key={h} style={{ margin: '0.15rem 0' }}>{h}. {parsed.opsi[h]}</p>)}
            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: '0.4rem' }}>Kunci: {parsed.jawaban}</p>
          </div>
        );
      }
      if (s.jenis === 'menjodohkan') {
        const parsed = JSON.parse(s.kunci);
        return <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{parsed.map((p, i) => <p key={i} style={{ margin: '0.15rem 0' }}>{p.kiri} → {p.kanan}</p>)}</div>;
      }
      if (s.jenis === 'uraian') {
        const parsed = JSON.parse(s.kunci);
        return <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{parsed.map((r, i) => <p key={i} style={{ margin: '0.15rem 0' }}>{r.aspek}: {r.bobot} poin</p>)}</div>;
      }
    } catch (e) {}
    return <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kunci: {s.kunci}</p>;
  }

  if (loading) return <p style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Memuat...</p>;
  if (!ujian) return <p style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Ujian tidak ditemukan.</p>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <a href="/dashboard" className="btn-text">← Kembali ke Dashboard</a>
          <a href={`/ujian/${id}/review`} className="btn-text">Review & Terbitkan →</a>
        </div>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 500, margin: '0.25rem 0' }}>{ujian.judul}</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>Kelas {ujian.kelas}</p>

        <div style={{ padding: '0.9rem 1.1rem', background: statusBg, color: statusWarna, borderRadius: '8px', marginBottom: '2rem', fontWeight: 600, fontSize: '0.92rem' }}>
          {statusText}
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '1.75rem', marginBottom: '2rem', background: 'var(--paper-card)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: '0 0 1.25rem' }}>Tambah soal</h2>
          <form onSubmit={handleAddSoal}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Jenis Soal</label>
              <select value={jenis} onChange={(e) => setJenis(e.target.value)} className="input">
                <option value="pg">Pilihan Ganda</option>
                <option value="benar_salah">Benar/Salah</option>
                <option value="menjodohkan">Menjodohkan</option>
                <option value="isian">Isian</option>
                <option value="uraian">Uraian</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{jenis === 'menjodohkan' ? 'Instruksi Soal' : 'Pertanyaan'}</label>
              <textarea value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} rows={3} className="input" />
            </div>

            {jenis === 'pg' && (
              <div style={{ marginBottom: '1rem', padding: '1.1rem', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Pilihan jawaban (A–D wajib, E opsional)</label>
                <input type="text" placeholder="A." value={opsiA} onChange={(e) => setOpsiA(e.target.value)} className="input" />
                <input type="text" placeholder="B." value={opsiB} onChange={(e) => setOpsiB(e.target.value)} className="input" />
                <input type="text" placeholder="C." value={opsiC} onChange={(e) => setOpsiC(e.target.value)} className="input" />
                <input type="text" placeholder="D." value={opsiD} onChange={(e) => setOpsiD(e.target.value)} className="input" />
                <input type="text" placeholder="E. (opsional)" value={opsiE} onChange={(e) => setOpsiE(e.target.value)} className="input" />
                <label style={{ display: 'block', marginTop: '0.85rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kunci Jawaban</label>
                <select value={kunciPG} onChange={(e) => setKunciPG(e.target.value)} className="input">
                  {opsiPGTersedia.map((huruf) => <option key={huruf} value={huruf}>{huruf}</option>)}
                </select>
              </div>
            )}

            {jenis === 'benar_salah' && (
              <div style={{ marginBottom: '1rem', padding: '1.1rem', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kunci Jawaban</label>
                <select value={kunciBS} onChange={(e) => setKunciBS(e.target.value)} className="input">
                  <option value="Benar">Benar</option>
                  <option value="Salah">Salah</option>
                </select>
              </div>
            )}

            {jenis === 'isian' && (
              <div style={{ marginBottom: '1rem', padding: '1.1rem', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kunci Jawaban (teks yang diharapkan)</label>
                <input type="text" value={kunciIsian} onChange={(e) => setKunciIsian(e.target.value)} className="input" />
              </div>
            )}

            {jenis === 'menjodohkan' && (
              <div style={{ marginBottom: '1rem', padding: '1.1rem', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Pasangan Jawaban</label>
                {pasangan.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    <input type="text" placeholder="Item kiri" value={p.kiri} onChange={(e) => updatePasangan(idx, 'kiri', e.target.value)} className="input" style={{ marginTop: 0, flex: 1 }} />
                    <span style={{ color: 'var(--ink-soft)' }}>→</span>
                    <input type="text" placeholder="Jawaban" value={p.kanan} onChange={(e) => updatePasangan(idx, 'kanan', e.target.value)} className="input" style={{ marginTop: 0, flex: 1 }} />
                    {pasangan.length > 1 && <button type="button" onClick={() => hapusBarisPasangan(idx)} className="btn-text" style={{ color: 'var(--danger)' }}>✕</button>}
                  </div>
                ))}
                <button type="button" onClick={tambahBarisPasangan} className="btn-text" style={{ marginTop: '0.75rem' }}>+ Tambah pasangan</button>
              </div>
            )}

            {jenis === 'uraian' && (
              <div style={{ marginBottom: '1rem', padding: '1.1rem', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Rubrik Penilaian</label>
                {rubrik.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    <input type="text" placeholder="Aspek" value={r.aspek} onChange={(e) => updateRubrik(idx, 'aspek', e.target.value)} className="input" style={{ marginTop: 0, flex: 2 }} />
                    <input type="number" placeholder="Poin" value={r.bobot} onChange={(e) => updateRubrik(idx, 'bobot', e.target.value)} className="input" style={{ marginTop: 0, flex: 1 }} />
                    {rubrik.length > 1 && <button type="button" onClick={() => hapusBarisRubrik(idx)} className="btn-text" style={{ color: 'var(--danger)' }}>✕</button>}
                  </div>
                ))}
                <button type="button" onClick={tambahBarisRubrik} className="btn-text" style={{ marginTop: '0.75rem' }}>+ Tambah aspek</button>
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Bobot Soal (poin)</label>
              <input type="number" value={bobot} onChange={(e) => setBobot(e.target.value)} className="input" />
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : '+ Tambah soal'}</button>
          </form>
        </div>

        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: '0 0 1rem' }}>Daftar soal ({soalList.length})</h2>
        {soalList.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>Belum ada soal.</p>}
        {soalList.map((s, i) => (
          <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '1.1rem', marginBottom: '0.75rem', background: 'var(--paper-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <p style={{ fontWeight: 600 }}>
                Soal {i + 1} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: '0.85rem' }}>· {labelJenis[s.jenis] || s.jenis} · {s.bobot} poin</span>
              </p>
              <button onClick={() => handleDeleteSoal(s.id)} className="btn-text" style={{ color: 'var(--danger)' }}>Hapus</button>
            </div>
            <p style={{ marginBottom: '0.5rem' }}>{s.pertanyaan}</p>
            {renderKunciDisplay(s)}
          </div>
        ))}
      </div>
    </div>
  );
}
