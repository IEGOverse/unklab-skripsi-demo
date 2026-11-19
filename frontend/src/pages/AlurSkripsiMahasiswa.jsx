import { useState, useEffect, useRef } from 'react';
import {
  getWorkflows, updateWorkflow, getTheses, getStudents, getConsultations, getFacultyRules, getLecturers,
  createThesis, updateThesis, getDefenseRequests, getDefenseSchedules, createDefenseRequest, aiAnalyze,
  getNotifications, updateNotification,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { GraduationCap, Lock, CheckCircle2, AlertTriangle, FileSignature, ShieldCheck, Loader2, CalendarDays, Sparkles, Bell } from 'lucide-react';

const fmtDateID = (iso) => {
  if (!iso) return '-';
  const d = new Date(String(iso).includes('T') ? iso : iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

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
  const checklistRef = useRef([]);
  const checklistSaveRef = useRef(Promise.resolve());

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
  const [lecturers, setLecturers] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [rules, setRules] = useState([]);
  const [myNotifs, setMyNotifs] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [mySchedules, setMySchedules] = useState([]);
  const [showDefenseForm, setShowDefenseForm] = useState(false);
  const [defenseSaving, setDefenseSaving] = useState(false);
  const [defenseAnalyzing, setDefenseAnalyzing] = useState(false);
  const [defenseForm, setDefenseForm] = useState({
    tanggal_diusulkan: '', waktu_diusulkan: '', catatan_mahasiswa: '',
    dosen_rekomendasi_id: '', topik_ai: '', bidang_ai: '',
  });

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [rWfs, rTh, rSt, rC, rR, rReq, rSch, rLect, rNotif] = await Promise.all([
        getWorkflows(), getTheses(), getStudents(), getConsultations(), getFacultyRules(),
        getDefenseRequests(), getDefenseSchedules(), getLecturers(), getNotifications(),
      ]);
      const norm = (r) => r.data?.data || r.data || [];
      const wfs = norm(rWfs);
      const theses = norm(rTh);
      const students = norm(rSt);
      const consultations = norm(rC);
      const rules = norm(rR);
      const myNotifs = norm(rNotif);
      setRules(rules);
      setConsultations(consultations);
      const allRequests = norm(rReq);
      const allSchedules = norm(rSch);
      setLecturers(norm(rLect));
      setMyNotifs(myNotifs.filter(n => !n.read));
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
        checklistRef.current = mine.checklist_checked || [];
        setTurnitin(mine.turnitin_score ?? '');
        setBebakPustaka(!!mine.bebas_pustaka);
        setBebakBusinessOffice(!!mine.bebas_business_office);
        setTranskrip(!!mine.transkrip_lengkap);
        setRevisiLink(mine.revisi_final_link || '');
        const linked = allRequests.filter(r => String(r.thesis_id) === String(mine.thesis_id));
        setMyRequests(linked);
        const linkedIds = linked.map(r => Number(r.id));
        setMySchedules(allSchedules.filter(s => linkedIds.includes(Number(s.defense_request_id))));
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

  // Pendaftaran Ujian Defense (terintegrasi — bagian dari Tahap 7, bukan halaman terpisah)
  const ruleFak = rules.find(r => r.fakultas === wf.fakultas) || {};
  const minBimbingan = ruleFak.min_bimbingan ?? 8;
  const bimbinganCount = consultations.filter(c => String(c.thesis_id) === String(thesisId)).length;
  const bimbinganPct = Math.min(100, Math.round((bimbinganCount / Math.max(1, minBimbingan)) * 100));
  const activeRequest = myRequests.find(r => ['pending', 'diterima_dosen', 'menunggu_persetujuan_dosen', 'disetujui'].includes(r.status))
    || myRequests[myRequests.length - 1]
    || null;
  const scheduledDefense = activeRequest
    ? mySchedules.find(s => Number(s.defense_request_id) === Number(activeRequest.id))
    : null;
  const canRegisterExam = !!wf.acc_sidang; // setelah dosen ACC Sidang Akhir (Tahap 6)
  const requestStatusInfo = {
    pending: { label: 'Menunggu ACC Pembimbing', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    diterima_dosen: { label: 'Diterima Pembimbing — Menunggu Penjadwalan', cls: 'bg-green-100 text-green-800 border-green-200' },
    ditolak_dosen: { label: 'Ditolak Pembimbing', cls: 'bg-red-100 text-red-800 border-red-200' },
    menunggu_persetujuan_dosen: { label: 'Diusulkan Panitia — Menunggu Pembimbing', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    disetujui: { label: 'Dijadwalkan', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  };

  const handleAnalyzeWithAI = async () => {
    setDefenseAnalyzing(true);
    try {
      const judulFinal = wf.judul_final || 'Skripsi';
      const res = await aiAnalyze({ judul: judulFinal, abstrak: abstrak || judulFinal });
      const result = res.data?.data || res.data;
      setDefenseForm(f => ({ ...f, topik_ai: result?.topik || '', bidang_ai: result?.bidang || '' }));
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal analisis AI.' });
    } finally { setDefenseAnalyzing(false); }
  };

  const handleSubmitDefense = async () => {
    if (!defenseForm.tanggal_diusulkan || !defenseForm.waktu_diusulkan) {
      setMessage({ type: 'error', text: 'Tanggal & waktu usulan wajib diisi.' });
      return;
    }
    setDefenseSaving(true);
    setMessage(null);
    try {
      await createDefenseRequest({
        thesis_id: Number(wf.thesis_id),
        topik_ai: defenseForm.topik_ai || null,
        bidang_ai: defenseForm.bidang_ai || null,
        dosen_rekomendasi_id: defenseForm.dosen_rekomendasi_id ? Number(defenseForm.dosen_rekomendasi_id) : null,
        tanggal_diusulkan: defenseForm.tanggal_diusulkan,
        waktu_diusulkan: defenseForm.waktu_diusulkan,
        catatan_mahasiswa: defenseForm.catatan_mahasiswa || null,
        created_at: new Date().toISOString(),
      });
      setMessage({ type: 'success', text: 'Pendaftaran ujian terkirim. Menunggu ACC pembimbing — setelah ACC, panitia menjadwalkan sidang Anda.' });
      setShowDefenseForm(false);
      setDefenseForm({ tanggal_diusulkan: '', waktu_diusulkan: '', catatan_mahasiswa: '', dosen_rekomendasi_id: '', topik_ai: '', bidang_ai: '' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal mendaftar: ' + (e.response?.data?.message || e.message) });
    } finally { setDefenseSaving(false); }
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
    // Ref agar toggle beruntun tidak memakai state basi + antrean promise
    // agar PUT terserialisasi (urutan tiba di server = urutan klik)
    const cur = checklistRef.current;
    const next = cur.includes(label) ? cur.filter(x => x !== label) : [...cur, label];
    checklistRef.current = next;
    setChecklist(next);
    checklistSaveRef.current = checklistSaveRef.current.then(() =>
      updateWorkflow(wf.id, { checklist_checked: next }).catch(() => {
        setMessage({ type: 'error', text: 'Gagal menyimpan checklist.' });
      })
    );
    await checklistSaveRef.current;
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

      {myNotifs.length > 0 && (
        <div className="space-y-2">
          {myNotifs.slice(0, 5).map(n => (
            <div key={n.id} className="p-3 rounded-xl border border-blue-200 bg-blue-50 flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">{n.title}</p>
                <p className="text-xs text-blue-800">{n.body}</p>
              </div>
              <button
                onClick={async () => { try { await updateNotification(n.id, { read: true }); load(); } catch (e) { setMessage({ type: 'error', text: 'Gagal menandai dibaca.' }); } }}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap border border-blue-200 rounded-lg px-2 py-1 bg-white"
              >Tandai dibaca</button>
            </div>
          ))}
        </div>
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
            Abstrak &amp; judul sudah diverifikasi di Tahap 2. Minimal bimbingan {minBimbingan} kali sebelum dosen ACC.
          </div>
          <div className="mb-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress Logbook Bimbingan</span>
              <span className={`text-xs font-bold ${bimbinganCount >= minBimbingan ? 'text-green-700' : 'text-slate-700'}`}>{bimbinganCount}/{minBimbingan}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${bimbinganCount >= minBimbingan ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${bimbinganPct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {bimbinganCount >= minBimbingan
                ? 'Logbook lengkap — menunggu ACC Pembimbing.'
                : `Kurang ${minBimbingan - bimbinganCount} bimbingan lagi sebelum dosen dapat memberikan ACC.`}
            </p>
          </div>
          <Input label="Link Draf Bab 1–3" value={drafLink} onChange={(e) => setDrafLink(e.target.value)} placeholder="https://drive.google.com/..." />
          <Button onClick={handleSaveDraf} disabled={saving} variant="primary" className="mt-3">Simpan Link Draf</Button>
        </div>
      )}

      {stage === 4 && (
        <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-card p-6">
          <h3 className="font-bold font-display text-slate-900 mb-2">Tahap 4 — Seminar Proposal (Sempro)</h3>
          {wf.sempro_scheduled ? (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900">
              <p className="text-[11px] uppercase tracking-widest text-blue-700 font-bold">Jadwal Seminar Proposal Anda</p>
              <p className="font-bold mt-1">{fmtDateID(wf.sempro_tanggal)} · {wf.sempro_waktu || '-'} · {wf.sempro_ruangan || '-'}</p>
              <p className="text-xs mt-1">Penguji: {(wf.sempro_penguji || []).map(id => lecturers.find(l => String(l.id) === String(id))?.nama || '-').join(' & ') || 'Dijadwalkan panitia'}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Menunggu penjadwalan dari panitia. Anda akan menerima <span className="font-semibold">notifikasi</span> setelah jadwal diterbitkan.</p>
          )}
          {wf.sempro_nilai != null && (
            <div className="mt-3 p-4 rounded-xl bg-slate-900 text-white">
              <p className="text-[11px] uppercase tracking-widest text-slate-400">Hasil Seminar Proposal</p>
              <p className="text-3xl font-extrabold font-display text-cyan-300">{wf.sempro_nilai}</p>
              <p className="text-xs text-slate-300 mt-1">{wf.sempro_nilai >= 60 ? 'LULUS — lanjut ke Tahap 5 (Penelitian & Syarat Khusus).' : 'BELUM LULUS — panitia akan mengusulkan jadwal ulang.'}</p>
            </div>
          )}
          {wf.sempro_nilai == null && wf.sempro_scheduled && (
            <p className="text-xs text-slate-500 mt-2">Menunggu pelaksanaan & penilaian penguji. Hasil akan diinformasikan lewat notifikasi.</p>
          )}
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

          {/* Pendaftaran Ujian (Jadwal Sidang Defense) — terintegrasi dalam Alur Skripsi */}
          <div className="pt-4 mt-2 border-t border-slate-200">
            <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-blue-600" /> Pendaftaran Ujian (Jadwal Sidang)</h4>
            <p className="text-xs text-slate-500 mb-3">Wajib daftar setelah ACC Sidang Akhir pembimbing. Pembimbing ACC → panitia menjadwalkan (dosen &amp; ruangan cek bentrok) → Kartu Peserta terbit.</p>
            {!canRegisterExam && (
              <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> ACC Sidang Akhir dosen belum diberikan — pendaftaran baru terbuka di Tahap 6 akhir / Tahap 7.</p>
            )}
            {canRegisterExam && activeRequest && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${requestStatusInfo[activeRequest.status]?.cls || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {requestStatusInfo[activeRequest.status]?.label || activeRequest.status}
                  </span>
                  {scheduledDefense && (
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      {new Date(`${scheduledDefense.tanggal}T${scheduledDefense.waktu || '00:00'}`).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} · {scheduledDefense.waktu} · {scheduledDefense.ruangan}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600">Usulan Anda: <span className="font-semibold">{activeRequest.tanggal_diusulkan} {activeRequest.waktu_diusulkan}</span></p>
                {scheduledDefense && (
                  <p className="text-xs text-slate-600">Penguji: <span className="font-semibold">{[scheduledDefense.dosen_penguji_1_nama, scheduledDefense.dosen_penguji_2_nama].filter(Boolean).join(' & ')}</span></p>
                )}
                {activeRequest.catatan_mahasiswa && <p className="text-xs text-slate-500">Catatan Anda: “{activeRequest.catatan_mahasiswa}”</p>}
                {activeRequest.status === 'ditolak_dosen' && activeRequest.alasan_dosen && (
                  <p className="text-xs text-red-700">Alasan pembimbing: {activeRequest.alasan_dosen}</p>
                )}
                {activeRequest.status === 'ditolak_dosen' && (
                  <Button variant="secondary" className="mt-2" onClick={() => setShowDefenseForm(true)}>Ajukan Ulang dengan Jadwal Baru</Button>
                )}
              </div>
            )}
            {canRegisterExam && !activeRequest && !showDefenseForm && (
              <Button variant="primary" onClick={() => setShowDefenseForm(true)}><FileSignature className="w-4 h-4 mr-2" /> Ajukan Pendaftaran Ujian</Button>
            )}
            {canRegisterExam && showDefenseForm && (
              <div className="p-4 rounded-xl border-2 border-blue-100 bg-blue-50/40 space-y-3">
                <p className="text-[11px] uppercase tracking-wider text-blue-700 font-bold">Form Pendaftaran Ujian</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Usulan Tanggal" type="date" value={defenseForm.tanggal_diusulkan} onChange={(e) => setDefenseForm({ ...defenseForm, tanggal_diusulkan: e.target.value })} />
                  <Input label="Usulan Waktu" type="time" value={defenseForm.waktu_diusulkan} onChange={(e) => setDefenseForm({ ...defenseForm, waktu_diusulkan: e.target.value })} />
                </div>
                <button type="button" onClick={handleAnalyzeWithAI} disabled={defenseAnalyzing} className="flex items-center gap-2 text-xs font-semibold text-purple-700 hover:text-purple-900 disabled:opacity-50">
                  <Sparkles className="w-4 h-4" /> {defenseAnalyzing ? 'Menganalisis...' : 'Isi Topik & Bidang dengan AI (opsional)'}
                </button>
                <Input label="Topik AI" value={defenseForm.topik_ai} onChange={(e) => setDefenseForm({ ...defenseForm, topik_ai: e.target.value })} placeholder="Opsional" />
                <Input label="Bidang AI" value={defenseForm.bidang_ai} onChange={(e) => setDefenseForm({ ...defenseForm, bidang_ai: e.target.value })} placeholder="Opsional" />
                <Select label="Dosen Rekomendasi (opsional, tidak mengikat)" value={defenseForm.dosen_rekomendasi_id} onChange={(e) => setDefenseForm({ ...defenseForm, dosen_rekomendasi_id: e.target.value })} options={[{ value: '', label: '— Pilih dosen —' }, ...lecturers.map(l => ({ value: l.id, label: l.nama }))]} className="mb-0" />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Catatan untuk Panitia / Pembimbing (opsional)</label>
                  <textarea rows={2} value={defenseForm.catatan_mahasiswa} onChange={(e) => setDefenseForm({ ...defenseForm, catatan_mahasiswa: e.target.value })} placeholder="Preferensi jadwal, alasan, dsb." className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowDefenseForm(false)}>Batal</Button>
                  <Button onClick={handleSubmitDefense} disabled={defenseSaving || !defenseForm.tanggal_diusulkan || !defenseForm.waktu_diusulkan}><FileSignature className="w-4 h-4 mr-2" /> Kirim Pendaftaran</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {stage === 8 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
          <h3 className="font-bold font-display text-slate-900 mb-1">Tahap 8 — Sidang Skripsi (Defense)</h3>
          {scheduledDefense ? (
            <p className="text-sm text-slate-700">Jadwal sidang Anda: <span className="font-semibold">{new Date(`${scheduledDefense.tanggal}T${scheduledDefense.waktu || '00:00'}`).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · {scheduledDefense.waktu} · {scheduledDefense.ruangan}</span></p>
          ) : (
            <p className="text-sm text-slate-600">Jadwal sidang belum tercatat — panitia belum menjadwalkan sidang Anda.</p>
          )}
          <p className="text-xs text-slate-500 mt-1">Nilai sidang diisi oleh Dewan Penguji. Anda tidak perlu bertindak, cukup hadir saat sidang.</p>
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
