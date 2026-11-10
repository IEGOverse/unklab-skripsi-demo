import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();

  const roleLabel = {
    admin: 'Administrator',
    dosen: 'Dosen',
    mahasiswa: 'Mahasiswa',
  };

  return (
    <nav className="bg-white border-b border-gray-200 flex justify-between items-center px-6 py-4 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="text-lg font-semibold text-gray-900">Sistem Manajemen Skripsi UNKLAB</span>
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
          {roleLabel[user.role] || user.role}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{user.username}</span>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.username.charAt(0).toUpperCase()}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
