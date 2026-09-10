'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../../lib/supabaseClient';

export default function KoreksiSiswaPage() {
  const { id, siswaId } = useParams();
  const [ujian, setUjian] = useState(null);
  const [soalList, setSoalList] = useState([]);
  const [siswa, setSiswa] = useState(null);
  const [jawaban, setJawaban] = useState({});
  const [koreksiUraian, setKoreksiUraian] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id, siswaId]);

  async function fetchData() {
    setLoading(true);
    const { data: ujianData } = await supabase.from('ujian').select('*').eq('id', id).single();
    const { data: soalData } = await supabase.from('soal').select('*').eq('ujian_id', id).order('id', { ascending: true });
    const { data: siswaData } = await supabase.from('jawaban_siswa').select('*').eq('id', siswaId).single();

    setUjian(ujianData);
    setSoalList(soalData || []);
    setSiswa(siswaData);

    if (siswaData) {
      try { setJawaban(JSON.parse(siswaData.jawaban || '{}')); } catch (e) { setJawaban({}); }
      try { setKoreksiUraian(JSON.parse(siswaData.koreksi_detail || '{}')); } catch (e) { setKoreksiUraian({}); }
    }
    setLoading(false);
  }

  function updateKoreksi(soalId, value) {
    setKoreksiUraian({ ...koreksiUraian, [soalId]: value });
  }

  function renderSoal(s) {
    const jwb = jawaban[s.id];

    if (s.jenis === 'pg') {
      let opsi = {}, kunciJawaban = '';
      try {
        const parsed = JSON.parse(s.kunci);
        opsi = parsed.opsi;
        kunciJawaban = parsed.jawaban;
      } catch (e) {}
      const benar = jwb === kunciJawaban;
      return (
        <div>
          <p>Jawaban siswa: <strong style={{ color: benar ? '#28a745' : '#dc3545' }}>{jwb || '(tidak dijawab)'}</strong> {benar ? '✅' : '❌'}</p>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>Kunci: {kunciJawaban} ({opsi[kunciJawaban]})</p>
        </div>
      );
    }

    if (s.jenis === 'benar_salah') {
      const benar = jwb === s.kunci;
      return (
        <div>
          <p>Jawaban siswa: <strong style={{ color: benar ? '#28a745' : '#dc3545' }}>{jwb || '(tidak dijawab)'}</strong> {benar ? '✅' : '❌'}</p>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>Kunci: {s.kunci}</p>
        </div>
      );
    }

    if (s.jenis === 'isian') {
      const benar = jwb && s.kunci && jwb.trim().toLowerCase() === s.kunci.trim().toLowerCase();
      return (
        <div>
          <p>Jawaban siswa: <strong style={{ color: benar ? '#28a745' : '#dc3545' }}>{jwb || '(tidak dijawab)'}</strong> {benar ? '✅' : '❌'}</p>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>Kunci: {s.kunci}</p>
        </div>
      );
    }

    if (s.jenis === 'menjodohkan') {
      let pasangan = [];
      try { pasangan = JSON.parse(s.kunci); } catch (e) {}
      return (
        <div>
          {pasangan.map((p, idx) => {
            const jwbSiswa = jwb ? jwb[idx] : '';
            const benar = jwbSiswa && jwbSiswa.trim().toLowerCase() === p.kanan.trim().toLowerCase();
            return (
              <p key={idx} style={{ fontSize: '0.9rem' }}>
                {p.kiri} → siswa jawab: <strong style={{ color: benar ? '#28a745' : '#dc3545' }}>{jwbSiswa || '-'}</strong> (kunci: {p.kanan}) {benar ? '✅' : '❌'}
              </p>
            );
          })}
        </div>
      );
    }

    if (s.jenis === 'uraian') {
      let rubrik = [];
      try { rubrik = JSON.parse(s.kunci); } catch (e) {}
      return (
        <div>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '0.75rem', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem' }}>Jawaban siswa:</p>
            <p>{jwb || '(tidak dijawab)'}</p>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem' }}>Rubrik: {rubrik.map((r) => `${r.aspek} (${r.bobot})`).join(', ')}</p>
          <label style={{ fontSize: '0.9rem' }}>Beri Skor (maks {s.bobot}):</label>
          <input type="number" max={s.bobot} min={0} value={koreksiUraian[s.id] ?? ''} onChange={(e) => updateKoreksi(s.id, e.target.value)} style={{ width: '100px', padding: '0.4rem', marginLeft: '0.5rem' }} />
        </div>
      );
    }

    return null;
  }

  async function handleSimpanKoreksi() {
    setSaving(true);
    const totalManual = soalList.filter((s) => s.jenis === 'uraian').reduce((sum, s) => sum + Number(koreksiUraian[s.id] || 0), 0);

    const { error } = await supabase.from('jawaban_siswa').update({
      skor_manual: totalManual,
      koreksi_detail: JSON.stringify(koreksiUraian),
      status: 'dikoreksi',
    }).eq('id', siswaId);

    setSaving(false);
    if (!error) { setSaved(true); fetchData(); }
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!siswa || !ujian) return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Data tidak ditemukan.</p>;

  const totalNilai = Number(siswa.skor_otomatis || 0) + soalList.filter((s) => s.jenis === 'uraian').reduce((sum, s) => sum + Number(koreksiUraian[s.id] || 0), 0);
  const adaUraian = soalList.some((s) => s.jenis === 'uraian');

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <a href={`/ujian/${id}/hasil`} style={{ color: '#666', fontSize: '0.9rem', textDecoration: 'none' }}>← Kembali ke Daftar Hasil</a>
      <h1 style={{ margin: '0.5rem 0' }}>{siswa.nama}</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>NIS {siswa.nis} · Kelas {siswa.kelas}</p>

      <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '6px', marginBottom: '1.5rem' }}>
        <p>Nilai Otomatis (PG/BS/Isian/Menjodohkan): <strong>{siswa.skor_otomatis}</strong></p>
        <p>Total Nilai Saat Ini: <strong style={{ fontSize: '1.2rem' }}>{totalNilai}</strong></p>
      </div>

      {soalList.map((s, i) => (
        <div key={s.id} style={{ border: '1px solid #eee', borderRadius: '6px', padding: '1rem', marginBottom: '0.75rem' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{i + 1}. {s.pertanyaan} <span style={{ fontWeight: 'normal', color: '#888', fontSize: '0.85rem' }}>({s.bobot} poin)</span></p>
          {renderSoal(s)}
        </div>
      ))}

      {adaUraian && (
        <button onClick={handleSimpanKoreksi} disabled={saving} style={{ padding: '0.7rem 1.4rem', background: '#111', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}>
          {saving ? 'Menyimpan...' : 'Simpan Koreksi'}
        </button>
      )}
      {saved && <p style={{ color: '#28a745', marginTop: '0.75rem' }}>✅ Koreksi tersimpan.</p>}
    </div>
  );
}
