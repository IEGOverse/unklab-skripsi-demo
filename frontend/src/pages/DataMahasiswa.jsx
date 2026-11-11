import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getStudents, createStudent, updateStudent, deleteStudent,
  getUsers, createUser,
} from '../api/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import { Plus, Search } from 'lucide-react';

const DataMahasiswa = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ npm: '', nama: '', prodi: '', telepon: '', username: '', password: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const r = await getStudents();
      setData(r.data?.data || r.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMode) {
        await updateStudent(selectedId, {
          npm: form.npm, nama: form.nama, prodi: form.prodi, telepon: form.telepon,
        });
      } else {
        const userRes = await createUser({ username: form.username, password: form.password, role: 'mahasiswa' });
        const newUserId = userRes.data?.id ?? userRes.data?.data?.id;
        await createStudent({
          npm: form.npm, nama: form.nama, prodi: form.prodi, telepon: form.telepon,
          user_id: newUserId, created_at: new Date().toISOString(),
        });
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
    setForm({ npm: row.npm, nama: row.nama, prodi: row.prodi, telepon: row.telepon, username: '', password: '' });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus data ini?')) return;
    try {
      await deleteStudent(id);
      load();
    } catch (e) { alert('Gagal menghapus'); }
  };

  const resetForm = () => {
    setEditMode(false);
    setSelectedId(null);
    setForm({ npm: '', nama: '', prodi: '', telepon: '', username: '', password: '' });
  };

  const filtered = data.filter(d =>
    (d.nama || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.npm || '').toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { label: 'NPM', key: 'npm' },
    { label: 'Nama', key: 'nama' },
    { label: 'Prodi', key: 'prodi' },
    { label: 'Telepon', key: 'telepon' },
    { label: 'Aksi', key: 'id', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => handleEdit(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
        <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline text-xs">Hapus</button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Data Mahasiswa</h1>
          <p className="text-gray-600">Kelola data mahasiswa (hanya Admin)</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }} variant="primary">
          <Plus className="w-4 h-4 mr-2" /> Tambah Mahasiswa
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <Search className="w-5 h-5 text-gray-400" />
        <Input placeholder="Cari nama atau NPM..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-0" />
      </div>

      <Table columns={columns} data={filtered} loading={loading} emptyMessage="Tidak ada data mahasiswa" />

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editMode ? 'Edit Mahasiswa' : 'Tambah Mahasiswa'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="NPM" value={form.npm} onChange={(e) => setForm({ ...form, npm: e.target.value })} required />
          <Input label="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
          <Input label="Prodi" value={form.prodi} onChange={(e) => setForm({ ...form, prodi: e.target.value })} required />
          <Input label="Telepon" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} required />
          {!editMode && (
            <>
              <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </>
          )}
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

export default DataMahasiswa;
