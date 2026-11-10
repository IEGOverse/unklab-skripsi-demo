import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, User, BookOpen, FileText, Calendar, Shield, LogOut, X
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

const Sidebar = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = menuItems[user.role] || menuItems.mahasiswa;

  const go = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop untuk mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-navy-900 text-white z-50 transform transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-6 border-b border-navy-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-400">UNKLAB</h2>
            <p className="text-sm text-gray-400 mt-1">Manajemen Skripsi</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white"
            aria-label="Tutup menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-160px)]">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => go(item.path)}
              className={`flex items-center w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-navy-700 hover:text-white transition-colors mb-1 ${
                location.pathname === item.path ? 'bg-navy-700 text-white' : ''
              }`}
            >
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-navy-700">
          <button
            onClick={() => { logout(); onClose(); }}
            className="flex items-center w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-navy-700 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
