'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

export default function KelolaSoalPage() {
  const { id } = useParams();
  const router = useRouter();

  const [ujian, setUjian] = useState(null);
  const [soalList, setSoalList] = useState([]);
  const [bankList, setBankList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingSoalId, setEditingSoalId] = useState(null);
  const [bankMsg, setBankMsg] = useState('');

  const [jenis, setJenis] = useState('pg');
  const [pertanyaan, setPertanyaan] = useState('');
  const [bobot, setBobot] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [bankTerpilih, setBankTerpilih] = useState('');

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

    if (ujianData) {
      const { data: bankData } = await supabase.from('bank_soal').select('*').eq('guru_id', ujianData.guru_id).order('id', { ascending: false });
      setBankList(bankData || []);
    }
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
    setEditingSoalId(null);
    setPertanyaan(''); setBobot('');
    setOpsiA(''); setOpsiB(''); setOpsiC(''); setOpsiD(''); setOpsiE(''); setKunciPG('A');
    setKunciBS('Benar'); setKunciIsian('');
    setPasangan([{ kiri: '', kanan: '' }]);
    setRubrik([{ aspek: '', bobot: '' }]);
    setJenis('pg');
    setBankTerpilih('');
    setError('');
  }

  function isiFormDariData(jenisVal, pertanyaanVal, kunciStr, bobotVal) {
    setJenis(jenisVal);
    setPertanyaan(pertanyaanVal);
    if (bobotVal !== null && bobotVal !== undefined) setBobot(String(bobotVal));

    if (jenisVal === 'pg') {
      try {
        const parsed = JSON.parse(kunciStr);
        setOpsiA(parsed.opsi.A || ''); setOpsiB(parsed.opsi.B || '');
        setOpsiC(parsed.opsi.C || ''); setOpsiD(parsed.opsi.D || '');
        setOpsiE(parsed.opsi.E || ''); setKunciPG(parsed.jawaban || 'A');
      } catch (e) {}
    } else if (jenisVal === 'benar_salah') {
      setKunciBS(kunciStr || 'Benar');
    } else if (jenisVal === 'isian') {
      setKunciIsian(kunciStr || '');
    } else if (jenisVal === 'menjodohkan') {
      try { setPasangan(JSON.parse(kunciStr)); } catch (e) { setPasangan([{ kiri: '', kanan: '' }]); }
    } else if (jenisVal === 'uraian') {
      try { setRubrik(JSON.parse(kunciStr)); } catch (e) { setRubrik([{ aspek: '', bobot: '' }]); }
    }
  }

  function mulaiEditSoal(s) {
    setEditingSoalId(s.id);
    setError('');
    isiFormDariData(s.jenis, s.pertanyaan, s.kunci, s.bobot);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function ambilDariBank(bankId) {
    setBankTerpilih(bankId);
    if (!bankId) return;
    const item = bankList.find((b) => String(b.id) === String(bankId));
    if (!item) return;
    setEditingSoalId(null);
    setError('');
    isiFormDariData(item.jenis, item.pertanyaan, item.kunci, item.bobot);
  }

  async function simpanKeBank(s) {
    if (!ujian) return;
    const { error: bankError } = await supabase.from('bank_soal').insert([
      { guru_id: ujian.guru_id, jenis: s.jenis, pertanyaan: s.pertanyaan, kunci: s.kunci, bobot: s.bobot },
    ]);
    if (!bankError) {
      setBankMsg('Tersimpan ke Bank Soal ✓');
      setTimeout(() => setBankMsg(''), 2000);
      fetchData();
    }
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
  const bankUntukJenisIni = bankList.filter((b) => b.jenis === jenis);

  async function handleSubmitSoal(e) {
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

    if (editingSoalId) {
      const { error: updateError } = await supabase.from('soal').update({
        jenis, pertanyaan, bobot: Number(bobot), kunci: kunciData,
      }).eq('id', editingSoalId);
      setSaving(false);
      if (updateError) { setError('Gagal menyimpan perubahan: ' + updateError.message); return; }
    } else {
      const { error: insertError } = await supabase.from('soal').insert([
        { ujian_id: id, jenis, pertanyaan, bobot: Number(bobot), kunci: kunciData },
      ]);
      setSaving(false);
      if (insertError) { setError('Gagal menyimpan: ' + insertError.message); return; }
    }

    resetForm();
    fetchData();
  }

  async function handleDeleteSoal(soalId) {
    if (!confirm('Hapus soal ini?')) return;
    await supabase.from('soal').delete().eq('id', soalId);
    if (editingSoalId === soalId) resetForm();
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

  const gradasiBg = 'linear-gradient(160deg, #EAF1FB 0%, #F4F7FB 45%, #FCEDE3 100%)';

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: gradasiBg }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!ujian) return <p style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Ujian tidak ditemukan.</p>;

  return (
    <div style={{ minHeight: '100vh', background: gradasiBg }}>
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

        <div style={{ border: editingSoalId ? '2px solid var(--brass-strong)' : '1px solid var(--line)', borderRadius: '10px', padding: '1.75rem', marginBottom: '2rem', background: 'var(--paper-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: 0 }}>
              {editingSoalId ? 'Edit soal' : 'Tambah soal'}
            </h2>
            {editingSoalId && <button onClick={resetForm} className="btn-text">Batal edit</button>}
          </div>

          {!editingSoalId && bankUntukJenisIni.length > 0 && (
            <div style={{ marginBottom: '1.25rem', padding: '0.9rem 1rem', background: 'rgba(47,111,237,0.06)', border: '1px solid var(--brass)', borderRadius: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 600 }}>Ambil dari Bank Soal ({bankUntukJenisIni.length})</label>
              <select value={bankTerpilih} onChange={(e) => ambilDariBank(e.target.value)} className="input">
                <option value="">— Pilih soal dari bank —</option>
                {bankUntukJenisIni.map((b) => (
                  <option key={b.id} value={b.id}>{b.pertanyaan.slice(0, 60)}{b.pertanyaan.length > 60 ? '…' : ''}</option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleSubmitSoal}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Jenis Soal</label>
              <select value={jenis} onChange={(e) => { setJenis(e.target.value); setBankTerpilih(''); }} className="input">
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
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Menyimpan...' : editingSoalId ? 'Simpan perubahan' : '+ Tambah soal'}
              </button>
              {editingSoalId && <button type="button" onClick={resetForm} className="btn-text">Batal</button>}
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: 0 }}>Daftar soal ({soalList.length})</h2>
          {bankMsg && <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>{bankMsg}</span>}
        </div>
        {soalList.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>Belum ada soal.</p>}
        {soalList.map((s, i) => (
          <div key={s.id} style={{ border: editingSoalId === s.id ? '2px solid var(--brass-strong)' : '1px solid var(--line)', borderRadius: '8px', padding: '1.1rem', marginBottom: '0.75rem', background: 'var(--paper-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <p style={{ fontWeight: 600 }}>
                Soal {i + 1} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: '0.85rem' }}>· {labelJenis[s.jenis] || s.jenis} · {s.bobot} poin</span>
              </p>
              <div style={{ display: 'flex', gap: '0.9rem' }}>
                <button onClick={() => simpanKeBank(s)} className="btn-text">Simpan ke bank</button>
                <button onClick={() => mulaiEditSoal(s)} className="btn-text">Edit</button>
                <button onClick={() => handleDeleteSoal(s.id)} className="btn-text" style={{ color: 'var(--danger)' }}>Hapus</button>
              </div>
            </div>
            <p style={{ marginBottom: '0.5rem' }}>{s.pertanyaan}</p>
            {renderKunciDisplay(s)}
          </div>
        ))}
      </div>
    </div>
  );
}
