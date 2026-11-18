// Rotasi password demo ke nilai kuat. Password diambil dari env (tidak disimpan di repo).
// Pakai:
//   node scripts/rotate-demo-passwords.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const h = (p) => crypto.createHash('sha256').update(p).digest('hex');
const PASSWORDS = {
  admin: process.env.DEMO_ADMIN || crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12),
  dosen: process.env.DEMO_DOSEN || crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12),
  mahasiswa: process.env.DEMO_MHS || crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12),
};
const map = {
  admin: PASSWORDS.admin,
  dosen_a: PASSWORDS.dosen,
  dosen_b: PASSWORDS.dosen,
  mhs_001: PASSWORDS.mahasiswa,
  mhs_002: PASSWORDS.mahasiswa,
};

const dbPath = path.join(__dirname, '..', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
for (const u of db.users) {
  if (map[u.username]) u.password_hash = h(map[u.username]);
}
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('Password baru (SIMPAN INI, tidak akan ditulis lagi):');
console.log('  admin  :', PASSWORDS.admin);
console.log('  dosen  :', PASSWORDS.dosen);
console.log('  mhs    :', PASSWORDS.mahasiswa);
