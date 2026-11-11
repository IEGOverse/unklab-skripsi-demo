import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/api';
import { Lock, User as UserIcon, GraduationCap, CalendarCheck, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';

const features = [
  { icon: CalendarCheck, text: 'Penjadwalan sidang otomatis tanpa bentrok dosen & ruangan' },
  { icon: Sparkles, text: 'Analisis topik + rekomendasi dosen pembimbing berbasis AI' },
  { icon: ShieldCheck, text: 'Hak akses per peran: Admin, Dosen, dan Mahasiswa' },
];

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login({ username, password });
      if (res.data.success) {
        authLogin(res.data.token, res.data.user);
        navigate('/');
      } else {
        setError(res.data.message || 'Login gagal');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 90% 8%, rgba(59,130,246,.22) 0, transparent 42%), radial-gradient(circle at 8% 92%, rgba(34,211,238,.28) 0, transparent 45%), radial-gradient(circle at 45% 55%, rgba(147,197,253,.25) 0, transparent 50%), linear-gradient(160deg, #f5f9ff 0%, #eaf0fb 55%, #eef4ff 100%)',
      }}
    >
      {/* Pola titik dekoratif global */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(30,64,175,.10) 1.2px, transparent 0)', backgroundSize: '26px 26px' }}
      />
      {/* Lingkaran cahaya dekoratif */}
      <div aria-hidden="true" className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-400/15 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-36 -left-36 w-[28rem] h-[28rem] rounded-full bg-cyan-400/15 blur-3xl" />
      {/* Panel brand (desktop) */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-[#14335c]"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, rgba(59,130,246,.35) 0, transparent 40%), radial-gradient(circle at 85% 75%, rgba(34,211,238,.25) 0, transparent 40%), radial-gradient(circle at 50% 120%, rgba(37,99,235,.3) 0, transparent 45%)',
          }}
        />
        {/* Dekorasi lingkaran */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full border border-white/10" />
        <div className="absolute top-1/3 -right-28 w-96 h-96 rounded-full border border-white/10" />
        <div className="absolute bottom-24 left-1/4 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-glow">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-lg font-extrabold font-display leading-tight">UNKLAB</p>
            <p className="text-[11px] uppercase tracking-widest text-blue-300">Universitas Klabat</p>
          </div>
        </div>

        <div className="relative">
          <h1 className="font-display text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight">
            Kelola skripsi<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">lebih cerdas.</span>
          </h1>
          <p className="mt-5 text-blue-100/85 text-lg leading-relaxed max-w-md">
            Satu platform untuk bimbingan, analisis topik AI, dan penjadwalan sidang defense — dari pengajuan judul hingga lulus.
          </p>
          <ul className="mt-8 space-y-4">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-blue-50/90">
                <span className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-cyan-300" />
                </span>
                <span className="text-sm leading-snug">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-blue-200/50">Data pada sistem ini bersifat uji (dummy), bukan data resmi UNKLAB.</p>
      </div>

      {/* Panel form */}
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-glow">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-extrabold font-display text-slate-900 leading-tight">UNKLAB</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Manajemen Skripsi</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl shadow-blue-900/10 border border-slate-200/70 p-8">
            <div aria-hidden="true" className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />
            <h2 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Selamat datang</h2>
            <p className="text-slate-500 mt-1.5 mb-6 text-sm">Masuk ke akun Anda untuk melanjutkan.</p>

            {error && (
              <div className="mb-5 p-3 bg-rose-50 text-rose-700 text-sm rounded-xl border border-rose-200 flex items-start gap-2">
                <span className="font-bold">!</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Username</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-all"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-all"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3 text-base">
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">Demo: gunakan akun yang diberikan presenter (password diverifikasi).</p>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-500">© 2026 Universitas Klabat · Sistem Manajemen Skripsi — data bersifat uji (dummy)</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
