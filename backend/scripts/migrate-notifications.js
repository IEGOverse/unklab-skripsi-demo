// Migrasi: tambah entity notifications + contoh seed untuk demo penuh.
// State demo: request 1 = diterima_dosen (siap admin atur), request 2 = menunggu_persetujuan_dosen (menunggu dosen setuju)
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

if (!db.notifications) db.notifications = [];

// Sent the second request into "menunggu_persetujuan_dosen" to seed the approval UX
db.defense_requests[1].status = 'menunggu_persetujuan_dosen';
db.defense_requests[1].usulan_tanggal = '2026-03-25';
db.defense_requests[1].usulan_waktu = '13:00';
db.defense_requests[1].usulan_ruangan = 'B3';
db.defense_requests[1].usulan_penguji_1_id = 1;
db.defense_requests[1].usulan_penguji_2_id = 2;

db.notifications = [
  {
    id: 1,
    recipient_role: 'dosen',
    sender: 'Admin',
    title: 'Usulan Jadwal Defense membutuhkan persetujuan Anda',
    body: 'Admin mengusulkan jadwal sidang defense untuk Budi Santoso (2026-03-25 13:00, Ruangan B3) karena slot sebelumnya bentrok. Mohon periksa dan setujui/tolak.',
    type: 'defense_schedule_approval',
    request_id: 2,
    read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    recipient_role: 'dosen',
    sender: 'Mahasiswa',
    title: 'Budi Santoso mengajukan sidang defense',
    body: 'Budi Santoso mengajukan sidang defense untuk "Sistem Informasi Manajemen Skripsi Berbasis Web". Usulan: 2026-03-22 09:00.',
    type: 'defense_request',
    request_id: 1,
    read: false,
    created_at: new Date().toISOString(),
  },
];

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('OK: notifications seeded (%d). request 2 -> menunggu_persetujuan_dosen.', db.notifications.length);
