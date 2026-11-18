const express = require('express');
const jsonServer = require('json-server');
const router = express.Router();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../db.json');

// Router JSON Server untuk semua entitas di db.json
// Endpoint: /api/users, /api/students, /api/lecturers, /api/lecturer_expertise,
//           /api/theses, /api/consultations, /api/defense_requests,
//           /api/defense_schedules, /api/lecturer_availability
const apiRouter = jsonServer.router(DB_PATH);

// Middleware default json-server (body parser, etc.)
const middlewares = jsonServer.defaults();

// Role guard minimal untuk operasi tulis yang sensitif.
// Demo limitation: detail per-entitas (mis. dosen hanya boleh ubah keahliannya sendiri)
// tidak di-enforce penuh; yang enforce adalah autentikasi + aturan di bawah ini.
// - Write /users hanya untuk admin (mencegah eskalasi privilege)
// - Write /defense_schedules hanya untuk admin (konsisten dengan /api/schedules)
// - DELETE pada entitas master hanya untuk admin
// - Write /consultations hanya untuk admin & dosen (mahasiswa tidak bisa mengubah riwayat)
const guardWrite = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  const role = req.user?.role;
  const base = req.path.split('/').filter(Boolean)[0] || '';

  if (base === 'users' && role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengubah data pengguna.' });
  }
  if (base === 'consultations' && role !== 'admin' && role !== 'dosen') {
    return res.status(403).json({ success: false, message: 'Mahasiswa tidak dapat mengubah riwayat konsultasi.' });
  }
  if (base === 'defense_schedules' && role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengubah jadwal defense.' });
  }
  if (req.method === 'DELETE' && ['users', 'students', 'lecturers', 'theses'].includes(base) && role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Hanya admin yang dapat menghapus data ini.' });
  }
  next();
};

// Jangan pernah mengirim password_hash ke klien (db.json dilayani apa adanya oleh JSON Server)
const stripPasswordHash = (req, res, next) => {
  const scrub = (v) => {
    if (Array.isArray(v)) return v.map(scrub);
    if (v && typeof v === 'object') {
      const o = { ...v };
      delete o.password_hash;
      for (const k of Object.keys(o)) o[k] = scrub(o[k]);
      return o;
    }
    return v;
  };
  // JSON Server merender data lewat res.jsonp, bukan res.json
  const origJson = res.json.bind(res);
  const origJsonp = res.jsonp.bind(res);
  res.json = (body) => origJson(scrub(body));
  res.jsonp = (body) => origJsonp(scrub(body));
  next();
};

router.use(middlewares);
router.use(stripPasswordHash);
router.use(guardWrite);
router.use(apiRouter);

module.exports = router;
