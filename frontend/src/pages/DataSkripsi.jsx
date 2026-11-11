import { useState, useEffect } from 'react';
import {
  getTheses, createThesis, updateThesis, deleteThesis,
  getStudents,
} from '../api/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import { Plus, Search } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'diajukan', label: 'Diajukan' },
  { value: 'disetujui', label: 'Disetujui' },
  { value: 'ditolak', label: 'Ditolak' },
];

const DataSkripsi = () => {
  const [data, setData] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ student_id: '', judul: '', abstrak: '', status: 'draft' });
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

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        student_id: Number(form.student_id),
        judul: form.judul,
        abstrak: form.abstrak,
        status: form.status,
      };
      if (editMode) {
        await updateThesis(selectedId, payload);
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

  const resetForm = () => {
    setEditMode(false);
    setSelectedId(null);
    setForm({ student_id: '', judul: '', abstrak: '', status: 'draft' });
  };

  const filtered = data.filter(d =>
    (d.judul || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.status || '').toLowerCase().includes(search.toLowerCase()) ||
    studentName(d.student_id).toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { label: 'Mahasiswa', key: 'student_id', render: (r) => studentName(r.student_id) },
    { label: 'Judul', key: 'judul' },
    { label: 'Status', key: 'status', render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        r.status === 'disetujui' ? 'bg-green-100 text-green-800' :
        r.status === 'diajukan' ? 'bg-blue-100 text-blue-800' :
        r.status === 'ditolak' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
      }`}>{r.status}</span>
    )},
    { label: 'Aksi', key: 'id', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => handleEdit(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
        <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline text-xs">Hapus</button>
      </div>
    )},
  ];

  const studentOptions = students.map(s => ({ value: s.id, label: `${s.npm} - ${s.nama}` }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Data Skripsi</h1>
          <p className="text-gray-600">Kelola data skripsi</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }} variant="primary">
          <Plus className="w-4 h-4 mr-2" /> Tambah Skripsi
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <Search className="w-5 h-5 text-gray-400" />
        <Input placeholder="Cari mahasiswa, judul, atau status..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-0" />
      </div>

      <Table columns={columns} data={filtered} loading={loading} emptyMessage="Tidak ada data skripsi" />

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editMode ? 'Edit Skripsi' : 'Tambah Skripsi'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Mahasiswa" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} options={studentOptions} required />
          <Input label="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required />
          <Input label="Abstrak" value={form.abstrak} onChange={(e) => setForm({ ...form, abstrak: e.target.value })} required />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUS_OPTIONS} required />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{editMode ? 'Update' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      <div className="text-xs text-gray-500 mt-2">
        Catatan: Data ini adalah data uji (dummy), bukan data resmi UNKLAB.
      </div>
    </div>
  );
};

export default DataSkripsi;
