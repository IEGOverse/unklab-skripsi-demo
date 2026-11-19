import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStudents, getLecturers } from '../api/api';
import { User, Mail, BadgeCheck, Building2, CreditCard, BookOpen, Loader2 } from 'lucide-react';

const norm = (r) => r.data?.data || r.data || [];

const roleInfo = {
  admin: { label: 'Administrator', desc: 'Akses penuh ke semua data dan pengaturan sistem.' },
  dosen: { label: 'Dosen', desc: 'Mengelola keahlian, konsultasi, dan jadwal sidang.' },
  mahasiswa: { label: 'Mahasiswa', desc: 'Mengelola skripsi, ajukan sidang, dan lihat jadwal.' },
};

const Profil = () => {
  const { user } = useAuth();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const info = roleInfo[user.role] || roleInfo.mahasiswa;

  useEffect(() => {
    const load = async () => {
      try {
        if (user.role === 'mahasiswa') {
          const res = await getStudents();
          const list = norm(res);
          setMe(list.find(s => String(s.user_id) === String(user.id)) || null);
        } else if (user.role === 'dosen') {
          const res = await getLecturers();
          const list = norm(res);
          setMe(list.find(l => String(l.user_id) === String(user.id)) || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id, user.role]);

  const displayName = user.role === 'admin' ? 'Administrator' : (me?.nama || user.username);
  const extraRows = [];
  if (user.role === 'mahasiswa' && me) {
    extraRows.push({ label: 'NIM', value: me.nim, icon: CreditCard });
    extraRows.push({ label: 'Program Studi', value: me.prodi, icon: BookOpen });
  } else if (user.role === 'dosen' && me) {
    extraRows.push({ label: 'NIP', value: me.nip, icon: CreditCard });
    extraRows.push({ label: 'Program Studi', value: me.prodi, icon: BookOpen });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat profil...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Profil dan Pengaturan Akun</h1>
        <p className="text-gray-600">Kelola profil dan pengaturan akun Anda.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-extrabold font-display shadow-glow">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
            <p className="text-sm text-gray-600">{info.label}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <User className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Nama</p>
              <p className="text-sm text-gray-500">{displayName}</p>
            </div>
          </div>
          {extraRows.map(row => (
            <div key={row.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <row.icon className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{row.label}</p>
                <p className="text-sm text-gray-500">{row.value}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <User className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Username</p>
              <p className="text-sm text-gray-500">{user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <Mail className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <BadgeCheck className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Role</p>
              <p className="text-sm text-gray-500">{info.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <Building2 className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Institusi</p>
              <p className="text-sm text-gray-500">UNKLAB</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-700">
            {info.desc}
          </p>
        </div>
      </div>

      <div className="text-xs text-gray-500 mt-4">
        Catatan: Data ini adalah data uji (dummy), bukan data resmi UNKLAB.
      </div>
    </div>
  );
};

export default Profil;
