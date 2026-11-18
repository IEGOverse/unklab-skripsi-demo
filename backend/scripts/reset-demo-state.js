const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
db.defense_schedules = [];
for (const r of db.defense_requests) {
  r.status = 'pending';
  r.alasan_dosen = null;
  r.alasan_admin = null;
}
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('Reset: defense_schedules kosong, defense_requests semua pending.');
