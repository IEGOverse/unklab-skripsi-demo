import { useState, useEffect, useMemo } from 'react';
import {
  getDefenseRequests, updateDefenseRequest, getTheses, getStudents, getLecturers,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import { Inbox, Eye, Check, X, Clock } from 'lucide-react';

const TABS = [
  { key: 'pending', label: 'Menunggu Keputusan' },
  { key: 'diterima_dosen', label: 'Diterima' },
  { key: 'ditolak_dosen', label: 'Ditolak' },
  { key: 'all', label: 'Semua' },
];

const STATUS_LABEL = {
  pending: 'Menunggu',
  diterima_dosen: 'Diterima',
  ditolak_dosen: 'Ditolak',
  disetujui: 'Disetujui (Admin)',
};

const PersetujuanJadwal = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [theses, setTheses] = useState([]);
  const [students, setStudents] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [tab, setTab] = useState('pending');
  const [detail, setDetail] = useState(null);
  const [alasan, setAlasan] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [rReq, rTh, rSt, rLec] = await Promise.all([
        getDefenseRequests(), getTheses(), getStudents(), getLecturers(),
      ]);
      const norm = (r) => r.data?.data || r.data || [];
      setRequests(norm(rReq));
      setTheses(norm(rTh));
      setStudents(norm(rSt));
      setLecturers(norm(rLec));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const thesisOf = (id) => {
    const t = theses.find(x => String(x.id) === String(id));
    return t ? t : null;
  };
  const studentOf = (id) => {
    const s = students.find(x => String(x.id) === String(id));
    return s ? `${s.nim} - ${s.nama}` : id;
  };
  const lecturerName = (id) => {
    const l = lecturers.find(x => String(x.id) === String(id));
    return l ? l.nama : '-';
  };

  const filtered = useMemo(() => {
    if (tab === 'all') return requests;
    return requests.filter(r => r.status === tab);
  }, [requests, tab]);

  const decide = async (row, newStatus) => {
    if (newStatus === 'ditolak_dosen' && !alasan.trim()) {
      setMessage({ type: 'error', text: 'Alasan penolakan wajib diisi.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await updateDefenseRequest(row.id, { ...row, status: newStatus, alasan_dosen: newStatus === 'ditolak_dosen' ? alasan.trim() : null });
      setDetail(null);
      setAlasan('');
      setMessage({ type: 'success', text: newStatus === 'diterima_dosen' ? 'Pengajuan diterima — admin akan menjadwalkan.' : 'Pengajuan ditolak.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan keputusan: ' + (e.response?.data?.message || e.message) });
    } finally { setLoading(false); }
  };

  const columns = [
    { label: 'Mahasiswa', key: 'student_id', render: (r) => studentOf(r.student_id) },
    { label: 'Skripsi', key: 'thesis_id', render: (r) => {
      const t = thesisOf(r.thesis_id);
      return <span className="block max-w-[240px] truncate" title={t?.judul}>{t?.judul || r.thesis_id}</span>;
    } },
    { label: 'Usulan', key: 'tanggal_diusulkan', render: (r) => (
      <div className="text-sm"><div>{r.tanggal_diusulkan || '-'}</div><div className="text-xs text-gray-500">{r.waktu_diusulkan || ''}</div></div>
    )},
    { label: 'Status', key: 'status', render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
        r.status === 'diterima_dosen' ? 'bg-green-100 text-green-800' :
        r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
        r.status === 'ditolak_dosen' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
      }`}>{STATUS_LABEL[r.status] || r.status}</span>
    )},
    { label: 'Aksi', key: 'id', render: (r) => (
      <button onClick={() => { setDetail(r); setAlasan(''); setMessage(null); }} className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"><Eye className="w-4 h-4" /> Detail & Keputusan</button>
    )},
  ];

  const thesis = detail ? thesisOf(detail.thesis_id) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-glow">
          <Inbox className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Persetujuan Jadwal</h1>
          <p className="text-gray-600">Tinjau pengajuan defense dari mahasiswa — periksa detail, lalu terima atau tolak.</p>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>{message.text}</div>
      )}

      {/* Tab filter */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {t.label}
            {t.key !== 'all' && <span className="ml-2 text-xs opacity-70">({requests.filter(r => t.key === 'all' || r.status === t.key).length})</span>}
          </button>
        ))}
      </div>

      <Table columns={columns} data={filtered} loading={loading} emptyMessage="Tidak ada pengajuan pada kategori ini" />

      {/* Modal detail & keputusan */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Detail Pengajuan Defense">
        {detail && thesis && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Mahasiswa</p>
                <p className="font-semibold text-slate-900">{studentOf(detail.student_id)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Dosen Rekomendasi</p>
                <p className="font-semibold text-slate-900">{lecturerName(detail.dosen_rekomendasi_id)}</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Judul Skripsi</p>
              <p className="font-semibold text-slate-900">{thesis.judul}</p>
              <p className="text-xs text-slate-500 mt-1">{thesis.abstrak}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold">Topik (AI)</p>
                <p className="font-semibold text-blue-900">{detail.topik_ai}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">Bidang (AI)</p>
                <p className="font-semibold text-emerald-900">{detail.bidang_ai}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-[10px] uppercase tracking-widest text-amber-700 font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> Usulan</p>
                <p className="font-semibold text-amber-900">{detail.tanggal_diusulkan || '-'} · {detail.waktu_diusulkan || '-'}</p>
              </div>
            </div>
            {detail.catatan_mahasiswa && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Catatan Mahasiswa</p>
                <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">{detail.catatan_mahasiswa}</p>
              </div>
            )}
            {detail.status !== 'pending' && (
              <div className={`p-3 rounded-xl border text-sm ${detail.status === 'diterima_dosen' ? 'bg-green-50 border-green-200 text-green-800' : detail.status === 'ditolak_dosen' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                <p className="font-semibold">Keputusan: {STATUS_LABEL[detail.status] || detail.status}</p>
                {detail.alasan_dosen && <p className="mt-1 text-xs">Alasan: {detail.alasan_dosen}</p>}
              </div>
            )}
            {detail.status === 'pending' && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Alasan (wajib jika menolak)</label>
                  <textarea
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    rows={2}
                    placeholder="Berikan alasan jika menolak..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="secondary" onClick={() => setDetail(null)}>Tutup</Button>
                  <Button variant="danger" onClick={() => decide(detail, 'ditolak_dosen')} disabled={loading}><X className="w-4 h-4 mr-1" /> Tolak</Button>
                  <Button variant="success" onClick={() => decide(detail, 'diterima_dosen')} disabled={loading}><Check className="w-4 h-4 mr-1" /> Terima</Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <div className="text-xs text-gray-500">
        Catatan: Data ini adalah data uji (dummy), bukan data resmi UNKLAB. Setelah Anda menerima, admin akan menetapkan jadwal sidang (tanggal, waktu, ruangan, penguji).
      </div>
    </div>
  );
};

export default PersetujuanJadwal;
