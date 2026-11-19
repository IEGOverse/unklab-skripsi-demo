import { useState, useEffect, useMemo } from 'react';
import {
  getWorkflows, updateWorkflow, getTheses, getStudents, getConsultations, getFacultyRules, getLecturers,
  createThesis, updateThesis, getDefenseRequests, getDefenseSchedules, createNotification,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import {
  CheckCircle2, Lock, ChevronRight, AlertTriangle, GraduationCap,
  FileSignature, FlaskConical, BookOpenCheck, ShieldCheck, ScanLine, Sparkles, Printer, CalendarDays,
} from 'lucide-react';

const STAGES = [
  { n: 1, label: 'Verifikasi Prasyarat' },
  { n: 2, label: 'Pengajuan & Seleksi Judul' },
  { n: 3, label: 'Bimbingan Proposal (Bab 1–3)' },
  { n: 4, label: 'Seminar Proposal (Sempro)' },
  { n: 5, label: 'Penelitian & Syarat Khusus' },
  { n: 6, label: 'Bimbingan Akhir & Turnitin' },
  { n: 7, label: 'Verifikasi Yudisium / Sidang' },
  { n: 8, label: 'Sidang Skripsi (Defense)' },
  { n: 9, label: 'Revisi Akhir & Repositori' },
];

const hurufDari = (n, scale) => {
  if (n == null || isNaN(n)) return '-';
  const rows = (scale && scale.length ? [...scale] : [
    { huruf: 'A', min: 85 }, { huruf: 'A-', min: 80 }, { huruf: 'B+', min: 75 }, { huruf: 'B', min: 70 }, { huruf: 'B-', min: 65 },
    { huruf: 'C+', min: 60 }, { huruf: 'C', min: 55 }, { huruf: 'D', min: 50 }, { huruf: 'E', min: 0 },
  ]).sort((a, b) => b.min - a.min);
  for (const row of rows) if (Number(n) >= Number(row.min)) return row.huruf;
  return rows[rows.length - 1].huruf;
};

const jaccard = (a, b) => {
  const setA = new Set(a.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  setA.forEach(w => { if (setB.has(w)) inter++; });
  return Math.round((inter / new Set([...setA, ...setB]).size) * 100);
};

const avg = (arr) => {
  const nums = arr.map(Number).filter(n => !isNaN(n));
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : null;
};

const AlurSkripsi = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [theses, setTheses] = useState([]);
  const [students, setStudents] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [rules, setRules] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [defenseRequests, setDefenseRequests] = useState([]);
  const [defenseSchedules, setDefenseSchedules] = useState([]);
  const [selectedWf, setSelectedWf] = useState(null);
  const [wfDraft, setWfDraft] = useState(null);
  const [activeStage, setActiveStage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [edgeModal, setEdgeModal] = useState(null);
  const [edgeReason, setEdgeReason] = useState('');
  const [semesterBaru, setSemesterBaru] = useState('');
  const [judulBaru, setJudulBaru] = useState(['', '', '']);
  const [abstrak, setAbstrak] = useState('');
  const [pilihanJudul, setPilihanJudul] = useState('');
  const [pilihanPembimbing1, setPilihanPembimbing1] = useState('');
  const [pilihanPembimbing2, setPilihanPembimbing2] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isDosen = user?.role === 'dosen';

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [rWf, rTh, rSt, rC, rR, rL, rReq, rSch] = await Promise.all([
        getWorkflows(), getTheses(), getStudents(), getConsultations(), getFacultyRules(), getLecturers(),
        getDefenseRequests(), getDefenseSchedules(),
      ]);
      const norm = (r) => r.data?.data || r.data || [];
      const wfs = norm(rWf);
      setWorkflows(wfs);
      setTheses(norm(rTh));
      setStudents(norm(rSt));
      setConsultations(norm(rC));
      setRules(norm(rR));
      setLecturers(norm(rL));
      setDefenseRequests(norm(rReq));
      setDefenseSchedules(norm(rSch));

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
        setJudulBaru(pick.judul_pilihan?.length ? [...pick.judul_pilihan] : ['', '', '']);
        setPilihanJudul('');
        setPilihanPembimbing1('');
        setPilihanPembimbing2('');
        const pickThesis = pick?.thesis_id ? norm(rTh).find(t => t.id === pick.thesis_id) : null;
        setAbstrak(pickThesis?.abstrak || '');
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const wf = wfDraft;
  const linkedDefenseRequest = wf ? (defenseRequests || []).filter(r => String(r.thesis_id) === String(wf.thesis_id)).slice(-1)[0] || null : null;
  const scheduledDefense = linkedDefenseRequest ? (defenseSchedules || []).find(s => Number(s.defense_request_id) === Number(linkedDefenseRequest.id)) : null;
  const defenseApproved = !!linkedDefenseRequest && linkedDefenseRequest.status === 'disetujui';
  const requestStatusInfo = {
    pending: { label: 'Menunggu ACC Pembimbing', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    diterima_dosen: { label: 'Diterima Pembimbing — Menunggu Penjadwalan', cls: 'bg-green-100 text-green-800 border-green-200' },
    ditolak_dosen: { label: 'Ditolak Pembimbing', cls: 'bg-red-100 text-red-800 border-red-200' },
    menunggu_persetujuan_dosen: { label: 'Diusulkan Panitia — Menunggu Pembimbing', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    disetujui: { label: 'Dijadwalkan', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  };
  const rule = rules.find(r => r.fakultas === wf?.fakultas) || {};
  const thesis = theses.find(t => t.id === wf?.thesis_id);
  const student = students.find(s => s.id === thesis?.student_id);
  const lecturerName = (id) => { const l = lecturers.find(x => String(x.id) === String(id)); return l ? l.nama : '-'; };
  const konsultasiCount = consultations.filter(c => String(c.thesis_id) === String(thesis?.id)).length;

  // Dosen yang sedang login — cocokkan lewat user_id lecturer record
  const meAsLecturer = isDosen ? lecturers.find(l => String(l.user_id) === String(user.id)) : null;
  const isAssignedDosen = isDosen && meAsLecturer && wf && [wf.pembimbing_1_id, wf.pembimbing_2_id].includes(meAsLecturer.id);
  const canPembimbing = isAdmin || isAssignedDosen;

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
      8: wf.nilai_akhir != null && wf.nilai_huruf !== 'E',
      9: !!wf.lulus,
    };
  }, [wf, rule]);

  const maxUnlocked = useMemo(() => {
    for (let i = 1; i <= 9; i++) if (!done[i]) return i;
    return 9;
  }, [done]);

  // Hitung kesamaan dengan arsip judul (exclude tesis sendiri)
  const similarityJudul = useMemo(() => {
    const candidate = (pilihanJudul || wf?.judul_final || '').trim();
    if (!candidate) return null;
    let best = 0;
    theses.forEach(t => {
      if (t.id === wf?.thesis_id) return;
      best = Math.max(best, jaccard(candidate, t.judul));
    });
    return best;
  }, [pilihanJudul, wf?.judul_final, theses, wf?.thesis_id]);

  // Hitung nilai rata-rata sempro & sidang — seluruh penguji terdata
  const semproPengujiIds = wf?.sempro_penguji || [];
  const semproNilai = useMemo(() => {
    if (!semproPengujiIds.length) return null;
    return avg(semproPengujiIds.map(id => wf?.sempro_detail?.[id]));
  }, [semproPengujiIds, wf?.sempro_detail]);

  const nilaiKomponen = useMemo(() => {
    if (!wf || !rule.komponen) return null;
    const perPenguji = (wf.sidang_penguji || []).map(pid => {
      const row = wf.nilai_detail?.[pid] || {};
      let sum = 0, wsum = 0;
      rule.komponen.forEach(k => {
        const v = Number(row[k.key]);
        if (!isNaN(v) && row[k.key] !== undefined && v !== '') { sum += v * (k.bobot / 100); wsum += k.bobot; }
      });
      return wsum > 0 ? sum / (wsum / 100) : null;
    }).filter(v => v != null);
    if (!perPenguji.length) return null;
    return {
      perPenguji,
      akhir: Math.round((perPenguji.reduce((a, b) => a + b, 0) / perPenguji.length) * 100) / 100,
    };
  }, [wf, rule.komponen]);

  const nilaiAkhir = nilaiKomponen?.akhir ?? null;
  const nilaiHuruf = hurufDari(nilaiAkhir, rule.grade_scale);

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

  const handleAjukanJudul = async () => {
    const me = user.role === 'mahasiswa' ? students.find(s => String(s.user_id) === String(user.id)) : null;
    const validProposals = judulBaru.filter(j => j.trim());
    if (validProposals.length === 0) {
      setMessage({ type: 'error', text: 'Minimal 1 judul diisi.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      let thesis = wf.thesis_id ? theses.find(t => t.id === wf.thesis_id) : null;
      const thesisPayload = {
        student_id: me ? me.id : (thesis?.student_id) || (student?.id) || null,
        judul: validProposals[0],
        abstrak,
        status: 'diajukan',
      };
      if (thesis) {
        const res = await updateThesis(thesis.id, { ...thesis, ...thesisPayload });
        thesis = res.data?.data || res.data || { ...thesis, ...thesisPayload };
      } else {
        const res = await createThesis({ ...thesisPayload, created_at: new Date().toISOString() });
        thesis = res.data?.data || res.data || null;
      }
      await persist({ judul_pilihan: validProposals, thesis_id: thesis?.id ?? wf.thesis_id });
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal mengajukan: ' + (e.response?.data?.message || e.message) });
    } finally { setSaving(false); }
  };

  const handleTerbitkanSK = async () => {
    const finalJudul = pilihanJudul || wf.judul_final;
    const p1 = pilihanPembimbing1 !== '' ? Number(pilihanPembimbing1) : Number(wf.pembimbing_1_id);
    const p2 = pilihanPembimbing2 !== '' ? Number(pilihanPembimbing2) : Number(wf.pembimbing_2_id);
    if (!finalJudul || !p1 || !p2 || p1 === p2) {
      setMessage({ type: 'error', text: 'Pilih judul final dan 2 pembimbing berbeda.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      let thesis = wf.thesis_id ? theses.find(t => t.id === wf.thesis_id) : null;
      const payload = { judul: finalJudul, abstrak, status: 'disetujui' };
      if (thesis) {
        await updateThesis(thesis.id, { ...thesis, ...payload });
      } else {
        const res = await createThesis({ student_id: (student?.id) ?? null, ...payload, created_at: new Date().toISOString() });
        const created = res.data?.data || res.data;
        thesis = created;
      }
      await persist({
        judul_final: finalJudul,
        pembimbing_1_id: p1,
        pembimbing_2_id: p2,
        sk_tanggal: new Date().toLocaleDateString('id-ID'),
        stage: 3,
        thesis_id: thesis?.id ?? wf.thesis_id,
      });
      setPilihanJudul('');
      setPilihanPembimbing1('');
      setPilihanPembimbing2('');
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menerbitkan SK: ' + (e.response?.data?.message || e.message) });
    } finally { setSaving(false); }
  };

  const toggleChecklistDoc = (label) => {
    const cur = wf.checklist_checked || [];
    const next = cur.includes(label) ? cur.filter(x => x !== label) : [...cur, label];
    persist({ checklist_checked: next });
  };

  const togglePenguji = (list, id) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  const fmtDateID = (iso) => {
    if (!iso) return '-';
    const d = new Date(String(iso).includes('T') ? iso : iso + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleScheduleSempro = async () => {
    const ruangan = (wf.sempro_ruangan || '').trim();
    const ok = await persist({ sempro_tanggal: wf.sempro_tanggal, sempro_waktu: wf.sempro_waktu || '', sempro_ruangan: ruangan, sempro_penguji: wf.sempro_penguji, sempro_scheduled: true });
    if (!ok) return;
    try {
      const names = (wf.sempro_penguji || []).map(lecturerName).join(' & ');
      await createNotification({
        recipient_role: 'mahasiswa',
        sender: 'Panitia (Admin)',
        title: 'Jadwal Seminar Proposal Anda',
        body: `${student?.nama || 'Mahasiswa'}, seminar proposal Anda dijadwalkan pada ${fmtDateID(wf.sempro_tanggal)} pukul ${wf.sempro_waktu} di ${ruangan}. Penguji: ${names}.`,
        type: 'sempro_schedule',
        request_id: null,
        read: false,
        created_at: new Date().toISOString(),
      });
      setMessage({ type: 'success', text: 'Jadwal diterbitkan & notifikasi terkirim ke mahasiswa.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Jadwal tersimpan, tapi notifikasi gagal dikirim.' });
    }
  };

  const handleRescheduleSempro = async () => {
    const ok = await persist({
      status: 'berjalan', sempro_scheduled: false, sempro_tanggal: null, sempro_waktu: null, sempro_ruangan: null,
      sempro_penguji: [], sempro_detail: {}, sempro_nilai: null, sempro_catatan: '', revisi_sempro_verified: false, stage: 4,
    });
    if (!ok) return;
    try {
      await createNotification({
        recipient_role: 'mahasiswa',
        sender: 'Panitia (Admin)',
        title: 'Seminar Proposal Dijadwalkan Ulang',
        body: `${student?.nama || 'Mahasiswa'}, seminar proposal Anda belum lulus. Panitia akan mengusulkan jadwal baru — mohon menunggu notifikasi berikutnya.`,
        type: 'sempro_reschedule',
        request_id: null,
        read: false,
        created_at: new Date().toISOString(),
      });
      setMessage({ type: 'success', text: 'Sempro dijadwalkan ulang — mahasiswa menerima notifikasi.' });
    } catch (e) { console.error(e); }
  };

  const saveSempro = async () => {
    if (semproNilai == null) { setMessage({ type: 'error', text: 'Minimal satu nilai penguji diisi.' }); return; }
    const ok = await persist({ sempro_tanggal: wf.sempro_tanggal, sempro_waktu: wf.sempro_waktu, sempro_ruangan: wf.sempro_ruangan, sempro_penguji: wf.sempro_penguji, sempro_detail: wf.sempro_detail, sempro_nilai: semproNilai, revisi_sempro_verified: wf.revisi_sempro_verified, stage: 5 });
    if (!ok) return;
    try {
      const lulus = semproNilai >= 60;
      await createNotification({
        recipient_role: 'mahasiswa',
        sender: 'Panitia (Admin)',
        title: lulus ? 'Seminar Proposal — LULUS' : 'Seminar Proposal — BELUM LULUS',
        body: `${student?.nama || 'Mahasiswa'}, nilai Sempro Anda ${semproNilai}. ${lulus ? 'Selamat — lanjut ke tahap penelitian.' : 'Panitia akan mengusulkan jadwal ulang seminar proposal.'}`,
        type: 'sempro_result',
        request_id: null,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (e) { console.error(e); }
  };

  const saveSidang = () => {
    if (!wf.sidang_penguji?.length || wf.sidang_penguji.length !== (rule.jumlah_penguji ?? 2)) {
      setMessage({ type: 'error', text: `Pilih tepat ${rule.jumlah_penguji ?? 2} penguji sidang.` });
      return;
    }
    const isPass = nilaiHuruf !== 'E';
    persist({
      sidang_penguji: wf.sidang_penguji,
      nilai_detail: wf.nilai_detail,
      nilai_akhir: nilaiAkhir,
      nilai_huruf: nilaiHuruf,
      status: isPass ? 'berjalan' : 'mengulang_sidang',
      ...(isPass ? { stage: 9 } : {}),
    });
  };

  const handleGantiJudul = async () => {
    if (!edgeReason.trim()) return;
    const ok = await persist({
      stage: 2, status: 'berjalan',
      judul_final: null, pembimbing_1_id: null, pembimbing_2_id: null, sk_tanggal: null,
      bimbingan_proposal_acc: false, revisi_sempro_verified: false, izin_syarat_verified: false, acc_sidang: false,
      turnitin_score: null, nilai_akhir: null, nilai_huruf: null, revisi_final_link: '', lulus: false,
      ganti_judul_alasan: edgeReason.trim(),
    });
    if (ok) { setEdgeModal(null); setEdgeReason(''); }
  };

  const handleCarryOver = async () => {
    if (!semesterBaru.trim()) return;
    const ok = await persist({ carry_over: true, semester_baru: semesterBaru.trim(), status: 'berjalan' });
    if (ok) { setEdgeModal(null); setSemesterBaru(''); }
  };

  const selectWorkflowFor = (thesisId) => {
    const target = workflows.find(w => String(w.thesis_id) === String(thesisId));
    if (target) {
      setSelectedWf(target.id);
      setWfDraft(JSON.parse(JSON.stringify(target)));
      setActiveStage(target.stage || 1);
      setMessage(null);
      setJudulBaru(target.judul_pilihan?.length ? [...target.judul_pilihan] : ['', '', '']);
      setPilihanJudul('');
      setPilihanPembimbing1('');
      setPilihanPembimbing2('');
      const targetThesis = target.thesis_id ? theses.find(t => t.id === target.thesis_id) : null;
      setAbstrak(targetThesis?.abstrak || '');
    }
  };

  if (loading || !wf) {
    return <div className="p-10 text-center text-gray-500">Memuat alur skripsi...</div>;
  }

  const thesisOptions = theses.map(t => {
    const s = students.find(x => x.id === t.student_id);
    return { value: t.id, label: `${s ? s.nama : '-'} — ${(t.judul || '').slice(0, 60)}` };
  });

  const StageBadge = ({ idx }) => (
    done[idx]
      ? <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></span>
      : idx === maxUnlocked
        ? <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs animate-pulse">{idx}</span>
        : <span className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center"><Lock className="w-3.5 h-3.5" /></span>
  );

  const PengujiSelector = ({ selected, onToggle, max }) => (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Penguji (pilih {max ?? 'minimal 1'})</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {lecturers.map(l => (
          <label key={l.id} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${selected.includes(l.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
            <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={selected.includes(l.id)} onChange={() => onToggle(l.id)} />
            <span className="text-xs text-slate-800 leading-snug">{l.nama}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const nilaiInputClass = 'w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

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
          <p className="font-semibold text-slate-900">{student ? `${student.nama} (${student.nim})` : '-'}</p>
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
              {!isAdmin && <p className="mt-4 text-sm text-slate-500 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Menunggu verifikasi Admin TU.</p>}
              {wf.eligible && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Mahasiswa berstatus Eligible</p>}
            </div>
          )}

          {activeStage === 2 && (
            <div>
              <StageHeader num={2} title="Pengajuan & Seleksi Judul" desc="Mahasiswa mengusulkan judul + abstrak. Kaprodi/Admin menetapkan judul final & pembimbing (SK Penetapan)." />
              {user.role === 'mahasiswa' && !wf.judul_final && (
                <div className="mt-4 space-y-4">
                  {judulBaru.map((j, i) => (
                    <Input key={i} label={`Usulan Judul ${i + 1}${i === 2 ? ' (opsional)' : ''}`} value={j} onChange={(e) => { const next = [...judulBaru]; next[i] = e.target.value; setJudulBaru(next); }} placeholder="Tulis usulan judul..." />
                  ))}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Abstrak</label>
                    <textarea
                      rows={3}
                      value={abstrak}
                      onChange={(e) => setAbstrak(e.target.value)}
                      placeholder="Ringkasan singkat skripsi Anda (min. 1-2 kalimat)..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  <Button onClick={handleAjukanJudul} disabled={saving || !judulBaru[0].trim()} className="w-full"><FileSignature className="w-4 h-4 mr-2" /> Ajukan Usulan Judul</Button>
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
                  {(wf.abstrak || abstrak) && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Abstrak</p>
                      <p className="whitespace-pre-wrap">{wf.abstrak || abstrak}</p>
                    </div>
                  )}
                  {wf.judul_final && (
                    <div className="mt-4 p-4 rounded-xl border border-green-200 bg-green-50">
                      <p className="text-[11px] uppercase tracking-wider text-green-700 font-semibold">Judul Terpilih (SK)</p>
                      <p className="font-bold text-green-900">{wf.judul_final}</p>
                      <p className="text-xs text-green-800 mt-1">Pembimbing I: {lecturerName(wf.pembimbing_1_id)} · Pembimbing II: {lecturerName(wf.pembimbing_2_id)} · SK {wf.sk_tanggal || '-'}</p>
                      {similarityJudul != null && <p className="text-xs text-green-800 mt-0.5">Kemiripan dengan arsip: {similarityJudul}%</p>}
                      <button onClick={() => window.print()} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 rounded-lg px-3 py-1.5 bg-white"><Printer className="w-4 h-4" /> Cetak SK Penetapan</button>
                    </div>
                  )}
                  {isAdmin && !wf.judul_final && wf.judul_pilihan?.length > 0 && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <Select label="Tetapkan Judul Final" value={pilihanJudul} onChange={(e) => setPilihanJudul(e.target.value)} options={wf.judul_pilihan.map(j => ({ value: j, label: j }))} />
                      <p className="text-sm font-semibold text-slate-700">Kemiripan dengan arsip judul: <span className={(similarityJudul ?? 0) > 50 ? 'text-red-600' : 'text-green-700'}>{similarityJudul ?? '-'}%</span></p>
                      {similarityJudul != null && similarityJudul > 50 && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Judul sangat mirip dengan arsip — Kaprodi tetap dapat menerbitkan SK dengan pertimbangan.</p>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select label="Pembimbing I" value={pilihanPembimbing1} onChange={(e) => setPilihanPembimbing1(e.target.value)} options={lecturers.map(l => ({ value: l.id, label: l.nama }))} />
                        <Select label="Pembimbing II" value={pilihanPembimbing2} onChange={(e) => setPilihanPembimbing2(e.target.value)} options={lecturers.map(l => ({ value: l.id, label: l.nama }))} />
                      </div>
                      <Button onClick={handleTerbitkanSK} className="w-full"><FileSignature className="w-4 h-4 mr-2" /> Terbitkan SK Judul & Pembimbing</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeStage === 3 && (
            <div>
              <StageHeader num={3} title="Bimbingan Proposal (Bab 1–3)" desc="Unggah draf berkala, catatan revisi terdokumentasi, dan logbook bimbingan minimal sesuai fakultas. ACC hanya oleh pembimbing yang ditugaskan." />
              <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-blue-900">Logbook Bimbingan</p>
                  <p className="text-sm font-bold text-blue-800">{konsultasiCount}/{rule.min_bimbingan ?? 8}</p>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-blue-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all" style={{ width: `${Math.min(100, (konsultasiCount / (rule.min_bimbingan || 8)) * 100)}%` }} />
                </div>
                <p className="text-xs text-blue-800 mt-1">Pembimbing: {lecturerName(wf.pembimbing_1_id)} · {lecturerName(wf.pembimbing_2_id)}</p>
              </div>
              <div className="mt-4">
                <Input label="Link Draf Bab 1–3" value={wf.draf_link || ''} onChange={(e) => setWfDraft({ ...wf, draf_link: e.target.value })} disabled={user.role !== 'mahasiswa'} />
                {user.role === 'mahasiswa' && <Button onClick={() => persist({ draf_link: wf.draf_link })} disabled={saving} variant="secondary"><FileSignature className="w-4 h-4 mr-2" /> Simpan Link Draf</Button>}
                <p className="text-xs text-gray-500 mt-2">{konsultasiCount >= (rule.min_bimbingan ?? 8) ? 'Syarat jumlah bimbingan terpenuhi. Menunggu ACC pembimbing.' : 'Belum memenuhi syarat jumlah bimbingan untuk ACC sempro.'}</p>
              </div>
              {canPembimbing && (
                <Button className="mt-4 w-full" disabled={saving || konsultasiCount < (rule.min_bimbingan ?? 8)} onClick={() => persist({ bimbingan_proposal_acc: true, stage: 4 })}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> ACC Bimbingan Proposal (ACC Sempro)
                </Button>
              )}
              {isDosen && !isAssignedDosen && <p className="mt-4 text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Anda bukan pembimbing yang ditugaskan untuk skripsi ini — hanya peninjau.</p>}
              {wf.bimbingan_proposal_acc && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> ACC Sempro diberikan</p>}
            </div>
          )}

          {activeStage === 4 && (
            <div>
              <StageHeader num={4} title="Seminar Proposal (Sempro)" desc="Alur: (1) Panitia mengatur jadwal — mahasiswa menerima notifikasi. (2) Setelah terlaksana, nilai diinput & diverifikasi ini → Berita Acara. Tidak lulus? Dijadwalkan ulang." />

              {/* LANGKAH 1 — ATUR JADWAL TERLEBIH DAHULU */}
              <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Langkah 1 — Atur Jadwal Sempro</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Tanggal Sempro" type="date" value={wf.sempro_tanggal || ''} onChange={(e) => setWfDraft({ ...wf, sempro_tanggal: e.target.value })} disabled={!isAdmin} />
                  <Input label="Waktu" type="time" value={wf.sempro_waktu || ''} onChange={(e) => setWfDraft({ ...wf, sempro_waktu: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="mt-3">
                  <Input label="Ruangan" value={wf.sempro_ruangan || ''} onChange={(e) => setWfDraft({ ...wf, sempro_ruangan: e.target.value })} placeholder="Mis. R101" disabled={!isAdmin} />
                </div>
                <div className="mt-3">
                  <PengujiSelector selected={wf.sempro_penguji || []} onToggle={(id) => setWfDraft({ ...wf, sempro_penguji: togglePenguji(wf.sempro_penguji || [], id) })} max="minimal 1" />
                </div>
                {isAdmin && (
                  <Button className="mt-3 w-full" disabled={saving || !wf.sempro_tanggal || !wf.sempro_waktu || !(wf.sempro_ruangan || '').trim() || !(wf.sempro_penguji?.length >= 1)} onClick={handleScheduleSempro}>
                    <CalendarDays className="w-4 h-4 mr-2" /> {wf.sempro_scheduled ? 'Perbarui Jadwal & Kirim Notifikasi' : 'Terbitkan Jadwal & Kirim Notifikasi'}
                  </Button>
                )}
                {wf.sempro_scheduled && (
                  <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800">
                    <p className="font-bold">Jadwal diterbitkan — mahasiswa menerima notifikasi.</p>
                    <p className="mt-0.5">{fmtDateID(wf.sempro_tanggal)} · {wf.sempro_waktu} · {wf.sempro_ruangan} · Penguji: {(wf.sempro_penguji || []).map(lecturerName).join(', ')}</p>
                  </div>
                )}
              </div>

              {/* LANGKAH 2 — NILAI & BERITA ACARA (terkunci sampai jadwal terbit) */}
              <div className={'mt-4 p-4 rounded-xl border ' + (wf.sempro_scheduled ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-slate-50')}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Langkah 2 — Nilai & Berita Acara</p>
                {!wf.sempro_scheduled && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" /> Nilai hanya bisa diinput setelah jadwal diterbitkan (Langkah 1).</p>
                )}
                {wf.sempro_scheduled && (
                  <>
                    {wf.sempro_penguji?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Nilai per Penguji (0–100)</p>
                        <div className="space-y-2">
                          {wf.sempro_penguji.map((pid) => {
                            const editable = isAdmin || (isDosen && meAsLecturer?.id === pid);
                            return (
                              <div key={pid} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white">
                                <span className="flex-1 text-sm text-slate-800">{lecturerName(pid)}</span>
                                <input type="number" min={0} max={100} className={nilaiInputClass} disabled={!editable} value={wf.sempro_detail?.[pid] ?? ''} onChange={(e) => setWfDraft({ ...wf, sempro_detail: { ...wf.sempro_detail, [pid]: e.target.value === '' ? undefined : Number(e.target.value) } })} placeholder="0-100" />
                              </div>
                            );
                          })}
                        </div>
                        {semproNilai != null && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-900 text-cyan-300 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-widest text-slate-400">Nilai Sempro (rata-rata)</span>
                            <span className="text-2xl font-extrabold font-display">{semproNilai}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-3">
                      <Input label="Catatan Sempro / Revisi" value={wf.sempro_catatan || ''} onChange={(e) => setWfDraft({ ...wf, sempro_catatan: e.target.value })} disabled={!isAdmin} />
                    </div>
                    {isAdmin && (
                      <>
                        <label className="flex items-center gap-2 text-sm text-gray-700 mb-3 mt-3">
                          <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={!!wf.revisi_sempro_verified} onChange={(e) => setWfDraft({ ...wf, revisi_sempro_verified: e.target.checked })} />
                          Revisi pascasempro sudah diverifikasi (Berita Acara terbit)
                        </label>
                        <Button onClick={saveSempro} disabled={saving || semproNilai == null} className="w-full"><FlaskConical className="w-4 h-4 mr-2" /> Verifikasi Sempro & Terbitkan Berita Acara</Button>
                      </>
                    )}
                  </>
                )}
              </div>
              {wf.sempro_nilai != null && wf.revisi_sempro_verified && wf.sempro_nilai >= 60 && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Sempro LULUS ({wf.sempro_nilai}) — lanjut penelitian</p>}
              {wf.sempro_nilai != null && wf.sempro_nilai < 60 && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Mahasiswa MENGULANG Sempro ({wf.sempro_nilai})</p>
                  {isAdmin && <Button variant="secondary" className="mt-2" onClick={handleRescheduleSempro}>Jadwalkan Ulang Sempro</Button>}
                </div>
              )}
              {wf.sempro_nilai != null && (
                <button onClick={() => window.print()} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 rounded-lg px-3 py-1.5 bg-white"><Printer className="w-4 h-4" /> Cetak Berita Acara Sempro</button>
              )}
            </div>
          )}


          {activeStage === 5 && (
            <div>
              <StageHeader num={5} title="Penelitian & Syarat Khusus" desc="Surat izin riset + syarat khusus fakultas (FILKOM: repo & video demo; FKEP: Ethical Clearance; FKIP: Validasi Instrumen)." />
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
              <StageHeader num={6} title="Bimbingan Akhir & Cek Plagiasi" desc={`Bimbingan Bab 4–5, unggah hasil Turnitin (ambang ${rule.max_turnitin_percentage ?? 20}%), persetujuan sidang — ACC hanya pembimbing.`} />
              <Input label="Skor Turnitin (%)" type="number" value={wf.turnitin_score ?? ''} onChange={(e) => setWfDraft({ ...wf, turnitin_score: e.target.value === '' ? null : Number(e.target.value) })} disabled={user.role !== 'mahasiswa'} />
              {wf.turnitin_score != null && (
                wf.turnitin_score <= (rule.max_turnitin_percentage ?? 20)
                  ? <p className="text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Turnitin {wf.turnitin_score}% — memenuhi ambang (≤ {rule.max_turnitin_percentage}%)</p>
                  : <p className="text-sm text-red-700 font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Turnitin {wf.turnitin_score}% — MELEBIHI ambang {rule.max_turnitin_percentage}%. Perbaiki naskah.</p>
              )}
              {user.role === 'mahasiswa' && <Button variant="secondary" className="mt-2" onClick={() => persist({ turnitin_score: wf.turnitin_score })} disabled={saving || wf.turnitin_score == null}>Simpan Hasil Turnitin</Button>}
              {canPembimbing && (
                <Button className="mt-4 w-full" disabled={saving || wf.turnitin_score == null || wf.turnitin_score > (rule.max_turnitin_percentage ?? 20)} onClick={() => persist({ acc_sidang: true, stage: 7 })}>
                  <BookOpenCheck className="w-4 h-4 mr-2" /> ACC Sidang Akhir
                </Button>
              )}
              {isDosen && !isAssignedDosen && <p className="mt-4 text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Anda bukan pembimbing — hanya peninjau.</p>}
              {wf.acc_sidang && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Pembimbing ACC sidang akhir</p>}
            </div>
          )}

          {activeStage === 7 && (
            <div>
              <StageHeader num={7} title="Verifikasi Yudisium / Sidang" desc="Surat bebas pustaka, Business Office, transkrip lengkap → Kartu Peserta Ujian." />
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
              {/* Status pendaftaran ujian defense (terintegrasi Alur Skripsi) */}
              <div className="mt-3 p-3 rounded-xl border bg-slate-50 text-xs space-y-1.5">
                <p className="font-bold text-slate-700 uppercase tracking-wide">Pendaftaran Ujian Defense</p>
                {linkedDefenseRequest ? (
                  <>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${requestStatusInfo[linkedDefenseRequest.status]?.cls || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {requestStatusInfo[linkedDefenseRequest.status]?.label || linkedDefenseRequest.status}
                    </span>
                    <p className="text-slate-600">Usulan: <span className="font-semibold">{linkedDefenseRequest.tanggal_diusulkan} · {linkedDefenseRequest.waktu_diusulkan}</span></p>
                    {scheduledDefense && (
                      <p className="text-slate-600">Jadwal: <span className="font-semibold">{new Date(`${scheduledDefense.tanggal}T${scheduledDefense.waktu || '00:00'}`).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} · {scheduledDefense.waktu} · {scheduledDefense.ruangan} · Penguji {scheduledDefense.dosen_penguji_1_nama} &amp; {scheduledDefense.dosen_penguji_2_nama}</span></p>
                    )}
                    {linkedDefenseRequest.status === 'diterima_dosen' && (
                      <p className="text-amber-700">Menunggu penjadwalan panitia — buat jadwal di menu <span className="font-semibold">Penjadwalan Sidang</span>.</p>
                    )}
                    {linkedDefenseRequest.status === 'menunggu_persetujuan_dosen' && (
                      <p className="text-amber-700">Menunggu ACC pembimbing atas usulan jadwal panitia — lihat menu <span className="font-semibold">Persetujuan Jadwal</span> (dosen).</p>
                    )}
                    {linkedDefenseRequest.status === 'ditolak_dosen' && linkedDefenseRequest.alasan_dosen && (
                      <p className="text-red-700">Alasan pembimbing: {linkedDefenseRequest.alasan_dosen}</p>
                    )}
                  </>
                ) : (
                  <p className="text-amber-700 flex items-center gap-1"><AlertTriangle className="w-4 h-4 shrink-0" /> Mahasiswa belum mendaftar ujian — Kartu Peserta belum bisa terbit.</p>
                )}
              </div>
              {isAdmin && (
                <Button className="mt-4 w-full" disabled={saving || !(wf.bebas_pustaka && wf.bebas_business_office && wf.transkrip_lengkap) || !defenseApproved} onClick={() => persist({ kartu_peserta_issued: true, stage: 8 })}>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Terbitkan Kartu Peserta Ujian (Digital)
                </Button>
              )}
              {isAdmin && !defenseApproved && (wf.bebas_pustaka && wf.bebas_business_office && wf.transkrip_lengkap) && (
                <p className="mt-2 text-[11px] text-amber-700">Tombol aktif setelah pendaftaran ujian disetujui &amp; dijadwalkan (status “Dijadwalkan”).</p>
              )}
              {wf.kartu_peserta_issued && (
                <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50">
                  <p className="text-[11px] uppercase tracking-widest text-blue-700 font-bold">Kartu Peserta Ujian Skripsi</p>
                  <p className="font-bold text-slate-900 mt-1">{student?.nama} ({student?.nim})</p>
                  <p className="text-sm text-slate-700">{wf.judul_final}</p>
                  <p className="text-xs text-slate-500 mt-1">Fakultas: {wf.fakultas} · Jumlah Penguji: {rule.jumlah_penguji ?? 2} orang · Berlaku untuk Sidang Skripsi</p>
                  <button onClick={() => window.print()} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 rounded-lg px-3 py-1.5 bg-white"><Printer className="w-4 h-4" /> Cetak Kartu Peserta</button>
                </div>
              )}
            </div>
          )}

          {activeStage === 8 && (
            <div>
              <StageHeader num={8} title="Sidang Skripsi (Defense)" desc={`Pilih ${rule.jumlah_penguji ?? 2} penguji; setiap penguji memberi nilai per komponen. Nilai akhir dihitung otomatis dengan bobot fakultas.`} />
              {scheduledDefense && (
                <p className="mt-2 text-xs text-slate-600">Jadwal sidang (panitia): <span className="font-semibold">{new Date(`${scheduledDefense.tanggal}T${scheduledDefense.waktu || '00:00'}`).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} · {scheduledDefense.waktu} · {scheduledDefense.ruangan} · Penguji {scheduledDefense.dosen_penguji_1_nama} &amp; {scheduledDefense.dosen_penguji_2_nama}</span></p>
              )}
              {isAdmin && (
                <div className="mt-4">
                  <PengujiSelector selected={wf.sidang_penguji || []} onToggle={(id) => setWfDraft({ ...wf, sidang_penguji: togglePenguji(wf.sidang_penguji || [], id) })} max={`tepat ${rule.jumlah_penguji ?? 2}`} />
                </div>
              )}
              {!isAdmin && wf.sidang_penguji?.length > 0 && (
                <p className="mt-4 text-sm text-slate-600">Penguji: {(wf.sidang_penguji || []).map(lecturerName).join(', ')}</p>
              )}
              {wf.sidang_penguji?.length > 0 && rule.komponen && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-slate-900 text-slate-100">
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Penguji</th>
                        {rule.komponen.map(k => <th key={k.key} className="px-3 py-2 text-center text-xs uppercase tracking-wide">{k.label}<br /><span className="text-[10px] text-slate-400">bobot {k.bobot}%</span></th>)}
                        <th className="px-3 py-2 text-center text-xs uppercase tracking-wide">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wf.sidang_penguji.map(pid => {
                        const editable = isAdmin || (isDosen && meAsLecturer?.id === pid);
                        const row = wf.nilai_detail?.[pid] || {};
                        const per = (() => {
                          let sum = 0, wsum = 0;
                          rule.komponen.forEach(k => { const v = Number(row[k.key]); if (!isNaN(v) && v > 0) { sum += v * (k.bobot / 100); wsum += k.bobot; } });
                          return wsum > 0 ? Math.round(sum * 100) / 100 : null;
                        })();
                        return (
                          <tr key={pid} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-800">{lecturerName(pid)}</td>
                            {rule.komponen.map(k => (
                              <td key={k.key} className="px-2 py-2 text-center">
                                <input type="number" min={0} max={100} className={nilaiInputClass} disabled={!editable} value={row[k.key] ?? ''} onChange={(e) => setWfDraft({ ...wf, nilai_detail: { ...wf.nilai_detail, [pid]: { ...row, [k.key]: e.target.value === '' ? undefined : Number(e.target.value) } } })} />
                              </td>
                            ))}
                            <td className="px-3 py-2 text-center font-bold text-slate-900">{per ?? '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {nilaiAkhir != null && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">Nilai Akhir Sidang</p>
                    <p className="text-3xl font-extrabold font-display text-cyan-300">{nilaiAkhir} <span className="text-lg text-slate-300">/ 100</span></p>
                  </div>
                  <p className="text-5xl font-extrabold font-display text-white">{nilaiHuruf}</p>
                </div>
              )}
              {isAdmin && (
                <Button className="mt-4 w-full" disabled={saving || nilaiAkhir == null || !wf.sidang_penguji?.length} onClick={saveSidang}>
                  <GraduationCap className="w-4 h-4 mr-2" /> Simpan Nilai & Terbitkan Berita Acara
                </Button>
              )}
              {wf.nilai_huruf === 'E' && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Mahasiswa MENGULANG Sidang (nilai {wf.nilai_akhir})</p>
                  {isAdmin && <Button variant="secondary" className="mt-2" onClick={() => persist({ status: 'berjalan', nilai_akhir: null, nilai_huruf: null, nilai_detail: {}, stage: 8 })}>Jadwalkan Ulang Sidang</Button>}
                </div>
              )}
              {wf.nilai_akhir != null && wf.nilai_huruf !== 'E' && <p className="mt-4 text-sm text-green-700 font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> LULUS sidang — lanjut repositori</p>}
              {wf.nilai_akhir != null && (
                <button onClick={() => window.print()} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 rounded-lg px-3 py-1.5 bg-white"><Printer className="w-4 h-4" /> Cetak Berita Acara Sidang</button>
              )}
            </div>
          )}

          {activeStage === 9 && (
            <div>
              <StageHeader num={9} title="Revisi Akhir & Repositori" desc="Validasi revisi, unggah naskah final + lampiran, cetak lembar pengesahan, arsip digital." />
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
                  <p className="text-[11px] text-emerald-700 mt-3">Status: Selesai / Lulus</p>
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

      {/* ===== Dokumen cetak (hanya tampil saat window.print) ===== */}
      {wf.judul_final && (
        <div className="print-area hidden print:block text-sm">
          <div className="border-b-4 border-double border-slate-800 pb-3 mb-6 text-center">
            <p className="text-lg font-extrabold font-display tracking-wide">UNIVERSITAS KLABAT</p>
            <p className="text-xs uppercase tracking-widest text-slate-600">Fakultas {wf.fakultas} · Sistem Manajemen Skripsi</p>
          </div>
          <h2 className="text-center text-xl font-extrabold uppercase font-display mb-6">Surat Keputusan Penetapan Judul dan Pembimbing</h2>
          <table className="w-full mb-4"><tbody>
            <tr><td className="py-1 w-44 font-semibold">Nama</td><td>: {student?.nama} ({student?.nim})</td></tr>
            <tr><td className="py-1 font-semibold">Fakultas</td><td>: {wf.fakultas}</td></tr>
            <tr><td className="py-1 font-semibold align-top">Judul Skripsi</td><td>: {wf.judul_final}</td></tr>
            <tr><td className="py-1 font-semibold align-top">Pembimbing I</td><td>: {lecturerName(wf.pembimbing_1_id)}</td></tr>
            <tr><td className="py-1 font-semibold align-top">Pembimbing II</td><td>: {lecturerName(wf.pembimbing_2_id)}</td></tr>
            <tr><td className="py-1 font-semibold">Tanggal SK</td><td>: {wf.sk_tanggal || '-'}</td></tr>
          </tbody></table>
          <table className="mt-12 w-full"><tbody><tr><td className="w-1/2"></td><td>Manado, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}<br />Kaprodi / Koord. Skripsi<br /><br /><br /><br />( ____________________ )</td></tr></tbody></table>
        </div>
      )}

      {wf.sempro_nilai != null && (
        <div className="print-area hidden print:block text-sm">
          <div className="border-b-4 border-double border-slate-800 pb-3 mb-6 text-center">
            <p className="text-lg font-extrabold font-display tracking-wide">UNIVERSITAS KLABAT</p>
            <p className="text-xs uppercase tracking-widest text-slate-600">Fakultas {wf.fakultas} · Sistem Manajemen Skripsi</p>
          </div>
          <h2 className="text-center text-xl font-extrabold uppercase font-display mb-6">Berita Acara Seminar Proposal</h2>
          <table className="w-full mb-4"><tbody>
            <tr><td className="py-1 w-44 font-semibold">Nama</td><td>: {student?.nama} ({student?.nim})</td></tr>
            <tr><td className="py-1 font-semibold align-top">Judul Skripsi</td><td>: {wf.judul_final}</td></tr>
            <tr><td className="py-1 font-semibold">Tanggal Sempro</td><td>: {wf.sempro_tanggal || '-'}</td></tr>
          </tbody></table>
          <p className="font-semibold mb-1">Nilai per Penguji:</p>
          <table className="w-full border border-slate-400 mb-4"><thead><tr className="bg-slate-100"><th className="border px-2 py-1 text-left">Penguji</th><th className="border px-2 py-1">Nilai</th></tr></thead><tbody>
            {(wf.sempro_penguji || []).map(pid => <tr key={pid}><td className="border px-2 py-1">{lecturerName(pid)}</td><td className="border px-2 py-1 text-center">{wf.sempro_detail?.[pid] ?? '-'}</td></tr>)}
            <tr><td className="border px-2 py-1 font-bold">Rata-rata</td><td className="border px-2 py-1 text-center font-bold">{wf.sempro_nilai}</td></tr>
          </tbody></table>
          <p><strong>Catatan</strong> : {wf.sempro_catatan || '-'}</p>
          <p className="mt-1"><strong>Hasil</strong> : {wf.sempro_nilai >= 60 ? 'LULUS' : 'MENGULANG'}</p>
          <table className="mt-10 w-full"><tbody><tr><td className="w-1/2"></td><td>Manado, {new Date().toLocaleDateString('id-ID')}<br />Penguji + Kaprodi<br /><br /><br /><br />( ____________________ )</td></tr></tbody></table>
        </div>
      )}

      {wf.kartu_peserta_issued && (
        <div className="print-area hidden print:block text-sm">
          <div className="border-b-4 border-double border-slate-800 pb-3 mb-6 text-center">
            <p className="text-lg font-extrabold font-display tracking-wide">UNIVERSITAS KLABAT</p>
            <p className="text-xs uppercase tracking-widest text-slate-600">Fakultas {wf.fakultas} · Sistem Manajemen Skripsi</p>
          </div>
          <h2 className="text-center text-xl font-extrabold uppercase font-display mb-6">Kartu Peserta Ujian Skripsi</h2>
          <table className="w-full mb-6"><tbody>
            <tr><td className="py-1 w-44 font-semibold">Nama</td><td>: {student?.nama} ({student?.nim})</td></tr>
            <tr><td className="py-1 font-semibold align-top">Judul Skripsi</td><td>: {wf.judul_final}</td></tr>
            <tr><td className="py-1 font-semibold">Fakultas</td><td>: {wf.fakultas}</td></tr>
            <tr><td className="py-1 font-semibold">Jumlah Penguji</td><td>: {rule.jumlah_penguji ?? 2} orang</td></tr>
            <tr><td className="py-1 font-semibold">Sifat</td><td>: Sidang Skripsi (Defense)</td></tr>
          </tbody></table>
          <div className="flex justify-center mt-8"><div className="w-40 h-40 border-4 border-double border-slate-800 flex flex-col items-center justify-center text-center"><p className="text-[10px] font-bold tracking-widest">UNIVERSITAS KLABAT</p><p className="text-lg font-extrabold font-display my-1">SKRIPSI</p><p className="text-[10px]">KARTU PESERTA UJIAN</p></div></div>
        </div>
      )}

      {wf.nilai_akhir != null && (
        <div className="print-area hidden print:block text-sm">
          <div className="border-b-4 border-double border-slate-800 pb-3 mb-6 text-center">
            <p className="text-lg font-extrabold font-display tracking-wide">UNIVERSITAS KLABAT</p>
            <p className="text-xs uppercase tracking-widest text-slate-600">Fakultas {wf.fakultas} · Sistem Manajemen Skripsi</p>
          </div>
          <h2 className="text-center text-xl font-extrabold uppercase font-display mb-6">Berita Acara Sidang Skripsi</h2>
          <table className="w-full mb-4"><tbody>
            <tr><td className="py-1 w-44 font-semibold">Nama</td><td>: {student?.nama} ({student?.nim})</td></tr>
            <tr><td className="py-1 font-semibold align-top">Judul Skripsi</td><td>: {wf.judul_final}</td></tr>
          </tbody></table>
          <p className="font-semibold mb-1">Nilai per Penguji × Komponen:</p>
          <table className="w-full border border-slate-400 text-xs mb-4"><thead><tr className="bg-slate-100"><th className="border px-2 py-1 text-left">Penguji</th>{(rule.komponen || []).map(k => <th key={k.key} className="border px-2 py-1">{k.label} ({k.bobot}%)</th>)}<th className="border px-2 py-1">Total</th></tr></thead><tbody>
            {(wf.sidang_penguji || []).map(pid => {
              const row = wf.nilai_detail?.[pid] || {};
              let sum = 0, wsum = 0;
              (rule.komponen || []).forEach(k => { const v = Number(row[k.key]); if (!isNaN(v) && v > 0) { sum += v * (k.bobot / 100); wsum += k.bobot; } });
              const per = wsum > 0 ? Math.round(sum * 100) / 100 : '-';
              return <tr key={pid}><td className="border px-2 py-1">{lecturerName(pid)}</td>{(rule.komponen || []).map(k => <td key={k.key} className="border px-2 py-1 text-center">{row[k.key] ?? '-'}</td>)}<td className="border px-2 py-1 text-center font-bold">{per}</td></tr>;
            })}
          </tbody></table>
          <p className="text-lg"><strong>Nilai Akhir</strong> : {wf.nilai_akhir} &nbsp;·&nbsp; <strong>Huruf Mutu</strong> : {wf.nilai_huruf}</p>
          <p className="mt-1"><strong>Hasil</strong> : {wf.nilai_huruf !== 'E' ? 'LULUS' : 'MENGULANG'}</p>
          <table className="mt-10 w-full"><tbody><tr><td className="w-1/2"></td><td>Manado, {new Date().toLocaleDateString('id-ID')}<br />Dewan Penguji + Kaprodi<br /><br /><br /><br />( ____________________ )</td></tr></tbody></table>
        </div>
      )}

      {/* Modal edge */}
      <Modal isOpen={edgeModal === 'gantiJudul'} onClose={() => setEdgeModal(null)} title="Ganti Judul / Pembimbing">
        <p className="text-sm text-gray-600 mb-3">Jika judul berubah total, status kembali ke review Kaprodi.</p>
        <Input label="Alasan Perubahan (wajib)" value={edgeReason} onChange={(e) => setEdgeReason(e.target.value)} placeholder="Contoh: judul tidak lagi relevan..." />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setEdgeModal(null)}>Batal</Button>
          <Button onClick={handleGantiJudul} disabled={!edgeReason.trim()}>Reset ke Tahap Review Judul</Button>
        </div>
      </Modal>
      <Modal isOpen={edgeModal === 'carryOver'} onClose={() => setEdgeModal(null)} title="Perpanjangan Semester (Carry Over)">
        <Input label="Semester Baru" value={semesterBaru} onChange={(e) => setSemesterBaru(e.target.value)} placeholder="2026/2027 Genap" />
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
