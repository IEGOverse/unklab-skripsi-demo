import { useState, useEffect, useMemo } from 'react';
import {
  getWorkflows, updateWorkflow, getTheses, getStudents, getConsultations, getFacultyRules, getLecturers,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import {
  CheckCircle2, Lock, Circle, ChevronLeft, ChevronRight, AlertTriangle, GraduationCap,
  FileSignature, FlaskConical, BookOpenCheck, ShieldCheck, ScanLine, Sparkles,
} from 'lucide-react';

const STAGES = [
  { n: 1, label: 'Verifikasi Prasyarat', key: 'eligibility' },
  { n: 2, label: 'Pengajuan & Seleksi Judul', key: 'seleksi' },
  { n: 3, label: 'Bimbingan Proposal (Bab 1–3)', key: 'bimbingan13' },
  { n: 4, label: 'Seminar Proposal (Sempro)', key: 'sempro' },
  { n: 5, label: 'Penelitian & Syarat Khusus', key: 'penelitian' },
  { n: 6, label: 'Bimbingan Akhir & Turnitin', key: 'turnitin' },
  { n: 7, label: 'Verifikasi Yudisium / Sidang', key: 'yudisium' },
  { n: 8, label: 'Sidang Skripsi (Defense)', key: 'sidang' },
  { n: 9, label: 'Revisi Akhir & Repositori', key: 'lulus' },
];

const hurufDari = (n) => {
  if (n == null || isNaN(n)) return '-';
  const v = Number(n);
  if (v >= 85) return 'A';
  if (v >= 80) return 'A-';
  if (v >= 75) return 'B+';
  if (v >= 70) return 'B';
  if (v >= 65) return 'B-';
  if (v >= 60) return 'C+';
  if (v >= 55) return 'C';
  if (v >= 50) return 'D';
  return 'E';
};

const jaccard = (a, b) => {
  const setA = new Set(a.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  setA.forEach(w => { if (setB.has(w)) inter++; });
  return Math.round((inter / new Set([...setA, ...setB]).size) * 100);
};

const AlurSkripsi = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [theses, setTheses] = useState([]);
  const [students, setStudents] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [rules, setRules] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [selectedWf, setSelectedWf] = useState(null);
  const [wfDraft, setWfDraft] = useState(null);
  const [activeStage, setActiveStage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [edgeModal, setEdgeModal] = useState(null); // 'gantiJudul' | 'carryOver' | null
  const [edgeReason, setEdgeReason] = useState('');
  const [semesterBaru, setSemesterBaru] = useState('');
  const [judulBaru, setJudulBaru] = useState(['', '', '']);
  const [sidangValues, setSidangValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isDosen = user?.role === 'dosen';

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [rWf, rTh, rSt, rC, rR, rL] = await Promise.all([
        getWorkflows(), getTheses(), getStudents(), getConsultations(), getFacultyRules(), getLecturers(),
      ]);
      const norm = (r) => r.data?.data || r.data || [];
      const wfs = norm(rWf);
      setWorkflows(wfs);
      setTheses(norm(rTh));
      setStudents(norm(rSt));
      setConsultations(norm(rC));
      setRules(norm(rR));
      setLecturers(norm(rL));

      if (wfs.length) {
        let pick = wfs[0];
        if (user.role === 'mahasiswa') {
          const me = norm(rSt).find(s => String(s.user_id) === String(user.id));
          const myThesis = me ? norm(rTh).find(t => String(t.student_id) === String(me.id)) : null;
          const mine = myThesis ? wfs.find(w => String(w.thesis_id) === String(myThesis.id)) : null;
          if (mine) pick = mine;
        }
        setSelectedWf(pick.id);
        setWfDraft(JSON.parse(JSON.stringify(pick)));
        setActiveStage(pick.stage || 1);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const wf = wfDraft;
  const rule = rules.find(r => r.fakultas === wf?.fakultas) || {};
  const thesis = theses.find(t => t.id === wf?.thesis_id);
  const student = students.find(s => s.id === thesis?.student_id);
  const lecturerName = (id) => { const l = lecturers.find(x => String(x.id) === String(id)); return l ? l.nama : '-'; };
  const konsultasiCount = consultations.filter(c => String(c.thesis_id) === String(thesis?.id)).length;

  const done = useMemo(() => {
    if (!wf) return {};
    return {
      1: !!wf.eligible,
      2: !!(wf.judul_final && wf.pembimbing_1_id),
      3: !!wf.bimbingan_proposal_acc,
      4: wf.sempro_nilai != null && !!wf.revisi_sempro_verified,
      5: !!wf.izin_syarat_verified && (!rule.checklist_dokumen?.length || (wf.checklist_checked || []).length >= rule.checklist_dokumen.length) && (!rule.seminar_hasil_enabled || !!wf.seminar_hasil_done),
      6: !!wf.acc_sidang,
      7: !!(wf.bebas_pustaka && wf.bebas_business_office && wf.transkrip_lengkap && wf.kartu_peserta_issued),
      8: wf.nilai_akhir != null && wf.nilai_akhir >= 55,
      9: !!wf.lulus,
    };
  }, [wf, rule]);

  const maxUnlocked = useMemo(() => {
    for (let i = 1; i <= 9; i++) if (!done[i]) return i;
    return 9;
  }, [done]);

  const firstIncomplete = maxUnlocked;
  const allComplete = done[9];

  const persist = async (patch) => {
    setSaving(true);
    setMessage(null);
    try {
      await updateWorkflow(wf.id, patch);
      setWfDraft(prev => ({ ...prev, ...patch }));
      setMessage({ type: 'success', text: 'Tersimpan.' });
      return true;
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan: ' + (e.response?.data?.message || e.message) });
      return false;
    } finally { setSaving(false); }
  };

  const similarity = useMemo(() => {
    if (!wf?.judul_final) return null;
    let best = 0;
    theses.forEach(t => {
      if (t.id === wf.thesis_id) return;
      best = Math.max(best, jaccard(wf.judul_final, t.judul));
    });
    return best;
  }, [wf?.judul_final, theses, wf?.thesis_id]);

  const toggleChecklistDoc = (label) => {
    const cur = wf.checklist_checked || [];
    const next = cur.includes(label) ? cur.filter(x => x !== label) : [...cur, label];
    persist({ checklist_checked: next });
  };

  const nilaiAkhir = useMemo(() => {
    if (!rule.komponen) return null;
    let sum = 0, wsum = 0;
    rule.komponen.forEach(k => {
      const v = Number(wf?.nilai?.[k.key]);
      if (!isNaN(v) && v > 0) { sum += v * (k.bobot / 100); wsum += k.bobot; }
    });
    return wsum > 0 ? Math.round(sum * 100) / 100 : null;
  }, [wf?.nilai, rule.komponen]);

  const submitNilai = () => {
    if (nilaiAkhir == null) return;
    persist({
      nilai: wf.nilai,
      nilai_akhir: nilaiAkhir,
      nilai_huruf: hurufDari(nilaiAkhir),
      status: nilaiAkhir >= 55 ? 'berjalan' : 'mengulang_sidang',
    });
  };

  const handleGantiJudul = async () => {
    if (!edgeReason.trim()) return;
    const ok = await persist({
      stage: 2,
      status: 'berjalan',
      judul_final: null,
      pembimbing_1_id: null,
      pembimbing_2_id: null,
      sk_tanggal: null,
      bimbingan_proposal_acc: false,
      acc_sidang: false,
      revisi_sempro_verified: false,
      izin_syarat_verified: false,
      acc_sidang_proposal: false,
      turnitin_score: null,
      nilai: {},
      nilai_akhir: null,
      nilai_huruf: null,
      revisi_final_link: '',
      lulus: false,
      ganti_judul_alasan: edgeReason.trim(),
    });
    if (ok) { setEdgeModal(null); setEdgeReason(''); }
  };

  const handleCarryOver = async () => {
    if (!semesterBaru.trim()) return;
    const ok = await persist({ carry_over: true, semester_baru: semesterBaru.trim(), status: 'berjalan' });
    if (ok) { setEdgeModal(null); setSemesterBaru(''); }
  };

  if (loading || !wf) {
    return <div className="p-10 text-center text-gray-500">Memuat alur skripsi...</div>;
  }

  const thesisOptions = theses.map(t => {
    const s = students.find(x => x.id === t.student_id);
    return { value: t.id, label: `${s ? s.nama : '-'} — ${(t.judul || '').slice(0, 60)}` };
  });
  const currentThesisOpt = thesisOptions.find(o => wf && String(o.value) === String(wf.thesis_id));

  const selectWorkflowFor = (thesisId) => {
    const target = workflows.find(w => String(w.thesis_id) === String(thesisId));
    if (target) {
      setSelectedWf(target.id);
      setWfDraft(JSON.parse(JSON.stringify(target)));
      setActiveStage(target.stage || 1);
      setMessage(null);
      setJudulBaru(target.judul_pilihan?.length ? [...target.judul_pilihan] : ['', '', '']);
    }
  };

  const StageBadge = ({ idx }) => done[idx]
    ? <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs"><CheckCircle2 className="w-4 h-4" /></span>
    : idx === firstIncomplete
      ? <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs animate-pulse">{idx}</span>
      : <span className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs"><Lock className="w-3.5 h-3.5" /></span>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-glow">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Alur Skripsi UNKLAB</h1>
            <p className="text-gray-600 text-sm">9 tahap terintegrasi — prasyarat hingga lulus & repositori</p>
          </div>
        </div>
        {(isAdmin || isDosen) && (
          <Select label="Pilih Skripsi" value={wf.thesis_id} onChange={(e) => selectWorkflowFor(e.target.value)} options={thesisOptions} className="mb-0 min-w-[280px]" />
        )}
      </div>

      {/* Identitas skripsi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Mahasiswa</p>
          <p className="font-semibold text-slate-900">{student ? `${student.nama} (${student.npm})` : '-'}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Judul</p>
          <p className="font-semibold text-slate-900">{wf.judul_final || thesis?.judul || '(belum ditetapkan)'}</p>
          <p className="text-xs text-slate-500 mt-0.5">Fakultas: {wf.fakultas} · Status: <span className={wf.status === 'selesai' ? 'text-green-700 font-semibold' : wf.status === 'berjalan' ? 'text-blue-700 font-semibold' : 'text-red-700 font-semibold'}>{wf.status}</span>{wf.carry_over ? ' · Carry Over (' + wf.semester_baru + ')' : ''}</p>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>{message.text}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Stepper kiri */}
        <div className="xl:col-span-2 space-y-2">
          {STAGES.map((s) => {
            const unlocked = s.n <= maxUnlocked;
            const active = s.n === activeStage;
            return (
              <button
                key={s.n}
                disabled={!unlocked}
                onClick={() => setActiveStage(s.n)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : unlocked
                      ? 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                      : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <StageBadge idx={s.n} />
                <span className="flex-1 text-sm font-medium text-slate-800">{s.label}</span>
                {done[s.n] ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : unlocked ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <Lock className="w-4 h-4 text-slate-300" />}
              </button>
            );
          })}
        </div>

        {/* Panel detail kanan */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
          {activeStage === 1 && (
            <div>
              <StageHeader num={1} title="Verifikasi Prasyarat" desc="Cek registrasi aktif, minimal SKS, IPK, dan kelulusan Metodologi Penelitian (simulasi SIUNGKE)." />
              <div className="space-y-3 mt-4">
                {[
                  ['siu', 'Status registrasi aktif (SIU)'],
                  ['sks', `Minimal ${rule.min_sks ?? 144} SKS`],
                  ['ipk', `IPK minimal ${rule.min_ipk ?? 2.75}`],
                  ['metodologi', 'Lulus Metodologi Penelitian'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-blue-600"
                      disabled={!isAdmin}
                      checked={!!wf.eligibility?.[key]}
                      onChange={(e) => persist({ eligibility: { ...wf.eligibility, [key]: e.target.checked } })}
                    />
                    <span className="text-sm text-slate-800">{label}</span>
                  </label>
                ))}
              </div>
              {isAdmin && (
                <Button className="mt-4 w-full" disabled={saving || !Object.values(wf.eligibility || {}).every(Boolean)} onClick={() => persist({ eligible: true, stage: 2 })}>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Verifikasi & Tandai Eligible
                </Button>
              )}
              {!isAdmin && <p className="mt-4 text-sm text-slate-500 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Menunggu verifikasi Admin TU. Hubungi TU jika status belum eligible.</p>}
              {wf.eligible && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Mahasiswa berstatus Eligible</p>}
            </div>
          )}

          {activeStage === 2 && (
            <div>
              <StageHeader num={2} title="Pengajuan & Seleksi Judul" desc="Mahasiswa mengusulkan hingga 3 pilihan judul. Kaprodi/Koord. Skripsi menetapkan judul & pembimbing (SK Penetapan)." />
              {user.role === 'mahasiswa' && !wf.judul_final && (
                <div className="mt-4 space-y-4">
                  {judulBaru.map((j, i) => (
                    <Input key={i} label={`Usulan Judul ${i + 1}${i === 2 ? ' (opsional)' : ''}`} value={j} onChange={(e) => { const next = [...judulBaru]; next[i] = e.target.value; setJudulBaru(next); }} placeholder="Tulis usulan judul..." />
                  ))}
                  <Button onClick={() => persist({ judul_pilihan: judulBaru.filter(j => j.trim()) })} disabled={saving || !judulBaru[0].trim()} className="w-full"><FileSignature className="w-4 h-4 mr-2" /> Ajukan Usulan Judul</Button>
                </div>
              )}
              {(wf.judul_pilihan?.length > 0 || wf.judul_final) && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Usulan Judul</h4>
                  <ul className="space-y-2">
                    {wf.judul_pilihan.map((j, i) => (
                      <li key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800">{i + 1}. {j}</li>
                    ))}
                  </ul>
                  {wf.judul_final && (
                    <div className="mt-4 p-4 rounded-xl border border-green-200 bg-green-50">
                      <p className="text-[11px] uppercase tracking-wider text-green-700 font-semibold">Judul Terpilih (SK)</p>
                      <p className="font-bold text-green-900">{wf.judul_final}</p>
                      <p className="text-xs text-green-800 mt-1">Pembimbing I: {lecturerName(wf.pembimbing_1_id)} · Pembimbing II: {lecturerName(wf.pembimbing_2_id)} · SK {wf.sk_tanggal || '-'}</p>
                      {similarity != null && <p className="text-xs text-green-800 mt-0.5">Kemiripan dengan arsip: {similarity}%</p>}
                    </div>
                  )}
                  {isAdmin && !wf.judul_final && wf.judul_pilihan?.length > 0 && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <Select label="Tetapkan Judul Final" value="" onChange={(e) => {
                        const val = e.target.value;
                        if (val) setWfDraft({ ...wf, judul_final: val });
                      }} options={wf.judul_pilihan.map(j => ({ value: j, label: j }))} />
                      <p className="text-sm font-semibold text-slate-700">Kemiripan dengan arsip judul: <span className={(similarity ?? 0) > 50 ? 'text-red-600' : 'text-green-700'}>{similarity ?? '-'}%</span></p>
                      {similarity != null && similarity > 50 && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Judul sangat mirip dengan arsip — Kaprodi tetap dapat menerbitkan SK dengan pertimbangan.</p>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select label="Pembimbing I" value={wf.pembimbing_1_id || ''} onChange={(e) => setWfDraft({ ...wf, pembimbing_1_id: Number(e.target.value) })} options={lecturers.map(l => ({ value: l.id, label: l.nama }))} />
                        <Select label="Pembimbing II" value={wf.pembimbing_2_id || ''} onChange={(e) => setWfDraft({ ...wf, pembimbing_2_id: Number(e.target.value) })} options={lecturers.map(l => ({ value: l.id, label: l.nama }))} />
                      </div>
                      <Button onClick={() => { if (!wf.judul_final || !wf.pembimbing_1_id || !wf.pembimbing_2_id || wf.pembimbing_1_id === wf.pembimbing_2_id) { setMessage({ type: 'error', text: 'Pilih judul final dan 2 pembimbing berbeda.' }); return; } persist({ judul_final: wf.judul_final, pembimbing_1_id: wf.pembimbing_1_id, pembimbing_2_id: wf.pembimbing_2_id, sk_tanggal: new Date().toLocaleDateString('id-ID'), stage: 3 }); }} className="w-full"><FileSignature className="w-4 h-4 mr-2" /> Terbitkan SK Judul & Pembimbing</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeStage === 3 && (
            <div>
              <StageHeader num={3} title="Bimbingan Proposal (Bab 1–3)" desc="Unggah draf berkala, catatan revisi terdokumentasi, dan logbook bimbingan minimal sesuai fakultas." />
              <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-blue-900">Logbook Bimbingan</p>
                  <p className="text-sm font-bold text-blue-800">{konsultasiCount}/{rule.min_bimbingan ?? 8}</p>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-blue-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all" style={{ width: `${Math.min(100, (konsultasiCount / (rule.min_bimbingan || 8)) * 100)}%` }} />
                </div>
              </div>
              <div className="mt-4">
                <Input label="Link Draf Bab 1–3 (Google Drive / Repositori)" value={wf.draf_link || ''} onChange={(e) => setWfDraft({ ...wf, draf_link: e.target.value })} placeholder="https://drive.google.com/..." />
                <Button onClick={() => persist({ draf_link: wf.draf_link })} disabled={saving} variant="secondary"><FileSignature className="w-4 h-4 mr-2" /> Simpan Link Draf</Button>
                <p className="text-xs text-gray-500 mt-2">{konsultasiCount >= (rule.min_bimbingan ?? 8) ? 'Syarat jumlah bimbingan terpenuhi. Menunggu ACC dosen.' : 'Belum memenuhi syarat jumlah bimbingan untuk ACC sempro.'}</p>
              </div>
              {isDosen && (
                <Button className="mt-4 w-full" disabled={saving || konsultasiCount < (rule.min_bimbingan ?? 8)} onClick={() => persist({ bimbingan_proposal_acc: true, stage: 4 })}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> ACC Bimbingan Proposal (ACC Sempro)
                </Button>
              )}
              {wf.bimbingan_proposal_acc && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> ACC Sempro diberikan oleh dosen pembimbing</p>}
            </div>
          )}

          {activeStage === 4 && (
            <div>
              <StageHeader num={4} title="Seminar Proposal (Sempro)" desc="Penjadwalan, penunjukan penguji, input nilai, dan verifikasi revisi pascasempro." />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Tanggal Sempro" type="date" value={wf.sempro_tanggal || ''} onChange={(e) => setWfDraft({ ...wf, sempro_tanggal: e.target.value })} disabled={!isAdmin} />
                <Input label="Nilai Sempro (0–100)" type="number" value={wf.sempro_nilai ?? ''} onChange={(e) => setWfDraft({ ...wf, sempro_nilai: e.target.value === '' ? null : Number(e.target.value) })} disabled={!isAdmin} />
              </div>
              <Input label="Catatan Sempro / Revisi" value={wf.sempro_catatan || ''} onChange={(e) => setWfDraft({ ...wf, sempro_catatan: e.target.value })} disabled={!isAdmin} />
              {isAdmin && (
                <>
                  <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                    <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={!!wf.revisi_sempro_verified} onChange={(e) => setWfDraft({ ...wf, revisi_sempro_verified: e.target.checked })} />
                    Revisi pascasempro sudah diverifikasi (Berita Acara terbit)
                  </label>
                  <Button onClick={() => persist({ sempro_tanggal: wf.sempro_tanggal, sempro_nilai: wf.sempro_nilai, sempro_catatan: wf.sempro_catatan, revisi_sempro_verified: wf.revisi_sempro_verified, stage: 5 })} disabled={saving || wf.sempro_nilai == null} className="w-full"><FlaskConical className="w-4 h-4 mr-2" /> Verifikasi Sempro & Terbitkan Berita Acara</Button>
                </>
              )}
              {wf.sempro_nilai != null && wf.sempro_nilai >= 60 && wf.revisi_sempro_verified && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Sempro LULUS — lanjut tahap penelitian</p>}
              {wf.sempro_nilai != null && wf.sempro_nilai < 60 && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Mahasiswa dinyatakan MENGULANG Sempro</p>
                  {isAdmin && <Button variant="secondary" className="mt-2" onClick={() => persist({ status: 'berjalan', sempro_nilai: null, revisi_sempro_verified: false })}>Jadwalkan Ulang Sempro</Button>}
                </div>
              )}
            </div>
          )}

          {activeStage === 5 && (
            <div>
              <StageHeader num={5} title="Penelitian & Syarat Khusus" desc="Cetak surat izin riset; penuhi syarat khusus fakultas (FILKOM: repo & video demo; FKEP: Ethical Clearance; FKIP: Validasi Instrumen)." />
              <Input label="Link Bukti Izin / Syarat Khusus" value={wf.izin_syarat_link || ''} onChange={(e) => setWfDraft({ ...wf, izin_syarat_link: e.target.value })} placeholder="https://..." disabled={user.role !== 'mahasiswa'} />
              {rule.checklist_dokumen?.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Checklist Dokumen ({rule.fakultas})</p>
                  {rule.checklist_dokumen.map((doc) => (
                    <label key={doc} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                      <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={(wf.checklist_checked || []).includes(doc)} onChange={() => toggleChecklistDoc(doc)} disabled={user.role !== 'mahasiswa'} />
                      <span className="text-sm text-slate-800">{doc}</span>
                    </label>
                  ))}
                </div>
              )}
              {rule.seminar_hasil_enabled && (
                <div className="mt-4 p-4 rounded-xl border border-violet-200 bg-violet-50">
                  <p className="text-sm font-bold text-violet-900">Seminar Hasil (khusus {rule.fakultas})</p>
                  {wf.seminar_hasil_done
                    ? <p className="text-xs text-violet-800 mt-1 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Seminar Hasil telah dilaksanakan</p>
                    : <Button variant="secondary" className="mt-2" disabled={saving} onClick={() => persist({ seminar_hasil_done: true })}>Tandai Seminar Hasil Selesai</Button>}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                {user.role === 'mahasiswa' && <Button variant="secondary" onClick={() => persist({ izin_syarat_link: wf.izin_syarat_link })} disabled={saving}>Simpan Link</Button>}
                {isAdmin && <Button onClick={() => persist({ izin_syarat_verified: true, stage: 6 })} disabled={saving || !wf.izin_syarat_link}><ScanLine className="w-4 h-4 mr-2" /> Verifikasi & Terbitkan Surat Izin Penelitian</Button>}
              </div>
              {wf.izin_syarat_verified && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Syarat penelitian terpenuhi</p>}
            </div>
          )}

          {activeStage === 6 && (
            <div>
              <StageHeader num={6} title="Bimbingan Akhir & Cek Plagiasi" desc={`Bimbingan Bab 4–5, unggah hasil Turnitin (ambang ${rule.max_turnitin_percentage ?? 20}%), persetujuan sidang.`} />
              <Input label="Skor Turnitin (%)" type="number" value={wf.turnitin_score ?? ''} onChange={(e) => setWfDraft({ ...wf, turnitin_score: e.target.value === '' ? null : Number(e.target.value) })} disabled={user.role !== 'mahasiswa'} />
              {wf.turnitin_score != null && (
                wf.turnitin_score <= (rule.max_turnitin_percentage ?? 20)
                  ? <p className="text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Turnitin {wf.turnitin_score}% — memenuhi ambang (≤ {rule.max_turnitin_percentage}%)</p>
                  : <p className="text-sm text-red-700 font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Turnitin {wf.turnitin_score}% — MELEBIHI ambang {rule.max_turnitin_percentage}%. Perbaiki naskah.</p>
              )}
              {user.role === 'mahasiswa' && <Button variant="secondary" className="mt-2" onClick={() => persist({ turnitin_score: wf.turnitin_score })} disabled={saving || wf.turnitin_score == null}>Simpan Hasil Turnitin</Button>}
              {isDosen && (
                <Button className="mt-4 w-full" disabled={saving || wf.turnitin_score == null || wf.turnitin_score > (rule.max_turnitin_percentage ?? 20)} onClick={() => persist({ acc_sidang: true, stage: 7 })}>
                  <BookOpenCheck className="w-4 h-4 mr-2" /> ACC Sidang Akhir
                </Button>
              )}
              {wf.acc_sidang && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Dosen ACC sidang akhir</p>}
            </div>
          )}

          {activeStage === 7 && (
            <div>
              <StageHeader num={7} title="Verifikasi Yudisium / Sidang" desc="Unggah surat bebas pustaka, bebas Business Office, dan transkrip lengkap. Terbitkan Kartu Peserta Ujian." />
              {[
                ['bebas_pustaka', 'Surat Bebas Pustaka (Perpus UNKLAB)'],
                ['bebas_business_office', 'Surat Bebas Business Office'],
                ['transkrip_lengkap', 'Transkrip nilai lengkap'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 mt-2">
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" disabled={user.role !== 'mahasiswa'} checked={!!wf[key]} onChange={(e) => persist({ [key]: e.target.checked })} />
                  <span className="text-sm text-slate-800">{label}</span>
                </label>
              ))}
              {isAdmin && (
                <Button className="mt-4 w-full" disabled={saving || !(wf.bebas_pustaka && wf.bebas_business_office && wf.transkrip_lengkap)} onClick={() => persist({ kartu_peserta_issued: true, stage: 8 })}>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Terbitkan Kartu Peserta Ujian (Digital)
                </Button>
              )}
              {wf.kartu_peserta_issued && (
                <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50">
                  <p className="text-[11px] uppercase tracking-widest text-blue-700 font-bold">Kartu Peserta Ujian Skripsi</p>
                  <p className="font-bold text-slate-900 mt-1">{student?.nama} ({student?.npm})</p>
                  <p className="text-sm text-slate-700">{wf.judul_final}</p>
                  <p className="text-xs text-slate-500 mt-1">Fakultas: {wf.fakultas} · Jumlah Penguji: {rule.jumlah_penguji ?? 2} orang · Berlaku untuk Sidang Skripsi</p>
                </div>
              )}
            </div>
          )}

          {activeStage === 8 && (
            <div>
              <StageHeader num={8} title="Sidang Skripsi (Defense)" desc={`Input nilai per komponen (${rule.komponen?.map(k => k.label).join(', ') || 'Penulisan, Presentasi'}). Nilai akhir dihitung otomatis dengan bobot fakultas.`} />
              {(rule.komponen || []).map((k) => (
                <Input key={k.key} label={`${k.label} (bobot ${k.bobot}%) — 0–100`} type="number" value={wf.nilai?.[k.key] ?? ''} onChange={(e) => setWfDraft({ ...wf, nilai: { ...wf.nilai, [k.key]: e.target.value === '' ? undefined : Number(e.target.value) } })} disabled={!isAdmin} />
              ))}
              {nilaiAkhir != null && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">Nilai Akhir</p>
                    <p className="text-3xl font-extrabold font-display text-cyan-300">{nilaiAkhir} <span className="text-lg text-slate-300">/ 100</span></p>
                  </div>
                  <p className="text-5xl font-extrabold font-display text-white">{hurufDari(nilaiAkhir)}</p>
                </div>
              )}
              {isAdmin && (
                <Button className="mt-4 w-full" disabled={saving || nilaiAkhir == null} onClick={submitNilai}>
                  <GraduationCap className="w-4 h-4 mr-2" /> Simpan Nilai & Terbitkan Berita Acara
                </Button>
              )}
              {wf.nilai_akhir != null && wf.nilai_akhir < 55 && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Mahasiswa dinyatakan MENGULANG Sidang</p>
                  {isAdmin && <Button variant="secondary" className="mt-2" onClick={() => persist({ status: 'berjalan', nilai_akhir: null, nilai_huruf: null, nilai: {} })}>Jadwalkan Ulang Sidang</Button>}
                </div>
              )}
              {wf.nilai_akhir != null && wf.nilai_akhir >= 55 && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> LULUS sidang — lanjut tahap repositori</p>}
            </div>
          )}

          {activeStage === 9 && (
            <div>
              <StageHeader num={9} title="Revisi Akhir & Repositori" desc="Validasi revisi, unggah naskah final + lampiran, cetak lembar pengesahan ber-QR, arsip digital." />
              <Input label="Link Naskah Final + Lampiran" value={wf.revisi_final_link || ''} onChange={(e) => setWfDraft({ ...wf, revisi_final_link: e.target.value })} placeholder="https://..." disabled={user.role !== 'mahasiswa'} />
              {user.role === 'mahasiswa' && <Button variant="secondary" onClick={() => persist({ revisi_final_link: wf.revisi_final_link })} disabled={saving}>Simpan Link Naskah Final</Button>}
              {isAdmin && !wf.lulus && (
                <Button className="mt-4 w-full" disabled={saving || !wf.revisi_final_link} onClick={() => persist({ lulus: true, revisi_final_link: wf.revisi_final_link, selesai_at: new Date().toISOString(), status: 'selesai' })}>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Verifikasi & Lulus (Arsip ke Repositori)
                </Button>
              )}
              {wf.lulus && (
                <div className="mt-4 p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 text-center">
                  <Sparkles className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-[11px] uppercase tracking-widest text-emerald-700 font-bold mt-2">Arsip Digital Repositori UNKLAB</p>
                  <p className="font-extrabold font-display text-slate-900 mt-1">{wf.judul_final}</p>
                  <p className="text-sm text-slate-600">{student?.nama} · Nilai Akhir {wf.nilai_akhir} ({wf.nilai_huruf})</p>
                  <div className="mt-3 mx-auto w-32 h-32 border-2 border-slate-800 rounded-lg flex items-center justify-center text-slate-800 text-[10px] leading-tight font-mono">QR<br />BERITA ACARA<br />(simulasi)</div>
                  <p className="text-[11px] text-emerald-700 mt-3">Status: Selesai / Lulus — arsip tersimpan di Repositori UNKLAB (simulasi)</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edge cases */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="font-bold text-slate-800 text-sm">Kasus Khusus</p>
          <p className="text-xs text-slate-500">Ganti judul/pembimbing (reset ke review Kaprodi) · Perpanjangan semester (progress tersimpan)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => setEdgeModal('gantiJudul')}><AlertTriangle className="w-4 h-4 mr-2" /> Ganti Judul / Pembimbing</Button>
          <Button variant="secondary" onClick={() => setEdgeModal('carryOver')}><ChevronRight className="w-4 h-4 mr-2" /> Perpanjangan Semester (Carry Over)</Button>
        </div>
      </div>

      {/* Modal edge: ganti judul */}
      <Modal isOpen={edgeModal === 'gantiJudul'} onClose={() => setEdgeModal(null)} title="Ganti Judul / Pembimbing">
        <p className="text-sm text-gray-600 mb-3">Jika judul berubah total, status kembali ke review Kaprodi; perbaikan redaksional cukup disetujui pembimbing (tidak reset).</p>
        <Input label="Alasan Perubahan (wajib)" value={edgeReason} onChange={(e) => setEdgeReason(e.target.value)} placeholder="Contoh: judul tidak lagi relevan..." />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setEdgeModal(null)}>Batal</Button>
          <Button onClick={handleGantiJudul} disabled={!edgeReason.trim()}>Reset ke Tahap Review Judul</Button>
        </div>
      </Modal>

      {/* Modal edge: carry over */}
      <Modal isOpen={edgeModal === 'carryOver'} onClose={() => setEdgeModal(null)} title="Perpanjangan Semester (Carry Over)">
        <Input label="Semester Baru (mis. 2026/2027 Genap)" value={semesterBaru} onChange={(e) => setSemesterBaru(e.target.value)} placeholder="2026/2027 Genap" />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setEdgeModal(null)}>Batal</Button>
          <Button onClick={handleCarryOver} disabled={!semesterBaru.trim()}>Terapkan Carry Over</Button>
        </div>
      </Modal>
    </div>
  );
};

const StageHeader = ({ num, title, desc }) => (
  <div className="border-b border-slate-100 pb-4">
    <div className="flex items-center gap-2">
      <span className="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">{num}</span>
      <h2 className="text-lg font-extrabold font-display text-slate-900">{title}</h2>
    </div>
    <p className="text-sm text-slate-500 mt-2">{desc}</p>
  </div>
);

export default AlurSkripsi;
