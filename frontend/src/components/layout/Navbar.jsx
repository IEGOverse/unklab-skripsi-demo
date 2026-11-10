import { useAuth } from '../../context/AuthContext';
import { Menu } from 'lucide-react';

const Navbar = ({ onToggle }) => {
  const { user } = useAuth();

  const roleLabel = {
    admin: 'Administrator',
    dosen: 'Dosen',
    mahasiswa: 'Mahasiswa',
  };

  return (
    <nav className="bg-white border-b border-gray-200 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 shadow-sm gap-3">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onToggle}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          aria-label="Buka menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-sm sm:text-lg font-semibold text-gray-900 truncate">Sistem Manajemen Skripsi UNKLAB</span>
        <span className="hidden sm:inline px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium whitespace-nowrap">
          {roleLabel[user.role] || user.role}
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className="text-sm text-gray-600 hidden md:inline">{user.username}</span>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.username.charAt(0).toUpperCase()}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
