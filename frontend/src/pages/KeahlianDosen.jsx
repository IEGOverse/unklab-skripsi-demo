import { useState, useEffect } from 'react';
import {
  getExpertise, createExpertise, updateExpertise, deleteExpertise,
  getLecturers,
} from '../api/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import { Plus, Search } from 'lucide-react';

const KeahlianDosen = () => {
  const [data, setData] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ lecturer_id: '', bidang_keahlian: '', deskripsi: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([getExpertise(), getLecturers()]);
      setData(r1.data?.data || r1.data || []);
      setLecturers(r2.data?.data || r2.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const lecturerName = (id) => {
    const l = lecturers.find(x => String(x.id) === String(id));
    return l ? l.nama : id;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        lecturer_id: Number(form.lecturer_id),
        bidang_keahlian: form.bidang_keahlian,
        deskripsi: form.deskripsi,
      };
      if (editMode) {
        await updateExpertise(selectedId, payload);
      } else {
        await createExpertise(payload);
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
    setForm({ lecturer_id: row.lecturer_id, bidang_keahlian: row.bidang_keahlian, deskripsi: row.deskripsi || '' });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus data ini?')) return;
    try {
      await deleteExpertise(id);
      load();
    } catch (e) { alert('Gagal menghapus'); }
  };

  const resetForm = () => {
    setEditMode(false);
    setSelectedId(null);
    setForm({ lecturer_id: '', bidang_keahlian: '', deskripsi: '' });
  };

  const filtered = data.filter(d =>
    (d.bidang_keahlian || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.deskripsi || '').toLowerCase().includes(search.toLowerCase()) ||
    lecturerName(d.lecturer_id).toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { label: 'Dosen', key: 'lecturer_id', render: (r) => lecturerName(r.lecturer_id) },
    { label: 'Bidang Keahlian', key: 'bidang_keahlian' },
    { label: 'Deskripsi', key: 'deskripsi' },
    { label: 'Aksi', key: 'id', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => handleEdit(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
        <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline text-xs">Hapus</button>
      </div>
    )},
  ];

  const lecturerOptions = lecturers.map(l => ({ value: l.id, label: l.nama }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keahlian Dosen</h1>
          <p className="text-gray-600">Kelola keahlian dosen (Admin + Dosen sendiri)</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }} variant="primary">
          <Plus className="w-4 h-4 mr-2" /> Tambah Keahlian
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <Search className="w-5 h-5 text-gray-400" />
        <Input placeholder="Cari dosen, bidang, atau deskripsi..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-0" />
      </div>

      <Table columns={columns} data={filtered} loading={loading} emptyMessage="Tidak ada data keahlian" />

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editMode ? 'Edit Keahlian' : 'Tambah Keahlian'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Dosen" value={form.lecturer_id} onChange={(e) => setForm({ ...form, lecturer_id: e.target.value })} options={lecturerOptions} required />
          <Input label="Bidang Keahlian" value={form.bidang_keahlian} onChange={(e) => setForm({ ...form, bidang_keahlian: e.target.value })} required />
          <Input label="Deskripsi" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
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

export default KeahlianDosen;
