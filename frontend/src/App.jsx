import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataMahasiswa from './pages/DataMahasiswa';
import DataDosen from './pages/DataDosen';
import KeahlianDosen from './pages/KeahlianDosen';
import DataSkripsi from './pages/DataSkripsi';
import PengajuanDefense from './pages/PengajuanDefense';
import AIRecommendasi from './pages/AIRecommendasi';
import PersetujuanJadwal from './pages/PersetujuanJadwal';
import AlurSkripsi from './pages/AlurSkripsi';
import PengaturanFakultas from './pages/PengaturanFakultas';
import PenjadwalanDefense from './pages/PenjadwalanDefense';
import RiwayatKonsultasi from './pages/RiwayatKonsultasi';
import DetailKonsultasi from './pages/DetailKonsultasi';
import Profil from './pages/Profil';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="ml-0 lg:ml-64 p-4 sm:p-6">
        <Navbar onToggle={() => setSidebarOpen(true)} />
        <main className="mt-4 sm:mt-6">{children}</main>
      </div>
    </div>
  );
};

const Page = ({ roles, children }) => (
  <ProtectedRoute allowedRoles={roles}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Page roles={['admin', 'dosen', 'mahasiswa']}><Dashboard /></Page>} />
          <Route path="/mahasiswa" element={<Page roles={['admin']}><DataMahasiswa /></Page>} />
          <Route path="/dosen" element={<Page roles={['admin']}><DataDosen /></Page>} />
          <Route path="/keahlian" element={<Page roles={['admin']}><KeahlianDosen /></Page>} />
          <Route path="/skripsi" element={<Page roles={['admin', 'mahasiswa']}><DataSkripsi /></Page>} />
          <Route path="/pengajuan-defense" element={<Page roles={['mahasiswa']}><PengajuanDefense /></Page>} />
          <Route path="/pengajuan-jadwal" element={<Page roles={['dosen']}><PersetujuanJadwal /></Page>} />
          <Route path="/alur-skripsi" element={<Page roles={['admin', 'mahasiswa']}><AlurSkripsi /></Page>} />
          <Route path="/pengaturan-fakultas" element={<Page roles={['admin']}><PengaturanFakultas /></Page>} />
          <Route path="/ai-rekomendasi" element={<Page roles={['mahasiswa', 'admin']}><AIRecommendasi /></Page>} />
          <Route path="/jadwal-defense" element={<Page roles={['admin', 'dosen']}><PenjadwalanDefense /></Page>} />
          <Route path="/konsultasi" element={<Page roles={['admin', 'mahasiswa']}><RiwayatKonsultasi /></Page>} />
          <Route path="/konsultasi/:id" element={<Page roles={['admin', 'mahasiswa']}><DetailKonsultasi /></Page>} />
          <Route path="/profil" element={<Page roles={['admin', 'dosen', 'mahasiswa']}><Profil /></Page>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
