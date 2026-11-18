// Migrasi: tambah grade_scale ke faculty_rules + field penugasan penguji ke workflow.
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const DEFAULT_SCALE = [
  { huruf: 'A', min: 85 },
  { huruf: 'A-', min: 80 },
  { huruf: 'B+', min: 75 },
  { huruf: 'B', min: 70 },
  { huruf: 'B-', min: 65 },
  { huruf: 'C+', min: 60 },
  { huruf: 'C', min: 55 },
  { huruf: 'D', min: 50 },
  { huruf: 'E', min: 0 },
];

for (const r of db.faculty_rules) {
  if (!r.grade_scale) r.grade_scale = DEFAULT_SCALE;
}
for (const w of db.workflow) {
  if (!w.sempro_penguji) w.sempro_penguji = [];
  if (!w.sidang_penguji) w.sidang_penguji = [];
  if (!w.sempro_detail) w.sempro_detail = {};
  if (!w.nilai_detail) w.nilai_detail = {};
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('OK: grade_scale ditambahkan ke %d rules; field penguji ditambahkan ke %d workflow', db.faculty_rules.length, db.workflow.length);
