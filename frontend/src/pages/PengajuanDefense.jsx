import { useState, useEffect } from 'react';
import {
  getTheses, createDefenseRequest, getDefenseRequests,
  getStudents, getLecturers, aiAnalyze,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import { FileText, Search, Sparkles } from 'lucide-react';

const PengajuanDefense = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [theses, setTheses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ thesis_id: '', topik_ai: '', bidang_ai: '', dosen_rekomendasi_id: '', tanggal_diusulkan: '', waktu_diusulkan: '', catatan_mahasiswa: '' });
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [rStudents, rTheses, rRequests, rLecturers] = await Promise.all([
        getStudents(), getTheses(), getDefenseRequests(), getLecturers(),
      ]);
      const norm = (r) => r.data?.data || r.data || [];
      const allStudents = norm(rStudents);
      const me = allStudents.find(s => String(s.user_id) === String(user.id)) || null;
      setStudent(me);
      const myTheses = me ? norm(rTheses).filter(t => String(t.student_id) === String(me.id)) : [];
      setTheses(myTheses);
      setData(me ? norm(rRequests).filter(r => String(r.student_id) === String(me.id)) : []);
      setLecturers(norm(rLecturers));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAnalyzeWithAI = async () => {
    const thesis = theses.find(t => String(t.id) === String(form.thesis_id));
    if (!thesis) {
      alert('Pilih skripsi terlebih dahulu.');
      return;
    }
    setAnalyzing(true);
    try {
      const res = await aiAnalyze({ judul: thesis.judul, abstrak: thesis.abstrak || thesis.judul });
      const result = res.data?.data || res.data;
      setForm(f => ({ ...f, topik_ai: result.topik || '', bidang_ai: result.bidang || '' }));
    } catch (e) {
      alert('Gagal menganalisis dengan AI: ' + (e.response?.data?.message || e.message));
    } finally { setAnalyzing(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!student) {
      alert('Data mahasiswa Anda tidak ditemukan.');
      return;
    }
    setLoading(true);
    try {
      await createDefenseRequest({
        student_id: student.id,
        thesis_id: Number(form.thesis_id),
        topik_ai: form.topik_ai,
        bidang_ai: form.bidang_ai,
        dosen_rekomendasi_id: form.dosen_rekomendasi_id ? Number(form.dosen_rekomendasi_id) : null,
        tanggal_diusulkan: form.tanggal_diusulkan,
        waktu_diusulkan: form.waktu_diusulkan,
        catatan_mahasiswa: form.catatan_mahasiswa,
        status: 'pending',
        alasan_admin: null,
        alasan_dosen: null,
        created_at: new Date().toISOString(),
      });
      setOpen(false);
      setForm({ thesis_id: '', topik_ai: '', bidang_ai: '', dosen_rekomendasi_id: '', tanggal_diusulkan: '', waktu_diusulkan: '', catatan_mahasiswa: '' });
      load();
    } catch (e) {
      alert('Gagal mengajukan: ' + (e.response?.data?.message || e.message));
    } finally { setLoading(false); }
  };

  const thesisOf = (id) => {
    const t = theses.find(x => String(x.id) === String(id));
    return t ? t.judul : id;
  };
  const lecturerName = (id) => {
    if (!id) return '-';
    const l = lecturers.find(x => String(x.id) === String(id));
    return l ? l.nama : id;
  };

  const filtered = data.filter(d => {
    const t = theses.find(x => String(x.id) === String(d.thesis_id));
    const j = t ? t.judul : '';
    const q = search.toLowerCase();
    return j.toLowerCase().includes(q) || (d.topik_ai || '').toLowerCase().includes(q) || (d.bidang_ai || '').toLowerCase().includes(q);
  });

  const columns = [
    { label: 'Skripsi', key: 'thesis_id', render: (r) => (
      <span className="block max-w-[260px] truncate" title={thesisOf(r.thesis_id)}>{thesisOf(r.thesis_id)}</span>
    )},
    { label: 'Topik AI', key: 'topik_ai' },
    { label: 'Bidang AI', key: 'bidang_ai' },
    { label: 'Dosen Rekomendasi', key: 'dosen_rekomendasi_id', render: (r) => lecturerName(r.dosen_rekomendasi_id) },
    { label: 'Diusulkan', key: 'tanggal_diusulkan', render: (r) => (
      <div className="text-sm">
        <div>{r.tanggal_diusulkan || '-'}</div>
        <div className="text-xs text-gray-500">{r.waktu_diusulkan || ''}</div>
      </div>
    )},
    { label: 'Status', key: 'status', render: (r) => (
      <div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
          r.status === 'disetujui' || r.status === 'diterima_dosen' ? 'bg-green-100 text-green-800' :
          r.status === 'menunggu_persetujuan_dosen' ? 'bg-amber-100 text-amber-800' :
          r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          r.status === 'ditolak_dosen' || r.status === 'ditolak' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
        }`}>{
          r.status === 'pending' ? 'Menunggu Dosen' :
          r.status === 'diterima_dosen' ? 'Diterima Dosen' :
          r.status === 'ditolak_dosen' ? 'Ditolak Dosen' :
          r.status === 'menunggu_persetujuan_dosen' ? 'Diusulkan Admin (Menunggu Dosen)' :
          r.status === 'disetujui' ? 'Dijadwalkan' : r.status
        }</span>
        {r.status === 'ditolak_dosen' && r.alasan_dosen && (
          <div className="text-[10px] text-red-600 mt-1 max-w-[220px]">Alasan: {r.alasan_dosen}</div>
        )}
      </div>
    )},
  ];

  const thesisOptions = theses.map(t => ({ value: t.id, label: t.judul }));
  const lecturerOptions = lecturers.map(l => ({ value: l.id, label: l.nama }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Pengajuan Defense</h1>
          <p className="text-gray-600">Ajukan sidang defense untuk skripsi Anda{student ? ` — ${student.nama} (${student.nim})` : ''}</p>
        </div>
        <Button onClick={() => setOpen(true)} variant="primary" disabled={!student}>
          <FileText className="w-4 h-4 mr-2" /> Ajukan Defense
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <Search className="w-5 h-5 text-gray-400" />
        <Input placeholder="Cari judul skripsi, topik, atau bidang..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-0" />
      </div>

      {!student && !loading && (
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-sm">
          Data mahasiswa untuk akun Anda belum terhubung. Hubungi administrator.
        </div>
      )}

      <Table columns={columns} data={filtered} loading={loading} emptyMessage='Belum ada pengajuan defense. Klik "Ajukan Defense" untuk mengajukan.' />

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Ajukan Pengajuan Defense">
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Skripsi" value={form.thesis_id} onChange={(e) => setForm({ ...form, thesis_id: e.target.value })} options={thesisOptions} required />
          <button
            type="button"
            onClick={handleAnalyzeWithAI}
            disabled={analyzing || !form.thesis_id}
            className="flex items-center gap-2 text-sm text-purple-700 hover:text-purple-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" /> {analyzing ? 'Menganalisis...' : 'Isi Topik & Bidang dengan AI'}
          </button>
          <Input label="Topik AI" value={form.topik_ai} onChange={(e) => setForm({ ...form, topik_ai: e.target.value })} required />
          <Input label="Bidang AI" value={form.bidang_ai} onChange={(e) => setForm({ ...form, bidang_ai: e.target.value })} required />
          <Select label="Dosen Rekomendasi (opsional)" value={form.dosen_rekomendasi_id} onChange={(e) => setForm({ ...form, dosen_rekomendasi_id: e.target.value })} options={lecturerOptions} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Usulan Tanggal Defense" type="date" value={form.tanggal_diusulkan} onChange={(e) => setForm({ ...form, tanggal_diusulkan: e.target.value })} required />
            <Input label="Usulan Waktu" type="time" value={form.waktu_diusulkan} onChange={(e) => setForm({ ...form, waktu_diusulkan: e.target.value })} required />
          </div>
          <Input label="Catatan untuk Dosen (opsional)" value={form.catatan_mahasiswa} onChange={(e) => setForm({ ...form, catatan_mahasiswa: e.target.value })} placeholder="Alasan/preferensi jadwal..." />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>Ajukan</Button>
          </div>
        </form>
      </Modal>

      <div className="text-xs text-gray-500 mt-2">
        Catatan: Data ini adalah data uji (dummy), bukan data resmi UNKLAB. Halaman ini hanya menampilkan pengajuan milik Anda.
      </div>
    </div>
  );
};

export default PengajuanDefense;
