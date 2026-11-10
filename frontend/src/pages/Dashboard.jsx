import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUsers, getStudents, getLecturers, getTheses, getDefenseRequests, getDefenseSchedules } from '../api/api';
import { Users, User, BookOpen, Calendar, FileText } from 'lucide-react';

const statCards = {
  admin: [
    { label: 'Pengguna', icon: Users, key: 'users', color: 'bg-blue-500' },
    { label: 'Mahasiswa', icon: User, key: 'students', color: 'bg-green-500' },
    { label: 'Dosen', icon: User, key: 'lecturers', color: 'bg-purple-500' },
    { label: 'Skripsi', icon: BookOpen, key: 'theses', color: 'bg-orange-500' },
    { label: 'Pengajuan Defense', icon: FileText, key: 'defense_requests', color: 'bg-red-500' },
  ],
  dosen: [
    { label: 'Skripsi Bimbingan', icon: BookOpen, key: 'theses', color: 'bg-blue-500' },
    { label: 'Jadwal Defense', icon: Calendar, key: 'defense_schedules', color: 'bg-green-500' },
  ],
  mahasiswa: [
    { label: 'Skripsi Saya', icon: BookOpen, key: 'theses', color: 'bg-blue-500' },
    { label: 'Pengajuan Defense', icon: FileText, key: 'defense_requests', color: 'bg-green-500' },
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Selamat datang, {user.username}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {items.map((item) => (
          <div key={item.label} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center text-white`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats[item.key] ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Singkat</h3>
        <p className="text-gray-600">
          Sistem Informasi Manajemen Skripsi UNKLAB. Pilih menu di sidebar untuk mulai mengelola data.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
