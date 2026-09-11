'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function BankSoalPage() {
  const router = useRouter();
  const [guru, setGuru] = useState(null);
  const [bankList, setBankList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);
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
    const guruData = JSON.parse(stored);
    setGuru(guruData);
    fetchBank(guruData.id);
  }, [router]);

  async function fetchBank(guruId) {
    setLoading(true);
    const { data } = await supabase.from('bank_soal').select('*').eq('guru_id', guruId).order('id', { ascending: false });
    setBankList(data || []);
    setLoading(false);
  }

  function resetForm() {
    setEditingId(null);
    setJenis('pg'); setPertanyaan(''); setBobot('');
    setOpsiA(''); setOpsiB(''); setOpsiC(''); setOpsiD(''); setOpsiE(''); setKunciPG('A');
    setKunciBS('Benar'); setKunciIsian('');
    setPasangan([{ kiri: '', kanan: '' }]);
    setRubrik([{ aspek: '', bobot: '' }]);
    setError('');
  }

  function mulaiEdit(item) {
    setEditingId(item.id);
    setJenis(item.jenis);
    setPertanyaan(item.pertanyaan);
    setBobot(String(item.bobot || ''));
    setError('');

    if (item.jenis === 'pg') {
      try {
        const parsed = JSON.parse(item.kunci);
        setOpsiA(parsed.opsi.A || ''); setOpsiB(parsed.opsi.B || '');
        setOpsiC(parsed.opsi.C || ''); setOpsiD(parsed.opsi.D || '');
        setOpsiE(parsed.opsi.E || ''); setKunciPG(parsed.jawaban || 'A');
      } catch (e) {}
    } else if (item.jenis === 'benar_salah') {
      setKunciBS(item.kunci || 'Benar');
    } else if (item.jenis === 'isian') {
      setKunciIsian(item.kunci || '');
    } else if (item.jenis === 'menjodohkan') {
      try { setPasangan(JSON.parse(item.kunci)); } catch (e) { setPasangan([{ kiri: '', kanan: '' }]); }
    } else if (item.jenis === 'uraian') {
      try { setRubrik(JSON.parse(item.kunci)); } catch (e) { setRubrik([{ aspek: '', bobot: '' }]); }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!pertanyaan) { setError('Pertanyaan wajib diisi.'); return; }

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
    if (editingId) {
      const { error: updateError } = await supabase.from('bank_soal').update({
        jenis, pertanyaan, bobot: Number(bobot) || 0, kunci: kunciData,
      }).eq('id', editingId);
      setSaving(false);
      if (updateError) { setError('Gagal menyimpan: ' + updateError.message); return; }
    } else {
      const { error: insertError } = await supabase.from('bank_soal').insert([
        { guru_id: guru.id, jenis, pertanyaan, bobot: Number(bobot) || 0, kunci: kunciData },
      ]);
      setSaving(false);
      if (insertError) { setError('Gagal menyimpan: ' + insertError.message); return; }
    }
    resetForm();
    fetchBank(guru.id);
  }

  async function handleDelete(itemId) {
    if (!confirm('Hapus soal ini dari bank?')) return;
    await supabase.from('bank_soal').delete().eq('id', itemId);
    if (editingId === itemId) resetForm();
    fetchBank(guru.id);
  }

  const labelJenis = { pg: 'Pilihan Ganda', benar_salah: 'Benar/Salah', menjodohkan: 'Menjodohkan', isian: 'Isian', uraian: 'Uraian' };

  function renderKunciDisplay(item) {
    try {
      if (item.jenis === 'pg') {
        const parsed = JSON.parse(item.kunci);
        return (
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
            {['A','B','C','D','E'].filter((h) => parsed.opsi[h]).map((h) => <p key={h} style={{ margin: '0.15rem 0' }}>{h}. {parsed.opsi[h]}</p>)}
            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: '0.4rem' }}>Kunci: {parsed.jawaban}</p>
          </div>
        );
      }
      if (item.jenis === 'menjodohkan') {
        const parsed = JSON.parse(item.kunci);
        return <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{parsed.map((p, i) => <p key={i} style={{ margin: '0.15rem 0' }}>{p.kiri} → {p.kanan}</p>)}</div>;
      }
      if (item.jenis === 'uraian') {
        const parsed = JSON.parse(item.kunci);
        return <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{parsed.map((r, i) => <p key={i} style={{ margin: '0.15rem 0' }}>{r.aspek}: {r.bobot} poin</p>)}</div>;
      }
    } catch (e) {}
    return <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kunci: {item.kunci}</p>;
  }

  const gradasiBg = 'linear-gradient(160deg, #EAF1FB 0%, #F4F7FB 45%, #FCEDE3 100%)';

  if (!guru || loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: gradasiBg }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: gradasiBg }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <a href="/dashboard" className="btn-text">← Kembali ke Dashboard</a>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 500, margin: '0.5rem 0 0.25rem' }}>Bank Soal</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.75rem' }}>Simpan dan kelola soal untuk dipakai ulang di ujian mana saja.</p>

        <div style={{ border: editingId ? '2px solid var(--brass-strong)' : '1px solid var(--line)', borderRadius: '10px', padding: '1.75rem', marginBottom: '2rem', background: 'var(--paper-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: 0 }}>
              {editingId ? 'Edit soal bank' : 'Tambah soal ke bank'}
            </h2>
            {editingId && <button onClick={resetForm} className="btn-text">Batal edit</button>}
          </div>

          <form onSubmit={handleSubmit}>
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
              <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Bobot Referensi (opsional, bisa disesuaikan lagi saat dipakai di ujian)</label>
              <input type="number" value={bobot} onChange={(e) => setBobot(e.target.value)} className="input" />
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : '+ Tambah ke bank'}
              </button>
              {editingId && <button type="button" onClick={resetForm} className="btn-text">Batal</button>}
            </div>
          </form>
        </div>

        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: '0 0 1rem' }}>Soal tersimpan ({bankList.length})</h2>
        {bankList.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>Belum ada soal di bank.</p>}
        {bankList.map((item) => (
          <div key={item.id} style={{ border: editingId === item.id ? '2px solid var(--brass-strong)' : '1px solid var(--line)', borderRadius: '8px', padding: '1.1rem', marginBottom: '0.75rem', background: 'var(--paper-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <p style={{ fontWeight: 600 }}>
                <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: '0.85rem' }}>{labelJenis[item.jenis] || item.jenis} · {item.bobot || 0} poin</span>
              </p>
              <div style={{ display: 'flex', gap: '0.9rem' }}>
                <button onClick={() => mulaiEdit(item)} className="btn-text">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="btn-text" style={{ color: 'var(--danger)' }}>Hapus</button>
              </div>
            </div>
            <p style={{ marginBottom: '0.5rem' }}>{item.pertanyaan}</p>
            {renderKunciDisplay(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
