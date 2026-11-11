import { useAuth } from '../../context/AuthContext';
import { Menu, LogOut, Sparkles } from 'lucide-react';

const Navbar = ({ onToggle }) => {
  const { user, logout } = useAuth();

  const roleStyle = {
    admin: 'bg-blue-50 text-blue-700 ring-blue-200',
    dosen: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    mahasiswa: 'bg-violet-50 text-violet-700 ring-violet-200',
  };
  const roleLabel = {
    admin: 'Administrator',
    dosen: 'Dosen',
    mahasiswa: 'Mahasiswa',
  };

  return (
    <nav className="bg-white/90 backdrop-blur border border-slate-200/80 rounded-2xl flex justify-between items-center px-4 sm:px-5 py-3 shadow-card gap-3">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggle}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Buka menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-bold font-display text-slate-900 truncate leading-tight">Sistem Manajemen Skripsi UNKLAB</p>
          <p className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500"><Sparkles className="w-3 h-3 text-blue-500" /> Terintegrasi AI Gemini</p>
        </div>
        <span className={`hidden sm:inline px-2.5 py-1 text-[11px] rounded-full font-semibold ring-1 ring-inset whitespace-nowrap ${roleStyle[user.role] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
          {roleLabel[user.role] || user.role}
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className="text-sm text-slate-500 hidden md:inline">{user.username}</span>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-bold flex items-center justify-center shadow-md shadow-blue-600/20">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={logout}
          className="lg:hidden p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
