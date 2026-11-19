import { useState, useEffect } from 'react';
import {
  getWorkflows, getTheses, getStudents, getConsultations, getFacultyRules, updateWorkflow,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import { GraduationCap, CheckCircle2, AlertTriangle } from 'lucide-react';

const STAGE_LABEL = {
  1: 'Verifikasi Prasyarat',
  2: 'Pengajuan & Seleksi Judul',
  3: 'Bimbingan Proposal (Bab 1–3)',
  4: 'Seminar Proposal (Sempro)',
  5: 'Penelitian & Syarat Khusus',
  6: 'Bimbingan Akhir & Turnitin',
  7: 'Verifikasi Yudisium',
  8: 'Sidang Skripsi',
  9: 'Revisi Akhir & Repositori',
};

const BimbinganSaya = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [theses, setTheses] = useState([]);
  const [students, setStudents] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [rWf, rTh, rSt, rC, rR] = await Promise.all([
        getWorkflows(), getTheses(), getStudents(), getConsultations(), getFacultyRules(),
      ]);
      const norm = (r) => r.data?.data || r.data || [];
      setWorkflows(norm(rWf));
      setTheses(norm(rTh));
      setStudents(norm(rSt));
      setConsultations(norm(rC));
      setRules(norm(rR));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // Untuk demo: dosen_a = lecturer id 1, dosen_b = lecturer id 2
  const myLecturerId = user.username === 'dosen_a' ? 1 : 2;

  const mine = workflows.filter(w =>
    String(w.pembimbing_1_id) === String(myLecturerId) || String(w.pembimbing_2_id) === String(myLecturerId)
  );

  const history = mine.filter(w => !!w.bimbingan_proposal_acc || !!w.acc_sidang);

  const thesisOf = (id) => theses.find(t => t.id === id);
  const studentOf = (id) => students.find(s => s.id === id);
  const ruleOf = (fakultas) => rules.find(r => r.fakultas === fakultas) || {};

  const countConsultations = (thesisId) => consultations.filter(c => String(c.thesis_id) === String(thesisId)).length;

  const handleAccProposal = async (w) => {
    setLoading(true);
    try {
      await updateWorkflow(w.id, { ...w, bimbingan_proposal_acc: true, stage: 4 });
      setMessage({ type: 'success', text: 'ACC Bimbingan Proposal berhasil.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal memberikan ACC.' });
    } finally { setLoading(false); }
  };

  const handleAccSidang = async (w) => {
    setLoading(true);
    try {
      await updateWorkflow(w.id, { ...w, acc_sidang: true, stage: 7 });
      setMessage({ type: 'success', text: 'ACC Sidang Akhir berhasil.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal memberikan ACC.' });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-glow">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Bimbingan Saya</h1>
          <p className="text-gray-600">Skripsi yang Anda bimbing — lakukan ACC di sini (tanpa membuka Alur Skripsi)</p>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>{message.text}</div>
      )}

      {mine.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-10 text-center">
          <p className="text-slate-500">Belum ada skripsi yang Anda bimbing.</p>
        </div>
      ) : (
        mine.map(w => {
          const thesis = thesisOf(w.thesis_id);
          const student = studentOf(thesis?.student_id);
          const rule = ruleOf(w.fakultas || 'FILKOM');
          const logbook = countConsultations(w.thesis_id);
          const minB = rule.min_bimbingan ?? 8;
          const canAccProposal = w.bimbingan_proposal_acc !== true && logbook >= minB;
          const canAccSidang = w.turnitin_score != null && w.turnitin_score <= (rule.max_turnitin_percentage ?? 20) && w.acc_sidang !== true;
          const stage = w.stage ?? 3;
          return (
            <div key={w.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Mahasiswa</p>
                  <p className="font-display font-bold text-slate-900">{student?.nama} <span className="text-slate-400 text-sm">({student?.nim})</span></p>
                  <p className="text-sm text-slate-700 mt-1">{thesis?.judul}</p>
                  <p className="text-xs text-slate-500 mt-1">Fakultas: {w.fakultas || 'FILKOM'} · Tahap {stage} — {STAGE_LABEL[stage] || '—'}</p>
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  {stage >= 3 && stage < 4 && (
                    <div className="text-right">
                      <p className="text-xs text-blue-700 font-semibold">Logbook {logbook}/{minB}</p>
                      <Button disabled={!canAccProposal || loading} variant="primary" className="mt-2" onClick={() => handleAccProposal(w)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> ACC Bimbingan Proposal
                      </Button>
                    </div>
                  )}
                  {stage >= 6 && stage < 7 && (
                    <div className="text-right">
                      <p className="text-xs text-emerald-700 font-semibold">Turnitin {w.turnitin_score ?? '—'}% (maks {rule.max_turnitin_percentage ?? 20}%)</p>
                      <Button disabled={!canAccSidang || loading} variant="success" className="mt-2" onClick={() => handleAccSidang(w)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> ACC Sidang Akhir
                      </Button>
                    </div>
                  )}
                  {stage >= 4 && stage < 6 && (
                    <p className="text-xs text-slate-500">Menunggu tahap selanjutnya.</p>
                  )}
                  {stage >= 7 && (
                    <p className="text-xs text-green-700 font-semibold">Verifikasi Yudisium/Sidang diatur oleh TU.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Riwayat Persetujuan Saya */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
          <h3 className="font-bold font-display text-slate-900 mb-3">Riwayat Persetujuan Saya</h3>
          <div className="divide-y divide-slate-100">
            {history.map(w => {
              const thesis = thesisOf(w.thesis_id);
              const student = studentOf(thesis?.student_id);
              const actions = [];
              if (w.bimbingan_proposal_acc) actions.push('ACC Bimbingan Proposal');
              if (w.acc_sidang) actions.push('ACC Sidang Akhir');
              return (
                <div key={w.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{student?.nama || 'Mahasiswa'}</p>
                    <p className="text-xs text-slate-500">{thesis?.judul}</p>
                  </div>
                  <div className="text-xs text-slate-600 flex flex-wrap gap-2">
                    {actions.map(a => (
                      <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> {a}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BimbinganSaya;
