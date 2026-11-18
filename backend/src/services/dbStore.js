/**
 * Satu instance lowdb (FileSync) dipakai bersama oleh JSON Server dan controller kustom,
 * supaya data in-memory dan db.json selalu konsisten (tanpa stale read).
 */
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../db.json');

const db = low(new FileSync(DB_PATH));
// Pastikan setiap entitas utama ada (defaults aman, tidak menimpa data lama)
db.defaults({
  users: [], students: [], lecturers: [], lecturer_expertise: [],
  theses: [], consultations: [], defense_requests: [], defense_schedules: [],
  lecturer_availability: [], faculty_rules: [], workflow: [],
}).write();

module.exports = { db, DB_PATH };
