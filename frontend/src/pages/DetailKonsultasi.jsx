import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConsultations, getStudents, getLecturers, getTheses } from '../api/api';
import { ArrowLeft, FileText, User, AlertTriangle } from 'lucide-react';

const DetailKonsultasi = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [student, setStudent] = useState(null);
  const [lecturer, setLecturer] = useState(null);
  const [thesis, setThesis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [r1, r2, r3, r4] = await Promise.all([
          getConsultations(), getStudents(), getLecturers(), getTheses(),
        ]);
        const consultations = r1.data?.data || r1.data || [];
        const students = r2.data?.data || r2.data || [];
        setStudentsList(students);
        const lecturers = r3.data?.data || r3.data || [];
        const theses = r4.data?.data || r4.data || [];
        const row = consultations.find(x => String(x.id) === String(id));
        setItem(row || null);
        if (row) {
          setStudent(students.find(x => String(x.id) === String(row.student_id)) || null);
          setLecturer(lecturers.find(x => String(x.id) === String(row.lecturer_id)) || null);
          setThesis(theses.find(x => String(x.id) === String(row.thesis_id)) || null);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    load();
  }, [id]);

  if (loading) return <div className="text-center py-10 text-gray-500">Memuat detail...</div>;
  if (!item) return <div className="text-center py-10">Data tidak ditemukan.</div>;

  // Mahasiswa hanya boleh melihat konsultasi miliknya sendiri
  if (user.role === 'mahasiswa') {
    const me = studentsList.find(x => String(x.user_id) === String(user.id));
    const isOwn = me && String(me.id) === String(item.student_id);
    if (!isOwn) {
      return (
        <div className="max-w-md mx-auto mt-16 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Akses Ditolak</h1>
          <p className="text-slate-600 text-sm">Anda hanya dapat melihat detail konsultasi milik Anda sendiri.</p>
          <button onClick={() => navigate('/konsultasi')} className="text-blue-600 hover:underline text-sm">Kembali ke Riwayat Konsultasi</button>
        </div>
      );
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Detail Konsultasi</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500 uppercase font-medium">Mahasiswa</p>
            <p className="text-gray-900">{student ? student.nama : item.student_id}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500 uppercase font-medium">Dosen Pembimbing</p>
            <p className="text-gray-900">{lecturer ? lecturer.nama : item.lecturer_id}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500 uppercase font-medium">Skripsi</p>
            <p className="text-gray-900">{thesis ? thesis.judul : item.thesis_id}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500 uppercase font-medium">Tanggal</p>
            <p className="text-gray-900">{item.tanggal}</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Topik
          </p>
          <p className="text-gray-900">{item.topik}</p>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <User className="w-4 h-4" /> Catatan
          </p>
          <p className="bg-gray-50 p-4 rounded border border-gray-100 text-gray-800 whitespace-pre-wrap">{item.catatan || '-'}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.status === 'selesai' ? 'bg-green-100 text-green-700' :
            item.status === 'terjadwal' ? 'bg-blue-100 text-blue-700' :
            item.status === 'dibatalkan' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {item.status}
          </span>
        </div>
      </div>

      <div className="text-xs text-gray-500 mt-4">
        Catatan: Data ini adalah data uji (dummy), bukan data resmi UNKLAB.
      </div>
    </div>
  );
};

export default DetailKonsultasi;
