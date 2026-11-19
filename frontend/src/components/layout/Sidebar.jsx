import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, User, BookOpen, FileText, Calendar, Shield, LogOut, X, GraduationCap, Inbox
} from 'lucide-react';

const menuItems = {
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Alur Skripsi', icon: GraduationCap, path: '/alur-skripsi' },
    { label: 'Data Mahasiswa', icon: Users, path: '/mahasiswa' },
    { label: 'Data Dosen', icon: Users, path: '/dosen' },
    { label: 'Keahlian Dosen', icon: BookOpen, path: '/keahlian' },
    { label: 'Konsultasi', icon: FileText, path: '/konsultasi' },
    { label: 'Jadwal Defense', icon: Calendar, path: '/jadwal-defense' },
    { label: 'Pengaturan Fakultas', icon: Shield, path: '/pengaturan-fakultas' },
    { label: 'Profil', icon: User, path: '/profil' },
  ],
  dosen: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Persetujuan Jadwal', icon: Inbox, path: '/pengajuan-jadwal' },
    { label: 'Jadwal Defense', icon: Calendar, path: '/jadwal-defense' },
    { label: 'Profil', icon: User, path: '/profil' },
  ],
  mahasiswa: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Alur Skripsi', icon: GraduationCap, path: '/alur-skripsi' },
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
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen h-[100dvh] w-64 z-50 flex flex-col text-slate-300 transform transition-all duration-300 bg-gradient-to-b from-navy-900 via-navy-800 to-navy-700 ${
          open ? 'translate-x-0 visible' : '-translate-x-full invisible'
        } lg:translate-x-0 lg:visible`}
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% -10%, rgba(59,130,246,.28) 0, transparent 45%), radial-gradient(circle at 120% 110%, rgba(34,211,238,.18) 0, transparent 40%)',
        }}
        aria-hidden={!open}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-glow">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold font-display text-white leading-tight tracking-tight">UNKLAB</h2>
              <p className="text-[11px] font-medium text-blue-300/90 tracking-wide">Manajemen Skripsi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
            aria-label="Tutup menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => go(item.path)}
                className={`group flex items-center w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-glow'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 mr-3 flex-shrink-0 transition-colors ${
                    active ? 'text-cyan-200' : 'text-slate-400 group-hover:text-cyan-300'
                  }`}
                />
                {item.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-300" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.username}</p>
              <p className="text-[10px] uppercase tracking-wider text-blue-300/80">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); onClose(); }}
            className="flex items-center w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-rose-500/15 hover:text-rose-200 transition-all duration-200"
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
