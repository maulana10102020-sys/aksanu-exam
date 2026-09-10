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

  useEffect(() => { fetchData(); }, [id, siswaId]);

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

  function updateKoreksi(soalId, value) { setKoreksiUraian({ ...koreksiUraian, [soalId]: value }); }

  function renderSoal(s) {
    const jwb = jawaban[s.id];

    if (s.jenis === 'pg') {
      let opsi = {}, kunciJawaban = '';
      try { const parsed = JSON.parse(s.kunci); opsi = parsed.opsi; kunciJawaban = parsed.jawaban; } catch (e) {}
      const benar = jwb === kunciJawaban;
      return (
        <div>
          <p>Jawaban siswa: <strong style={{ color: benar ? 'var(--success)' : 'var(--danger)' }}>{jwb || '(tidak dijawab)'}</strong> {benar ? '✅' : '❌'}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kunci: {kunciJawaban} ({opsi[kunciJawaban]})</p>
        </div>
      );
    }

    if (s.jenis === 'benar_salah') {
      const benar = jwb === s.kunci;
      return (
        <div>
          <p>Jawaban siswa: <strong style={{ color: benar ? 'var(--success)' : 'var(--danger)' }}>{jwb || '(tidak dijawab)'}</strong> {benar ? '✅' : '❌'}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kunci: {s.kunci}</p>
        </div>
      );
    }

    if (s.jenis === 'isian') {
      const benar = jwb && s.kunci && jwb.trim().toLowerCase() === s.kunci.trim().toLowerCase();
      return (
        <div>
          <p>Jawaban siswa: <strong style={{ color: benar ? 'var(--success)' : 'var(--danger)' }}>{jwb || '(tidak dijawab)'}</strong> {benar ? '✅' : '❌'}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kunci: {s.kunci}</p>
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
                {p.kiri} → siswa jawab: <strong style={{ color: benar ? 'var(--success)' : 'var(--danger)' }}>{jwbSiswa || '-'}</strong> (kunci: {p.kanan}) {benar ? '✅' : '❌'}
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
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.25rem' }}>Jawaban siswa:</p>
            <p style={{ margin: 0 }}>{jwb || '(tidak dijawab)'}</p>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.25rem' }}>Rubrik: {rubrik.map((r) => `${r.aspek} (${r.bobot})`).join(', ')}</p>
          <label style={{ fontSize: '0.9rem' }}>Beri Skor (maks {s.bobot}):</label>
          <input type="number" max={s.bobot} min={0} value={koreksiUraian[s.id] ?? ''} onChange={(e) => updateKoreksi(s.id, e.target.value)} className="input" style={{ width: '110px', marginLeft: '0.5rem', display: 'inline-block' }} />
        </div>
      );
    }

    return null;
  }

  async function handleSimpanKoreksi() {
    setSaving(true);
    const totalManual = soalList.filter((s) => s.jenis === 'uraian').reduce((sum, s) => sum + Number(koreksiUraian[s.id] || 0), 0);
    const { error } = await supabase.from('jawaban_siswa').update({
      skor_manual: totalManual, koreksi_detail: JSON.stringify(koreksiUraian), status: 'dikoreksi',
    }).eq('id', siswaId);
    setSaving(false);
    if (!error) { setSaved(true); fetchData(); }
  }

  const gradasiBg = 'linear-gradient(160deg, #EAF1FB 0%, #F4F7FB 45%, #FCEDE3 100%)';

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: gradasiBg }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!siswa || !ujian) return <p style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Data tidak ditemukan.</p>;

  const totalNilai = Number(siswa.skor_otomatis || 0) + soalList.filter((s) => s.jenis === 'uraian').reduce((sum, s) => sum + Number(koreksiUraian[s.id] || 0), 0);
  const adaUraian = soalList.some((s) => s.jenis === 'uraian');

  return (
    <div style={{ minHeight: '100vh', background: gradasiBg }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <a href={`/ujian/${id}/hasil`} className="btn-text">← Kembali ke Daftar Hasil</a>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', fontWeight: 500, margin: '0.5rem 0 0.2rem' }}>{siswa.nama}</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>NIS {siswa.nis} · Kelas {siswa.kelas}</p>

        {siswa.pelanggaran > 0 && (
          <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(179,66,58,0.08)', border: '1px solid var(--danger)', borderRadius: '8px', marginBottom: '1.25rem' }}>
            <p style={{ color: 'var(--danger)', fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>
              ⚠ Siswa terdeteksi meninggalkan halaman ujian sebanyak {siswa.pelanggaran} kali.
            </p>
          </div>
        )}

        <div style={{ padding: '1.1rem 1.25rem', background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: '10px', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.4rem' }}>Nilai Otomatis (PG/BS/Isian/Menjodohkan): <strong>{siswa.skor_otomatis}</strong></p>
          <p style={{ margin: 0 }}>Total Nilai Saat Ini: <strong style={{ fontSize: '1.2rem' }}>{totalNilai}</strong></p>
        </div>

        {soalList.map((s, i) => (
          <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '1.1rem', marginBottom: '0.75rem', background: 'var(--paper-card)' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{i + 1}. {s.pertanyaan} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: '0.85rem' }}>({s.bobot} poin)</span></p>
            {renderSoal(s)}
          </div>
        ))}

        {adaUraian && (
          <button onClick={handleSimpanKoreksi} disabled={saving} className="btn-primary" style={{ marginTop: '0.5rem' }}>
            {saving ? 'Menyimpan...' : 'Simpan Koreksi'}
          </button>
        )}
        {saved && <p style={{ color: 'var(--success)', marginTop: '0.75rem' }}>✅ Koreksi tersimpan.</p>}
      </div>
    </div>
  );
}
EOFcat > "app/ujian/[id]/hasil/[siswaId]/page.js" << 'EOF'
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

  useEffect(() => { fetchData(); }, [id, siswaId]);

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

  function updateKoreksi(soalId, value) { setKoreksiUraian({ ...koreksiUraian, [soalId]: value }); }

  function renderSoal(s) {
    const jwb = jawaban[s.id];

    if (s.jenis === 'pg') {
      let opsi = {}, kunciJawaban = '';
      try { const parsed = JSON.parse(s.kunci); opsi = parsed.opsi; kunciJawaban = parsed.jawaban; } catch (e) {}
      const benar = jwb === kunciJawaban;
      return (
        <div>
          <p>Jawaban siswa: <strong style={{ color: benar ? 'var(--success)' : 'var(--danger)' }}>{jwb || '(tidak dijawab)'}</strong> {benar ? '✅' : '❌'}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kunci: {kunciJawaban} ({opsi[kunciJawaban]})</p>
        </div>
      );
    }

    if (s.jenis === 'benar_salah') {
      const benar = jwb === s.kunci;
      return (
        <div>
          <p>Jawaban siswa: <strong style={{ color: benar ? 'var(--success)' : 'var(--danger)' }}>{jwb || '(tidak dijawab)'}</strong> {benar ? '✅' : '❌'}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kunci: {s.kunci}</p>
        </div>
      );
    }

    if (s.jenis === 'isian') {
      const benar = jwb && s.kunci && jwb.trim().toLowerCase() === s.kunci.trim().toLowerCase();
      return (
        <div>
          <p>Jawaban siswa: <strong style={{ color: benar ? 'var(--success)' : 'var(--danger)' }}>{jwb || '(tidak dijawab)'}</strong> {benar ? '✅' : '❌'}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Kunci: {s.kunci}</p>
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
                {p.kiri} → siswa jawab: <strong style={{ color: benar ? 'var(--success)' : 'var(--danger)' }}>{jwbSiswa || '-'}</strong> (kunci: {p.kanan}) {benar ? '✅' : '❌'}
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
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.25rem' }}>Jawaban siswa:</p>
            <p style={{ margin: 0 }}>{jwb || '(tidak dijawab)'}</p>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginBottom: '0.25rem' }}>Rubrik: {rubrik.map((r) => `${r.aspek} (${r.bobot})`).join(', ')}</p>
          <label style={{ fontSize: '0.9rem' }}>Beri Skor (maks {s.bobot}):</label>
          <input type="number" max={s.bobot} min={0} value={koreksiUraian[s.id] ?? ''} onChange={(e) => updateKoreksi(s.id, e.target.value)} className="input" style={{ width: '110px', marginLeft: '0.5rem', display: 'inline-block' }} />
        </div>
      );
    }

    return null;
  }

  async function handleSimpanKoreksi() {
    setSaving(true);
    const totalManual = soalList.filter((s) => s.jenis === 'uraian').reduce((sum, s) => sum + Number(koreksiUraian[s.id] || 0), 0);
    const { error } = await supabase.from('jawaban_siswa').update({
      skor_manual: totalManual, koreksi_detail: JSON.stringify(koreksiUraian), status: 'dikoreksi',
    }).eq('id', siswaId);
    setSaving(false);
    if (!error) { setSaved(true); fetchData(); }
  }

  const gradasiBg = 'linear-gradient(160deg, #EAF1FB 0%, #F4F7FB 45%, #FCEDE3 100%)';

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: gradasiBg }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!siswa || !ujian) return <p style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Data tidak ditemukan.</p>;

  const totalNilai = Number(siswa.skor_otomatis || 0) + soalList.filter((s) => s.jenis === 'uraian').reduce((sum, s) => sum + Number(koreksiUraian[s.id] || 0), 0);
  const adaUraian = soalList.some((s) => s.jenis === 'uraian');

  return (
    <div style={{ minHeight: '100vh', background: gradasiBg }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <a href={`/ujian/${id}/hasil`} className="btn-text">← Kembali ke Daftar Hasil</a>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', fontWeight: 500, margin: '0.5rem 0 0.2rem' }}>{siswa.nama}</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>NIS {siswa.nis} · Kelas {siswa.kelas}</p>

        {siswa.pelanggaran > 0 && (
          <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(179,66,58,0.08)', border: '1px solid var(--danger)', borderRadius: '8px', marginBottom: '1.25rem' }}>
            <p style={{ color: 'var(--danger)', fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>
              ⚠ Siswa terdeteksi meninggalkan halaman ujian sebanyak {siswa.pelanggaran} kali.
            </p>
          </div>
        )}

        <div style={{ padding: '1.1rem 1.25rem', background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: '10px', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.4rem' }}>Nilai Otomatis (PG/BS/Isian/Menjodohkan): <strong>{siswa.skor_otomatis}</strong></p>
          <p style={{ margin: 0 }}>Total Nilai Saat Ini: <strong style={{ fontSize: '1.2rem' }}>{totalNilai}</strong></p>
        </div>

        {soalList.map((s, i) => (
          <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '1.1rem', marginBottom: '0.75rem', background: 'var(--paper-card)' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{i + 1}. {s.pertanyaan} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: '0.85rem' }}>({s.bobot} poin)</span></p>
            {renderSoal(s)}
          </div>
        ))}

        {adaUraian && (
          <button onClick={handleSimpanKoreksi} disabled={saving} className="btn-primary" style={{ marginTop: '0.5rem' }}>
            {saving ? 'Menyimpan...' : 'Simpan Koreksi'}
          </button>
        )}
        {saved && <p style={{ color: 'var(--success)', marginTop: '0.75rem' }}>✅ Koreksi tersimpan.</p>}
      </div>
    </div>
  );
}
