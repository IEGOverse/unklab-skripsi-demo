import { useState, useEffect } from 'react';
import {
  getWorkflows, updateWorkflow, getTheses, getStudents, getConsultations, getFacultyRules, getLecturers,
  createThesis, updateThesis,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { GraduationCap, Lock, CheckCircle2, AlertTriangle, FileSignature, ShieldCheck, Loader2 } from 'lucide-react';

const STAGES = [
  { n: 1, label: 'Verifikasi Prasyarat' },
  { n: 2, label: 'Pengajuan & Seleksi Judul' },
  { n: 3, label: 'Bimbingan Proposal (Bab 1–3)' },
  { n: 4, label: 'Seminar Proposal (Sempro)' },
  { n: 5, label: 'Penelitian & Syarat Khusus' },
  { n: 6, label: 'Bimbingan Akhir & Turnitin' },
  { n: 7, label: 'Verifikasi Yudisium / Sidang' },
  { n: 8, label: 'Sidang Skripsi' },
  { n: 9, label: 'Revisi Akhir & Repositori' },
];

const AlurSkripsiMahasiswa = () => {
  const { user } = useAuth();
  const [wf, setWf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state
  const [judul1, setJudul1] = useState('');
  const [judul2, setJudul2] = useState('');
  const [judul3, setJudul3] = useState('');
  const [abstrak, setAbstrak] = useState('');
  const [drafLink, setDrafLink] = useState('');
  const [izinLink, setIzinLink] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [turnitin, setTurnitin] = useState('');
  const [bebakPustaka, setBebakPustaka] = useState(false);
  const [bebakBusinessOffice, setBebakBusinessOffice] = useState(false);
  const [transkrip, setTranskrip] = useState(false);
  const [revisiLink, setRevisiLink] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [rWfs, rTh, rSt, rC, rR] = await Promise.all([
        getWorkflows(), getTheses(), getStudents(), getConsultations(), getFacultyRules(),
      ]);
      const norm = (r) => r.data?.data || r.data || [];
      const wfs = norm(rWfs);
      const theses = norm(rTh);
      const students = norm(rSt);
      const consultations = norm(rC);
      const rules = norm(rR);
      const me = students.find(s => String(s.user_id) === String(user.id));
      const myThesis = me ? theses.find(t => String(t.student_id) === String(me.id)) : null;
      const mine = myThesis ? wfs.find(w => String(w.thesis_id) === String(myThesis.id)) : null;
      if (mine) {
        setWf(JSON.parse(JSON.stringify(mine)));
        setJudul1(mine.judul_pilihan?.[0] || '');
        setJudul2(mine.judul_pilihan?.[1] || '');
        setJudul3(mine.judul_pilihan?.[2] || '');
        setAbstrak(myThesis?.abstrak || '');
        setDrafLink(mine.draf_link || '');
        setIzinLink(mine.izin_syarat_link || '');
        setChecklist(mine.checklist_checked || []);
        setTurnitin(mine.turnitin_score ?? '');
        setBebakPustaka(!!mine.bebas_pustaka);
        setBebakBusinessOffice(!!mine.bebas_business_office);
        setTranskrip(!!mine.transkrip_lengkap);
        setRevisiLink(mine.revisi_final_link || '');
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
        Memuat alur skripsi Anda...
      </div>
    );
  }

  if (!wf) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-10 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Data Belum Tersedia</h3>
        <p className="text-slate-600 text-sm mt-2">Data workflow/thesis Anda belum ditemukan. Silakan hubungi administrator.</p>
      </div>
    );
  }

  const thesisId = wf.thesis_id;
  const student = wf.student_id ? null : null; // placeholder, not used
  const eligible = !!wf.eligible;
  const stage = wf.stage || 1;
  const isDone = (n) => n < stage || (n === 9 && wf.lulus);
  const isCurrent = (n) => n === stage && !isDone(n);
  const canAdvance = {
    3: drafLink.trim().length > 4,
    5: izinLink.trim().length > 4,
    6: turnitin !== '' && Number(turnitin) >= 0,
    7: bebakPustaka && bebakBusinessOffice && transkrip,
    9: revisiLink.trim().length > 4,
  };

  const handleSubmitJudul = async () => {
    const proposals = [judul1, judul2, judul3].filter(j => j.trim());
    if (proposals.length === 0) {
      setMessage({ type: 'error', text: 'Minimal isi satu usulan judul.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      // update atau buat tesis
      const thesesRes = await getTheses();
      const theses = thesesRes.data?.data || thesesRes.data || [];
      const existing = theses.find(t => t.id === wf.thesis_id);
      const payload = {
        student_id: existing?.student_id || 0,
        judul: proposals[0],
        abstrak: abstrak,
        status: 'diajukan',
      };
      let thesisId = wf.thesis_id;
      if (existing) {
        await updateThesis(existing.id, { ...existing, ...payload });
      } else {
        const res = await createThesis({ ...payload, created_at: new Date().toISOString() });
        const created = res.data?.data || res.data;
        thesisId = created?.id ?? thesisId;
      }
      await updateWorkflow(wf.id, { judul_pilihan: proposals, thesis_id: thesisId });
      setMessage({ type: 'success', text: 'Usulan judul + abstrak berhasil diajukan. Menunggu seleksi Kaprodi.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal mengajukan: ' + (e.response?.data?.message || e.message) });
    } finally { setSaving(false); }
  };

  const handleSaveDraf = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateWorkflow(wf.id, { draf_link: drafLink.trim() });
      setMessage({ type: 'success', text: 'Link draf berhasil disimpan.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan link draf.' });
    } finally { setSaving(false); }
  };

  const handleSaveIzin = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateWorkflow(wf.id, { izin_syarat_link: izinLink.trim() });
      setMessage({ type: 'success', text: 'Link bukti izin berhasil disimpan.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan link bukti izin.' });
    } finally { setSaving(false); }
  };

  const handleToggleChecklist = async (label) => {
    const next = checklist.includes(label) ? checklist.filter(x => x !== label) : [...checklist, label];
    setChecklist(next);
    try {
      await updateWorkflow(wf.id, { checklist_checked: next });
    } catch (e) { setMessage({ type: 'error', text: 'Gagal menyimpan checklist.' }); }
  };

  const handleSaveTurnitin = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateWorkflow(wf.id, { turnitin_score: turnitin === '' ? null : Number(turnitin) });
      setMessage({ type: 'success', text: 'Skor Turnitin tersimpan.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan skor Turnitin.' });
    } finally { setSaving(false); }
  };

  const handleSaveYudisium = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateWorkflow(wf.id, {
        bebas_pustaka: bebakPustaka,
        bebas_business_office: bebakBusinessOffice,
        transkrip_lengkap: transkrip,
      });
      setMessage({ type: 'success', text: 'Checklist yudisium tersimpan. Menunggu verifikasi TU.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan checklist yudisium.' });
    } finally { setSaving(false); }
  };

  const handleSaveRevisi = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateWorkflow(wf.id, { revisi_final_link: revisiLink.trim() });
      setMessage({ type: 'success', text: 'Link naskah final tersimpan.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan link naskah final.' });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-glow">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Alur Skripsi Saya</h1>
          <p className="text-gray-600 text-sm">Ajukan judul, unggah draf & link — keputusan (verifikasi/ACC/SK) diambil admin/dosen</p>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>{message.text}</div>
      )}

      {/* Stage progress bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold font-display text-slate-900">Progress Tahapan Skripsi</h3>
          <span className="text-xs font-semibold text-slate-500">Tahap {stage}/9</span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {STAGES.map(s => (
            <div
              key={s.n}
              className={`flex-1 min-w-[48px] flex flex-col items-center gap-1 p-2 rounded-xl border text-center ${
                isDone(s.n)
                  ? 'border-green-300 bg-green-50 text-green-800'
                  : isCurrent(s.n)
                    ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-200'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
              title={s.label}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold">
                {isDone(s.n) ? <CheckCircle2 className="w-4 h-4" /> : <Lock className={`w-3.5 h-3.5 ${isCurrent(s.n) ? 'text-blue-600' : ''}`} />}
              </span>
              <span className="text-[10px] leading-tight hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stage panels */}
      {stage === 2 && (
        <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-card p-6">
          <h3 className="font-bold font-display text-slate-900 mb-1">Tahap 2 — Pengajuan & Seleksi Judul</h3>
          <p className="text-sm text-slate-500 mb-4">{wf.judul_final ? 'SK sudah terbit — Anda tidak bisa mengajukan lagi.' : 'Tulis usulan judul (1–3) + abstrak, lalu klik Ajukan.'}</p>
          <div className="space-y-3">
            <Input label="Usulan Judul 1" value={judul1} onChange={(e) => setJudul1(e.target.value)} placeholder="Judul usulan pertama" />
            <Input label="Usulan Judul 2 (opsional)" value={judul2} onChange={(e) => setJudul2(e.target.value)} placeholder="Judul usulan kedua" />
            <Input label="Usulan Judul 3 (opsional)" value={judul3} onChange={(e) => setJudul3(e.target.value)} placeholder="Judul usulan ketiga" />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Abstrak</label>
              <textarea rows={3} value={abstrak} onChange={(e) => setAbstrak(e.target.value)} placeholder="Ringkasan singkat penelitian..." className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-sm" />
            </div>
          </div>
          {!wf.judul_final && (
            <Button onClick={handleSubmitJudul} disabled={saving || !judul1.trim()} variant="primary" className="mt-4"><FileSignature className="w-4 h-4 mr-2" /> Ajukan Usulan Judul</Button>
          )}
          {wf.judul_final && (
            <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200">
              <p className="text-[11px] uppercase tracking-wider text-green-700 font-bold">SK Penetapan Judul (diterbitkan)</p>
              <p className="font-bold text-slate-900">{wf.judul_final}</p>
              <p className="text-xs text-slate-600 mt-1">Pembimbing I & II ditetapkan oleh Kaprodi.</p>
            </div>
          )}
        </div>
      )}

      {stage === 3 && (
        <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-card p-6">
          <h3 className="font-bold font-display text-slate-900 mb-1">Tahap 3 — Bimbingan Proposal (Bab 1–3)</h3>
          <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
            Logbook bimbingan harus minimal {(wf.faculty_rules ? 8 : 8)} kali sebelum dosen ACC. Abstrak & judul sudah diverifikasi di Tahap 2.
          </div>
          <Input label="Link Draf Bab 1–3" value={drafLink} onChange={(e) => setDrafLink(e.target.value)} placeholder="https://drive.google.com/..." />
          <Button onClick={handleSaveDraf} disabled={saving} variant="primary" className="mt-3">Simpan Link Draf</Button>
        </div>
      )}

      {stage === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
          <h3 className="font-bold font-display text-slate-900 mb-1">Tahap 4 — Seminar Proposal (Sempro)</h3>
          <p className="text-sm text-slate-600">Hasil Sempro diatur oleh Admin/Panitia. Tanggal: <span className="font-semibold">{wf.sempro_tanggal || 'Belum dijadwalkan'}</span></p>
          {wf.sempro_nilai != null && <p className="text-sm text-green-700 font-semibold mt-2">Sempro selesai — nilai rata-rata tersimpan.</p>}
          {wf.sempro_nilai == null && <p className="text-xs text-slate-500 mt-2">Menunggu admin/panitia menerbitkan Berita Acara Sempro.</p>}
        </div>
      )}

      {stage === 5 && (
        <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-card p-6 space-y-4">
          <h3 className="font-bold font-display text-slate-900">Tahap 5 — Penelitian & Syarat Khusus</h3>
          <Input label="Link Bukti Izin / Syarat Khusus" value={izinLink} onChange={(e) => setIzinLink(e.target.value)} placeholder="https://..." />
          <Button onClick={handleSaveIzin} disabled={saving} variant="primary">Simpan Link</Button>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checklist Dokumen (FILKOM)</p>
            {['Link Repository / Source Code', 'Video Demo Aplikasi'].map(doc => (
              <label key={doc} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={checklist.includes(doc)} onChange={() => handleToggleChecklist(doc)} />
                <span className="text-sm text-slate-800">{doc}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {stage === 6 && (
        <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-card p-6 space-y-4">
          <h3 className="font-bold font-display text-slate-900">Tahap 6 — Bimbingan Akhir & Turnitin</h3>
          <Input label="Skor Turnitin (%)" type="number" value={turnitin} onChange={(e) => setTurnitin(e.target.value)} placeholder="Contoh: 15" />
          <p className="text-xs text-slate-500">Skor Turnitin di bawah 20% sesuai syarat fakultas (FILKOM).</p>
          <Button onClick={handleSaveTurnitin} disabled={saving || turnitin === ''} variant="primary">Simpan Hasil Turnitin</Button>
        </div>
      )}

      {stage === 7 && (
        <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-card p-6 space-y-4">
          <h3 className="font-bold font-display text-slate-900">Tahap 7 — Verifikasi Yudisium / Sidang</h3>
          <p className="text-xs text-slate-500">Centang surat yang sudah lengkap (verifikasi oleh TU):</p>
          {[
            ['bebas_pustaka', 'Surat Bebas Pustaka (Perpus UNKLAB)'],
            ['bebas_business_office', 'Surat Bebas Business Office'],
            ['transkrip_lengkap', 'Transkrip Nilai Lengkap'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 accent-blue-600"
                checked={[bebakPustaka, bebakBusinessOffice, transkrip][['bebas_pustaka', 'bebas_business_office', 'transkrip_lengkap'].indexOf(key)]}
                onChange={() => {
                  if (key === 'bebas_pustaka') setBebakPustaka(!bebakPustaka);
                  if (key === 'bebas_business_office') setBebakBusinessOffice(!bebakBusinessOffice);
                  if (key === 'transkrip_lengkap') setTranskrip(!transkrip);
                }}
              />
              <span className="text-sm text-slate-800">{label}</span>
            </label>
          ))}
          <Button onClick={handleSaveYudisium} disabled={saving} variant="primary">Simpan Checklist Yudisium</Button>
        </div>
      )}

      {stage === 8 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
          <h3 className="font-bold font-display text-slate-900 mb-1">Tahap 8 — Sidang Skripsi (Defense)</h3>
          <p className="text-sm text-slate-600">Nilai sidang diisi oleh Dewan Penguji. Anda tidak perlu bertindak, cukup hadir saat sidang.</p>
          {wf.nilai_akhir != null && (
            <div className="mt-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs uppercase tracking-wider text-emerald-700 font-bold">Nilai Akhir Sidang</p>
              <p className="text-3xl font-extrabold text-slate-900">{wf.nilai_akhir} <span className="text-lg text-slate-500">({wf.nilai_huruf})</span></p>
            </div>
          )}
        </div>
      )}

      {stage === 9 && (
        <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-card p-6 space-y-4">
          <h3 className="font-bold font-display text-slate-900">Tahap 9 — Revisi Akhir & Repositori</h3>
          <Input label="Link Naskah Final + Lampiran" value={revisiLink} onChange={(e) => setRevisiLink(e.target.value)} placeholder="https://..." />
          <Button onClick={handleSaveRevisi} disabled={saving || !revisiLink.trim()} variant="primary">Simpan Link Naskah Final</Button>
          {wf.lulus && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-center">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="font-extrabold font-display text-slate-900">SELAMAT — LULUS!</p>
              <p className="text-xs text-emerald-800">Naskah final diverifikasi & diarsipkan ke Repositori UNKLAB.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlurSkripsiMahasiswa;
