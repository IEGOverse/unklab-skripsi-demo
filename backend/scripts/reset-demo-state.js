const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

db.defense_schedules = [];
for (const r of db.defense_requests) {
  r.status = 'pending';
  r.usulan_tanggal = null;
  r.usulan_waktu = null;
  r.usulan_ruangan = null;
  r.usulan_penguji_1_id = null;
  r.usulan_penguji_2_id = null;
  r.alasan_dosen = null;
  r.alasan_admin = null;
}

db.notifications = [
  {
    id: 1,
    recipient_role: 'dosen',
    sender: 'Mahasiswa',
    title: 'Budi Santoso mengajukan sidang defense',
    body: 'Budi Santoso mengajukan sidang defense untuk "Sistem Informasi Manajemen Skripsi Berbasis Web". Usulan: 2026-03-22 09:00.',
    type: 'defense_request',
    request_id: 1,
    read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    recipient_role: 'dosen',
    sender: 'Mahasiswa',
    title: 'Budi Santoso mengajukan sidang defense (pengajuan kedua)',
    body: 'Budi Santoso mengajukan sidang defense kedua untuk skripsi yang sama. Usulan: 2026-03-25 13:00.',
    type: 'defense_request',
    request_id: 2,
    read: false,
    created_at: new Date().toISOString(),
  },
];

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('Reset: kedua pengajuan pending, schedules kosong, 2 notifikasi dosen.');
