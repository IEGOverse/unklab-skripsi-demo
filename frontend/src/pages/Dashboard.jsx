import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUsers, getStudents, getLecturers, getTheses, getDefenseRequests, getDefenseSchedules } from '../api/api';
import { Users, User, BookOpen, Calendar, FileText, Info, ArrowRight } from 'lucide-react';

const statCards = {
  admin: [
    { label: 'Pengguna', icon: Users, key: 'users', from: 'from-blue-500', to: 'to-cyan-400' },
    { label: 'Mahasiswa', icon: User, key: 'students', from: 'from-emerald-500', to: 'to-teal-400' },
    { label: 'Dosen', icon: User, key: 'lecturers', from: 'from-violet-500', to: 'to-purple-400' },
    { label: 'Skripsi', icon: BookOpen, key: 'theses', from: 'from-orange-500', to: 'to-amber-400' },
    { label: 'Pengajuan Defense', icon: FileText, key: 'defense_requests', from: 'from-rose-500', to: 'to-red-400' },
  ],
  dosen: [
    { label: 'Skripsi Bimbingan', icon: BookOpen, key: 'theses', from: 'from-blue-500', to: 'to-cyan-400' },
    { label: 'Jadwal Defense', icon: Calendar, key: 'defense_schedules', from: 'from-emerald-500', to: 'to-teal-400' },
  ],
  mahasiswa: [
    { label: 'Skripsi Saya', icon: BookOpen, key: 'theses', from: 'from-blue-500', to: 'to-cyan-400' },
    { label: 'Pengajuan Defense', icon: FileText, key: 'defense_requests', from: 'from-emerald-500', to: 'to-teal-400' },
  ],
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const roles = statsRoles(user.role);
        const promises = roles.map((key) => fetchCount(key));
        const results = await Promise.all(promises);
        const obj = {};
        roles.forEach((key, i) => { obj[key] = results[i]; });
        setStats(obj);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user.role]);

  const statsRoles = (role) => {
    if (role === 'admin') return ['users', 'students', 'lecturers', 'theses', 'defense_requests'];
    if (role === 'dosen') return ['theses', 'defense_schedules'];
    return ['theses', 'defense_requests'];
  };

  const fetchCount = async (endpoint) => {
    try {
      const res = await (endpoint === 'users' ? getUsers() : endpoint === 'students' ? getStudents() : endpoint === 'lecturers' ? getLecturers() : endpoint === 'theses' ? getTheses() : endpoint === 'defense_requests' ? getDefenseRequests() : getDefenseSchedules());
      return res.data?.data?.length ?? res.data?.length ?? 0;
    } catch (e) {
      return 0;
    }
  };

  const items = statCards[user.role] || statCards.mahasiswa;

  return (
    <div className="space-y-6">
      {/* Header sambutan */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-900 via-navy-800 to-[#173763] text-white p-6 sm:p-7 shadow-card">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 85% 15%, rgba(59,130,246,.4) 0, transparent 45%), radial-gradient(circle at 10% 90%, rgba(34,211,238,.25) 0, transparent 40%)',
          }}
        />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-widest text-cyan-300 font-semibold">Dashboard {user.role}</p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold font-display tracking-tight">
            Selamat datang, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">{user.username}</span>
          </h1>
          <p className="mt-2 text-sm text-blue-100/80 max-w-lg">Kelola seluruh proses skripsi dari satu tempat — bimbingan, AI, dan sidang defense.</p>
        </div>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="group bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-glow transition-all duration-300"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.from} ${item.to} flex items-center justify-center shadow-md`}>
              <item.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
              <p className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">{loading ? '-' : stats[item.key] ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 ring-1 ring-inset ring-blue-100 flex items-center justify-center flex-shrink-0">
          <Info className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold font-display text-slate-900">Informasi Singkat</h3>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            Sistem Informasi Manajemen Skripsi UNKLAB — kelola pengajuan judul, bimbingan konsultasi, analisis topik dengan AI Gemini, dan penjadwalan sidang defense.
          </p>
          <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">Data bersifat uji (dummy), bukan data resmi UNKLAB. <ArrowRight className="w-3 h-3" /></p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
