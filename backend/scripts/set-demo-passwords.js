const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const h = (p) => crypto.createHash('sha256').update(p).digest('hex');
const PASSWORDS = { admin: 'admin-demo-2026!', dosen: 'dosen-demo-2026!', mahasiswa: 'mhs-demo-2026!' };
const hashFor = {
  admin: h(PASSWORDS.admin),
  dosen_a: h(PASSWORDS.dosen),
  dosen_b: h(PASSWORDS.dosen),
  mhs_001: h(PASSWORDS.mahasiswa),
  mhs_002: h(PASSWORDS.mahasiswa),
};

const dbPath = path.join(__dirname, '..', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
for (const u of db.users) {
  if (hashFor[u.username]) {
    u.password_hash = hashFor[u.username];
    console.log(u.username, '->', u.password_hash);
  } else {
    console.log('SKIP (tidak dikenal):', u.username);
  }
}
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('db.json updated');
