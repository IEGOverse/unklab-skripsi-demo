import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, BadgeCheck, Building2 } from 'lucide-react';

const roleInfo = {
  admin: { label: 'Administrator', desc: 'Akses penuh ke semua data dan pengaturan sistem.' },
  dosen: { label: 'Dosen', desc: 'Mengelola keahlian, konsultasi, dan jadwal defense.' },
  mahasiswa: { label: 'Mahasiswa', desc: 'Mengelola skripsi, ajukan defense, dan lihat jadwal.' },
};

const Profil = () => {
  const { user } = useAuth();
  const info = roleInfo[user.role] || roleInfo.mahasiswa;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profil dan Pengaturan Akun</h1>
        <p className="text-gray-600">Kelola profil dan pengaturan akun Anda.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user.username}</h2>
            <p className="text-sm text-gray-600">{info.label}</p>
          </div>
        </div>

        <div className="space-y-4">
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
