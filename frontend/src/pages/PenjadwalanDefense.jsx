import { useState, useEffect } from 'react';
import {
  getDefenseSchedules, createDefenseSchedule, checkScheduleConflict,
  getDefenseRequests, getLecturers, getTheses, getStudents,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import { Plus, Calendar } from 'lucide-react';

const PenjadwalanDefense = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState([]);
  const [requests, setRequests] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [theses, setTheses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ defense_request_id: '', tanggal: '', waktu: '', ruangan: '', dosen_penguji_1_id: '', dosen_penguji_2_id: '' });

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

  const studentName = (id) => {
    const s = students.find(x => String(x.id) === String(id));
    return s ? s.nama : id;
  };
  const thesisOf = (id) => {
    const t = theses.find(x => String(x.id) === String(id));
    return t ? t.judul : id;
  };
  const requestLabel = (r) => {
    const t = theses.find(x => String(x.id) === String(r.thesis_id));
    const s = students.find(x => String(x.id) === String(r.student_id));
    return `${s ? s.nama : 'Mhs ' + r.student_id} - ${t ? t.judul.slice(0, 40) : 'Skripsi ' + r.thesis_id}`;
  };
  const lecturerName = (id) => {
    const l = lecturers.find(x => String(x.id) === String(id));
    return l ? l.nama : id;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.dosen_penguji_1_id === form.dosen_penguji_2_id) {
      alert('Dosen Penguji 1 dan Dosen Penguji 2 tidak boleh sama.');
      return;
    }
    setLoading(true);
    try {
      const conflict = await checkScheduleConflict({
        tanggal: form.tanggal,
        waktu: form.waktu,
        dosen_penguji_1_id: form.dosen_penguji_1_id,
        dosen_penguji_2_id: form.dosen_penguji_2_id,
        ruangan: form.ruangan,
      });
      if (conflict.data?.hasConflict) {
        alert('Bentrok jadwal: ' + (conflict.data.message || 'Dosen atau ruangan sudah terpakai pada tanggal dan waktu tersebut.'));
        setLoading(false);
        return;
      }
      await createDefenseSchedule({
        defense_request_id: Number(form.defense_request_id),
        tanggal: form.tanggal,
        waktu: form.waktu,
        ruangan: form.ruangan,
        dosen_penguji_1_id: Number(form.dosen_penguji_1_id),
        dosen_penguji_2_id: Number(form.dosen_penguji_2_id),
      });
      setOpen(false);
      setForm({ defense_request_id: '', tanggal: '', waktu: '', ruangan: '', dosen_penguji_1_id: '', dosen_penguji_2_id: '' });
      load();
    } catch (e) {
      alert('Gagal membuat jadwal: ' + (e.response?.data?.message || e.message));
    } finally { setLoading(false); }
  };

  const columns = [
    { label: 'Judul Skripsi', key: 'defense_request_id', render: (r) => {
      const req = requests.find(x => String(x.id) === String(r.defense_request_id));
      return req ? thesisOf(req.thesis_id) : r.thesis_title || r.defense_request_id;
    }},
    { label: 'Mahasiswa', key: 'defense_request_id', render: (r) => {
      const req = requests.find(x => String(x.id) === String(r.defense_request_id));
      return req ? studentName(req.student_id) : r.student_name || '-';
    }},
    { label: 'Tanggal', key: 'tanggal' },
    { label: 'Waktu', key: 'waktu' },
    { label: 'Ruangan', key: 'ruangan' },
    { label: 'Penguji 1', key: 'dosen_penguji_1_id', render: (r) => r.dosen_penguji_1_nama || lecturerName(r.dosen_penguji_1_id) },
    { label: 'Penguji 2', key: 'dosen_penguji_2_id', render: (r) => r.dosen_penguji_2_nama || lecturerName(r.dosen_penguji_2_id) },
    { label: 'Status', key: 'status', render: (r) => (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{r.status}</span>
    )},
  ];

  const requestOptions = requests.map(r => ({ value: r.id, label: requestLabel(r) }));
  const lecturerOptions = lecturers.map(l => ({ value: l.id, label: l.nama }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Penjadwalan Defense</h1>
          <p className="text-gray-600">{isAdmin ? 'Tetapkan jadwal sidang defense (hanya Admin)' : 'Jadwal sidang defense (lihat saja)'}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(true)} variant="primary">
            <Plus className="w-4 h-4 mr-2" /> Tetapkan Jadwal
          </Button>
        )}
      </div>

      <Table columns={columns} data={data} loading={loading} emptyMessage="Belum ada jadwal defense" />

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Tetapkan Jadwal Defense">
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Pengajuan Defense" value={form.defense_request_id} onChange={(e) => setForm({ ...form, defense_request_id: e.target.value })} options={requestOptions} required />
          <Input label="Tanggal" type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
          <Input label="Waktu" type="time" value={form.waktu} onChange={(e) => setForm({ ...form, waktu: e.target.value })} required />
          <Input label="Ruangan" value={form.ruangan} onChange={(e) => setForm({ ...form, ruangan: e.target.value })} required />
          <Select label="Dosen Penguji 1" value={form.dosen_penguji_1_id} onChange={(e) => setForm({ ...form, dosen_penguji_1_id: e.target.value })} options={lecturerOptions} required />
          <Select label="Dosen Penguji 2" value={form.dosen_penguji_2_id} onChange={(e) => setForm({ ...form, dosen_penguji_2_id: e.target.value })} options={lecturerOptions} required />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>Simpan Jadwal</Button>
          </div>
        </form>
      </Modal>

      <div className="text-xs text-gray-500 mt-2">
        Catatan: Data ini adalah data uji (dummy), bukan data resmi UNKLAB. Sistem memeriksa bentrok jadwal dosen dan ruangan sebelum menyimpan.
      </div>
    </div>
  );
};

export default PenjadwalanDefense;
