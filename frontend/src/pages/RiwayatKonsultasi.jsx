import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getConsultations, createConsultation, updateConsultation, deleteConsultation,
  getStudents, getLecturers, getTheses,
} from '../api/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import { Plus, Search } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'terjadwal', label: 'Terjadwal' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'dibatalkan', label: 'Dibatalkan' },
];

const RiwayatKonsultasi = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [students, setStudents] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ student_id: '', lecturer_id: '', thesis_id: '', tanggal: '', topik: '', catatan: '', status: 'terjadwal' });
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        getConsultations(), getStudents(), getLecturers(), getTheses(),
      ]);
      const norm = (r) => r.data?.data || r.data || [];
      setData(norm(r1));
      setStudents(norm(r2));
      setLecturers(norm(r3));
      setTheses(norm(r4));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const nameOf = (list, id) => {
    const x = list.find(i => String(i.id) === String(id));
    return x ? x.nama : id;
  };
  const thesisOf = (id) => {
    const t = theses.find(i => String(i.id) === String(id));
    return t ? t.judul : id;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        student_id: Number(form.student_id),
        lecturer_id: Number(form.lecturer_id),
        thesis_id: Number(form.thesis_id),
        tanggal: form.tanggal,
        topik: form.topik,
        catatan: form.catatan,
        status: form.status,
      };
      if (editMode) {
        await updateConsultation(selectedId, payload);
      } else {
        await createConsultation({ ...payload, created_at: new Date().toISOString() });
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
    setForm({
      student_id: row.student_id,
      lecturer_id: row.lecturer_id,
      thesis_id: row.thesis_id,
      tanggal: row.tanggal,
      topik: row.topik,
      catatan: row.catatan || '',
      status: row.status || 'terjadwal',
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus data konsultasi ini?')) return;
    try {
      await deleteConsultation(id);
      load();
    } catch (e) { alert('Gagal menghapus'); }
  };

  const resetForm = () => {
    setEditMode(false);
    setSelectedId(null);
    setForm({ student_id: '', lecturer_id: '', thesis_id: '', tanggal: '', topik: '', catatan: '', status: 'terjadwal' });
  };

  const filtered = data.filter(d => {
    if (statusFilter && d.status !== statusFilter) return false;
    const hay = [
      nameOf(students, d.student_id),
      nameOf(lecturers, d.lecturer_id),
      thesisOf(d.thesis_id),
      d.topik,
    ].join(' ').toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  const columns = [
    { label: 'Mahasiswa', key: 'student_id', render: (r) => nameOf(students, r.student_id) },
    { label: 'Dosen', key: 'lecturer_id', render: (r) => nameOf(lecturers, r.lecturer_id) },
    { label: 'Skripsi', key: 'thesis_id', render: (r) => (
      <span className="block max-w-[220px] truncate" title={thesisOf(r.thesis_id)}>{thesisOf(r.thesis_id)}</span>
    )},
    { label: 'Tanggal', key: 'tanggal' },
    { label: 'Topik', key: 'topik', render: (r) => (
      <span className="block max-w-[200px] truncate" title={r.topik}>{r.topik}</span>
    )},
    { label: 'Status', key: 'status', render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        r.status === 'selesai' ? 'bg-green-100 text-green-800' :
        r.status === 'terjadwal' ? 'bg-blue-100 text-blue-800' :
        r.status === 'dibatalkan' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
      }`}>{r.status}</span>
    )},
    { label: 'Aksi', key: 'id', render: (r) => (
      <div className="flex gap-2 whitespace-nowrap">
        <button onClick={() => navigate(`/konsultasi/${r.id}`)} className="text-green-700 hover:underline text-xs">Detail</button>
        <button onClick={() => handleEdit(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
        <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline text-xs">Hapus</button>
      </div>
    )},
  ];

  const studentOptions = students.map(s => ({ value: s.id, label: `${s.npm} - ${s.nama}` }));
  const lecturerOptions = lecturers.map(l => ({ value: l.id, label: l.nama }));
  const thesisOptions = theses.map(t => ({ value: t.id, label: t.judul }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Riwayat Konsultasi</h1>
          <p className="text-gray-600">Riwayat konsultasi mahasiswa-dosen pembimbing</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }} variant="primary">
          <Plus className="w-4 h-4 mr-2" /> Tambah Konsultasi
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <div className="flex gap-2 items-center flex-1">
          <Search className="w-5 h-5 text-gray-400" />
          <Input placeholder="Cari mahasiswa, dosen, judul, atau topik..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-0" />
        </div>
        <Select label="Filter Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'Semua Status' }, ...STATUS_OPTIONS]} className="mb-0 md:w-48" />
      </div>

      <Table columns={columns} data={filtered} loading={loading} emptyMessage="Belum ada riwayat konsultasi" />

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editMode ? 'Edit Konsultasi' : 'Tambah Konsultasi'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Mahasiswa" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} options={studentOptions} required />
          <Select label="Dosen Pembimbing" value={form.lecturer_id} onChange={(e) => setForm({ ...form, lecturer_id: e.target.value })} options={lecturerOptions} required />
          <Select label="Skripsi" value={form.thesis_id} onChange={(e) => setForm({ ...form, thesis_id: e.target.value })} options={thesisOptions} required />
          <Input label="Tanggal" type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
          <Input label="Topik" value={form.topik} onChange={(e) => setForm({ ...form, topik: e.target.value })} required />
          <Input label="Catatan" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUS_OPTIONS} required />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{editMode ? 'Update' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      <div className="text-xs text-gray-500 mt-2">
        Catatan: Data ini adalah data uji (dummy), bukan data resmi UNKLAB. Akses disesuaikan dengan role Anda ({user.role}).
      </div>
    </div>
  );
};

export default RiwayatKonsultasi;
