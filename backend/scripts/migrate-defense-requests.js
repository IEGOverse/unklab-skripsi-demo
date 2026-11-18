// Migrasi: tambah field usulan jadwal & keputusan dosen ke defense_requests.
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

for (const r of db.defense_requests) {
  if (!r.tanggal_diusulkan) r.tanggal_diusulkan = '2026-03-22';
  if (!r.waktu_diusulkan) r.waktu_diusulkan = '09:00';
  if (!r.catatan_mahasiswa) r.catatan_mahasiswa = '';
  if (r.alasan_dosen === undefined) r.alasan_dosen = null;
}
// Contoh: pengajuan #1 menunggu dosen; biarkan demo alur dosen menerima secara langsung.
if (db.defense_requests[0]) {
  db.defense_requests[0].catatan_mahasiswa = 'Mohon dijadwalkan pagi hari (saya dari luar kota untuk sidang).';
}
if (db.defense_requests[1]) {
  db.defense_requests[1].tanggal_diusulkan = '2026-03-25';
  db.defense_requests[1].waktu_diusulkan = '13:00';
  db.defense_requests[1].catatan_mahasiswa = 'Sidang setelah jam makan siang, ruangan kampus tersedia.';
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('OK: defense_requests diperkaya:', db.defense_requests.length, 'record');
