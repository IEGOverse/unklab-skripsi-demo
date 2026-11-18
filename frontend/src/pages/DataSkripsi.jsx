import { useState, useEffect } from 'react';
import {
  getTheses, createThesis, updateThesis, deleteThesis,
  getStudents,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import { Plus, Search, Check, X, ShieldCheck } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'diajukan', label: 'Diajukan' },
  { value: 'disetujui_dosen', label: 'Disetujui Dosen' },
  { value: 'disetujui', label: 'Disetujui (Final)' },
  { value: 'ditolak', label: 'Ditolak' },
];

const STATUS_STYLE = {
  draft: 'bg-gray-100 text-gray-700',
  diajukan: 'bg-blue-100 text-blue-800',
  disetujui_dosen: 'bg-amber-100 text-amber-800',
  disetujui: 'bg-green-100 text-green-800',
  ditolak: 'bg-red-100 text-red-800',
};

const DataSkripsi = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isDosen = user?.role === 'dosen';
  const isMahasiswa = user?.role === 'mahasiswa';

  const [data, setData] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ student_id: '', judul: '', abstrak: '', status: 'diajukan' });
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([getTheses(), getStudents()]);
      setData(r1.data?.data || r1.data || []);
      setStudents(r2.data?.data || r2.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const studentName = (id) => {
    const s = students.find(x => String(x.id) === String(id));
    return s ? s.nama : id;
  };
  const me = isMahasiswa ? students.find(s => String(s.user_id) === String(user.id)) : null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        student_id: Number(form.student_id),
        judul: form.judul,
        abstrak: form.abstrak,
        status: isMahasiswa ? 'diajukan' : form.status,
      };
      if (editMode) {
        const original = data.find(x => x.id === selectedId);
        await updateThesis(selectedId, { ...original, ...payload });
      } else {
        await createThesis({ ...payload, created_at: new Date().toISOString() });
      }
      setOpen(false);
      resetForm();
      load();
    } catch (e) {
      alert('Gagal menyimpan: ' + (e.response?.data?.message || e.message));
    } finally { setLoading(false); }
  };

  const handleEdit = (row) => {
    setEditMode(true);
    setSelectedId(row.id);
    setForm({ student_id: row.student_id, judul: row.judul, abstrak: row.abstrak || '', status: row.status });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus data ini?')) return;
    try {
      await deleteThesis(id);
      load();
    } catch (e) { alert('Gagal menghapus'); }
  };

  const transition = async (row, newStatus) => {
    setLoading(true);
    try {
      await updateThesis(row.id, { ...row, status: newStatus });
      load();
    } catch (e) {
      alert('Gagal mengubah status: ' + (e.response?.data?.message || e.message));
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setEditMode(false);
    setSelectedId(null);
    setForm({ student_id: me ? me.id : '', judul: '', abstrak: '', status: 'diajukan' });
  };

  // Mahasiswa hanya melihat skripsinya sendiri
  const visibleData = isMahasiswa && me
    ? data.filter(d => String(d.student_id) === String(me.id))
    : data;

  const filtered = visibleData.filter(d =>
    (d.judul || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.status || '').toLowerCase().includes(search.toLowerCase()) ||
    studentName(d.student_id).toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { label: 'Mahasiswa', key: 'student_id', render: (r) => studentName(r.student_id) },
    { label: 'Judul', key: 'judul' },
    { label: 'Status', key: 'status', render: (r) => (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-700'}`}>
        {STATUS_OPTIONS.find(o => o.value === r.status)?.label || r.status}
      </span>
    )},
    { label: 'Aksi', key: 'id', render: (r) => (
      <div className="flex flex-wrap gap-2 whitespace-nowrap">
        {/* Mahasiswa: hanya Edit saat masih 'diajukan'; tidak bisa hapus */}
        {isMahasiswa && r.status === 'diajukan' && (
          <button onClick={() => handleEdit(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
        )}
        {/* Dosen: hanya Terima/Tolak saat 'diajukan' */}
        {isDosen && r.status === 'diajukan' && (
          <>
            <button onClick={() => transition(r, 'disetujui_dosen')} className="inline-flex items-center gap-1 text-emerald-700 hover:underline text-xs font-semibold"><Check className="w-3 h-3" /> Terima</button>
            <button onClick={() => transition(r, 'ditolak')} className="inline-flex items-center gap-1 text-red-600 hover:underline text-xs font-semibold"><X className="w-3 h-3" /> Tolak</button>
          </>
        )}
        {/* Admin: setujui final saat dosen sudah setuju; edit/hapus penuh */}
        {isAdmin && r.status === 'disetujui_dosen' && (
          <button onClick={() => transition(r, 'disetujui')} className="inline-flex items-center gap-1 text-green-700 hover:underline text-xs font-semibold"><ShieldCheck className="w-3 h-3" /> Setujui (Final)</button>
        )}
        {isAdmin && (
          <>
            <button onClick={() => handleEdit(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
            <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline text-xs">Hapus</button>
          </>
        )}
        {!isAdmin && !isDosen && r.status !== 'diajukan' && (
          <span className="text-xs text-gray-400">Menunggu review</span>
        )}
      </div>
    )},
  ];

  const studentOptions = isMahasiswa
    ? (me ? [{ value: me.id, label: `${me.nim} - ${me.nama}` }] : [])
    : students.map(s => ({ value: s.id, label: `${s.nim} - ${s.nama}` }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">{isMahasiswa ? 'Skripsi Saya' : 'Data Skripsi'}</h1>
          <p className="text-gray-600">{isMahasiswa ? 'Ajukan skripsi Anda — dosen menerima, admin menyetujui final' : 'Alur: Mahasiswa mengajukan → Dosen menerima/menolak → Admin menyetujui final'}</p>
        </div>
        {!(isDosen) && (
          <Button onClick={() => { resetForm(); setOpen(true); }} variant="primary">
            <Plus className="w-4 h-4 mr-2" /> {isMahasiswa ? 'Ajukan Skripsi' : 'Tambah Skripsi'}
          </Button>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <Search className="w-5 h-5 text-gray-400" />
        <Input placeholder="Cari judul, mahasiswa, atau status..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-0" />
      </div>

      <Table columns={columns} data={filtered} loading={loading} emptyMessage="Tidak ada data skripsi" />

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editMode ? 'Edit Skripsi' : (isMahasiswa ? 'Ajukan Skripsi' : 'Tambah Skripsi')}>
        <form onSubmit={handleSave} className="space-y-4">
          {!isMahasiswa ? (
            <Select label="Mahasiswa" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} options={studentOptions} required />
          ) : (
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Mahasiswa</label>
              <div className="px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 text-sm">{me ? `${me.nim} - ${me.nama}` : 'Data mahasiswa Anda belum terhubung'}</div>
            </div>
          )}
          <Input label="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required />
          <Input label="Abstrak" value={form.abstrak} onChange={(e) => setForm({ ...form, abstrak: e.target.value })} required />
          {isAdmin ? (
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUS_OPTIONS} required />
          ) : (
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Status</label>
              <div className="px-3.5 py-2.5 border border-blue-200 rounded-xl bg-blue-50 text-blue-800 text-sm font-semibold">Diajukan (menunggu review dosen)</div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{editMode ? 'Update' : 'Ajukan'}</Button>
          </div>
        </form>
      </Modal>

      <div className="text-xs text-gray-500 mt-2">
        Catatan: Data ini adalah data uji (dummy), bukan data resmi UNKLAB. Alur: mahasiswa mengajukan → dosen menerima/menolak → admin menyetujui final.
      </div>
    </div>
  );
};

export default DataSkripsi;
