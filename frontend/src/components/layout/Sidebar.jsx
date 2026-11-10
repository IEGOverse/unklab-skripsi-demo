import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, User, BookOpen, FileText, Calendar, Shield, Settings, LogOut
} from 'lucide-react';

const menuItems = {
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Data Mahasiswa', icon: Users, path: '/mahasiswa' },
    { label: 'Data Dosen', icon: Users, path: '/dosen' },
    { label: 'Keahlian Dosen', icon: BookOpen, path: '/keahlian' },
    { label: 'Data Skripsi', icon: BookOpen, path: '/skripsi' },
    { label: 'Konsultasi', icon: FileText, path: '/konsultasi' },
    { label: 'Jadwal Defense', icon: Calendar, path: '/jadwal-defense' },
    { label: 'Profil', icon: User, path: '/profil' },
  ],
  dosen: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Keahlian Dosen', icon: BookOpen, path: '/keahlian' },
    { label: 'Konsultasi', icon: FileText, path: '/konsultasi' },
    { label: 'Jadwal Defense', icon: Calendar, path: '/jadwal-defense' },
    { label: 'Profil', icon: User, path: '/profil' },
  ],
  mahasiswa: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Skripsi Saya', icon: BookOpen, path: '/skripsi' },
    { label: 'Pengajuan Defense', icon: FileText, path: '/pengajuan-defense' },
    { label: 'AI Rekomendasi', icon: Shield, path: '/ai-rekomendasi' },
    { label: 'Konsultasi Saya', icon: FileText, path: '/konsultasi' },
    { label: 'Profil', icon: User, path: '/profil' },
  ],
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = menuItems[user.role] || menuItems.mahasiswa;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-navy-900 text-white">
      <div className="p-6 border-b border-navy-700">
        <h2 className="text-xl font-bold text-blue-400">UNKLAB</h2>
        <p className="text-sm text-gray-400 mt-1">Manajemen Skripsi</p>
      </div>
      <nav className="p-4 space-y-1">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex items-center px-4 py-3 rounded-lg text-gray-300 hover:bg-navy-700 hover:text-white transition-colors mb-1 ${
              typeof window !== 'undefined' && window.location.pathname === item.path
                ? 'bg-navy-700 text-white'
                : ''
            }`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="absolute bottom-0 left-0 w-full p-4 border-t border-navy-700">
        <button
          onClick={logout}
          className="flex items-center px-4 py-3 rounded-lg text-gray-300 hover:bg-navy-700 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
