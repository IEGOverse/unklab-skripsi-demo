import { useState, useEffect, useMemo } from 'react';
import {
  getDefenseSchedules, createDefenseSchedule, checkScheduleConflict,
  getDefenseRequests, createNotification, updateDefenseRequest,
  getLecturers, getTheses, getStudents,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import { Calendar, Check, Clock, AlertTriangle, Send, ShieldCheck } from 'lucide-react';

const TABS = [
  { key: 'perlu_dijadwal', label: 'Perlu Dijadwal', status: 'diterima_dosen' },
  { key: 'menunggu_dosen', label: 'Menunggu Dosen', status: 'menunggu_persetujuan_dosen' },
  { key: 'terjadwal', label: 'Terjadwal', status: 'disetujui' },
];

const STATUS_LABEL = {
  diterima_dosen: 'Diterima Dosen',
  menunggu_persetujuan_dosen: 'Diusulkan Admin (Menunggu Dosen)',
  disetujui: 'Dijadwalkan',
};

const PenjadwalanDefense = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState([]);
  const [requests, setRequests] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [theses, setTheses] = useState([]);
  const [students, setStudents] = useState([]);
  const [tab, setTab] = useState('perlu_dijadwal');
  const [loading, setLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [form, setForm] = useState({ tanggal: '', waktu: '', ruangan: '', dosen_penguji_1_id: '', dosen_penguji_2_id: '' });
  const [conflictInfo, setConflictInfo] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3, r4, r5] = await Promise.all([
        getDefenseSchedules(), getDefenseRequests(), getLecturers(), getTheses(), getStudents(),
      ]);
      const norm = (r) => r.data?.data || r.data || [];
      setData(norm(r1));
      setRequests(norm(r2));
      setLecturers(norm(r3));
      setTheses(norm(r4));
      setStudents(norm(r5));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const thesisOf = (id) => {
    const t = theses.find(x => String(x.id) === String(id));
    return t ? t : null;
  };
  const studentOf = (id) => {
    const s = students.find(x => String(x.id) === String(id));
    return s ? `${s.nim} - ${s.nama}` : '-';
  };
  const lecturerName = (id) => {
    const l = lecturers.find(x => String(x.id) === String(id));
    return l ? l.nama : (id || '-');
  };

  const tabRows = useMemo(() => {
    const target = TABS.find(t => t.key === tab)?.status;
    return requests.filter(r => r.status === target);
  }, [requests, tab]);

  const scheduleColumns = [
    { label: 'Judul Skripsi', key: 'defense_request_id', render: (r) => {
      const req = requests.find(x => String(x.id) === String(r.defense_request_id));
      return <span className="block max-w-[280px] truncate">{req ? thesisOf(req.thesis_id)?.judul : r.thesis_title}</span>;
    } },
    { label: 'Mahasiswa', key: 'defense_request_id', render: (r) => {
      const req = requests.find(x => String(x.id) === String(r.defense_request_id));
      return req ? studentOf(req.student_id) : (r.student_name || '-');
    } },
    { label: 'Tanggal', key: 'tanggal' },
    { label: 'Waktu', key: 'waktu' },
    { label: 'Ruangan', key: 'ruangan' },
    { label: 'Penguji 1', key: 'dosen_penguji_1_id', render: (r) => r.dosen_penguji_1_nama || lecturerName(r.dosen_penguji_1_id) },
    { label: 'Penguji 2', key: 'dosen_penguji_2_id', render: (r) => r.dosen_penguji_2_nama || lecturerName(r.dosen_penguji_2_id) },
  ];

  const pendingColumns = [
    { label: 'Mahasiswa', key: 'student_id', render: (r) => studentOf(r.student_id) },
    { label: 'Skripsi', key: 'thesis_id', render: (r) => <span className="block max-w-[240px] truncate">{thesisOf(r.thesis_id)?.judul || r.thesis_id}</span> },
    { label: 'Usulan Mhs', key: 'tanggal_diusulkan', render: (r) => (
      <div className="text-sm"><div>{r.tanggal_diusulkan || '-'}</div><div className="text-xs text-slate-500">{r.waktu_diusulkan || ''}</div></div>
    )},
    { label: 'Status', key: 'status', render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
        r.status === 'diterima_dosen' ? 'bg-green-100 text-green-800' :
        r.status === 'menunggu_persetujuan_dosen' ? 'bg-amber-100 text-amber-800' :
        'bg-blue-100 text-blue-800'
      }`}>{STATUS_LABEL[r.status] || r.status}</span>
    )},
    { label: 'Aksi', key: 'id', render: (r) => {
      if (r.status === 'diterima_dosen') {
        return <button onClick={() => openScheduleModal(r)} className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs font-semibold"><Calendar className="w-4 h-4" /> Atur Jadwal</button>;
      }
      if (r.status === 'disetujui') {
        return <span className="inline-flex items-center gap-1 text-green-700 text-xs font-semibold"><ShieldCheck className="w-4 h-4" /> Terjadwal</span>;
      }
      return <span className="text-xs text-amber-700">Menunggu dosen</span>;
    } },
  ];

  const openScheduleModal = (req) => {
    setSelectedRequest(req);
    setForm({ tanggal: req.tanggal_diusulkan || '', waktu: req.waktu_diusulkan || '', ruangan: '', dosen_penguji_1_id: '', dosen_penguji_2_id: '' });
    setConflictInfo(null);
    setMessage(null);
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setConflictInfo(null);
    setForm({ tanggal: '', waktu: '', ruangan: '', dosen_penguji_1_id: '', dosen_penguji_2_id: '' });
  };

  const saveDirectly = async () => {
    const conflict = await checkScheduleConflict({
      tanggal: form.tanggal,
      waktu: form.waktu,
      dosen_penguji_1_id: form.dosen_penguji_1_id,
      dosen_penguji_2_id: form.dosen_penguji_2_id,
      ruangan: form.ruangan,
    });
    if (conflict.data?.hasConflict) {
      setConflictInfo(conflict.data?.conflicts || []);
      return null;
    }
    const res = await createDefenseSchedule({
      defense_request_id: Number(selectedRequest.id),
      tanggal: form.tanggal,
      waktu: form.waktu,
      ruangan: form.ruangan,
      dosen_penguji_1_id: Number(form.dosen_penguji_1_id),
      dosen_penguji_2_id: Number(form.dosen_penguji_2_id),
    });
    return res.data;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.dosen_penguji_1_id || !form.dosen_penguji_2_id || form.dosen_penguji_1_id === form.dosen_penguji_2_id) {
      setMessage({ type: 'error', text: 'Dosen Penguji 1 dan Penguji 2 tidak boleh sama.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await saveDirectly();
      if (!result) {
        setLoading(false);
        return; // conflict panel shown
      }
      closeModal();
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal membuat jadwal: ' + (e.response?.data?.message || e.message) });
    } finally { setLoading(false); }
  };

  // Jalur konflik: admin tetap bisa menyimpan usulan, tapi menunggu persetujuan dosen
  const handleProposeToDosen = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await updateDefenseRequest(selectedRequest.id, {
        ...selectedRequest,
        status: 'menunggu_persetujuan_dosen',
        usulan_tanggal: form.tanggal,
        usulan_waktu: form.waktu,
        usulan_ruangan: form.ruangan,
        usulan_penguji_1_id: Number(form.dosen_penguji_1_id),
        usulan_penguji_2_id: Number(form.dosen_penguji_2_id),
      });
      await createNotification({
        recipient_role: 'dosen',
        sender: 'Admin',
        title: 'Usulan Jadwal Defense membutuhkan persetujuan Anda',
        body: `Admin mengusulkan jadwal untuk ${thesisOf(selectedRequest?.thesis_id)?.judul || 'skripsi'} — ${form.tanggal} ${form.waktu}, Ruangan ${form.ruangan} (slot semula bentrok). Mohon setujui atau tolak.`,
        type: 'defense_schedule_approval',
        request_id: selectedRequest?.id,
        read: false,
        created_at: new Date().toISOString(),
      });
      closeModal();
      setTab('menunggu_dosen');
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal mengirim usulan ke dosen: ' + (e.response?.data?.message || e.message) });
    } finally { setLoading(false); }
  };

  const lecturerOptions = lecturers.map(l => ({ value: l.id, label: l.nama }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Penjadwalan Defense</h1>
          <p className="text-gray-600">Kelola jadwal sidang defense — pengajuan diterima dosen muncul sebagai daftar di bawah</p>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>{message.text}</div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
            <span className="ml-2 text-xs opacity-80">({requests.filter(r => r.status === t.status).length})</span>
          </button>
        ))}
      </div>

      <Table
        columns={pendingColumns}
        data={tabRows}
        loading={loading}
        emptyMessage={tab === 'perlu_dijadwal' ? 'Tidak ada pengajuan yang menunggu dijadwalkan.' : tab === 'menunggu_dosen' ? 'Tidak ada usulan jadwal yang menunggu persetujuan dosen.' : 'Belum ada defense terjadwal.'}
      />

      {/* Jadwal defense yang sudah ada */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
        <h3 className="font-bold font-display text-slate-900 mb-4">Jadwal Defense (Riwayat)</h3>
        <Table columns={scheduleColumns} data={data} loading={loading} emptyMessage="Belum ada jadwal defense" />
      </div>

      {/* Modal atur jadwal */}
      <Modal isOpen={!!selectedRequest} onClose={closeModal} title="Atur Jadwal Defense">
        <form onSubmit={handleSave} className="space-y-4">
          {selectedRequest && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Pengajuan</p>
              <p className="font-semibold text-slate-900">{studentOf(selectedRequest.student_id)}</p>
              <p className="text-xs text-slate-500">{thesisOf(selectedRequest.thesis_id)?.judul}</p>
            </div>
          )}

          {conflictInfo && conflictInfo.length > 0 ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm">
              <p className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Jadwal bentrok</p>
              <ul className="mt-2 space-y-1 text-xs text-red-800">
                {conflictInfo.map((c, i) => (
                  <li key={i} className="p-2 bg-white rounded border border-red-100">
                    Jadwal {c.tanggal} {c.waktu} — Ruangan {c.ruangan} — Penguji {lecturerName(c.dosen_penguji_1_id)} / {lecturerName(c.dosen_penguji_2_id)}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-900 mt-2">Ganti slot/ruangan/penguji, atau kirim sebagai usulan — dosen yang memutuskan.</p>
            </div>
          ) : null}

          <Input label="Tanggal" type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
          <Input label="Waktu" type="time" value={form.waktu} onChange={(e) => setForm({ ...form, waktu: e.target.value })} required />
          <Input label="Ruangan" value={form.ruangan} onChange={(e) => setForm({ ...form, ruangan: e.target.value })} placeholder="Contoh: B2" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Dosen Penguji 1" value={form.dosen_penguji_1_id} onChange={(e) => setForm({ ...form, dosen_penguji_1_id: e.target.value })} options={lecturerOptions} required />
            <Select label="Dosen Penguji 2" value={form.dosen_penguji_2_id} onChange={(e) => setForm({ ...form, dosen_penguji_2_id: e.target.value })} options={lecturerOptions} required />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={closeModal}>Batal</Button>
            {conflictInfo ? (
              <Button type="button" onClick={handleProposeToDosen} disabled={loading} variant="primary">
                <Send className="w-4 h-4 mr-2" /> Kirim ke Dosen
              </Button>
            ) : (
              <Button type="submit" disabled={loading} variant="primary">
                <Check className="w-4 h-4 mr-2" /> Simpan Jadwal
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PenjadwalanDefense;
