const express = require('express');
const jsonServer = require('json-server');
const router = express.Router();
const path = require('path');
const fs = require('fs');

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
  const parts = req.path.split('/').filter(Boolean);
  const base = parts[0] || '';

  // ===== Aturan khusus skripsi (alur: Mahasiswa ajukan → Dosen terima → Admin final) =====
  if (base === 'theses') {
    if (role === 'admin' || role === 'dosen') return next(); // Dosen: terima/tolak; Admin: penuh
    if (role === 'mahasiswa') {
      let db;
      try { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch (e) { return res.status(500).json({ success: false, message: 'Gagal membaca database.' }); }
      const me = (db.students || []).find(s => String(s.user_id) === String(req.user.id));

      // POST: mahasiswa hanya boleh mengajukan, status dikunci 'diajukan', pemilik dikunci
      if (req.method === 'POST') {
        if (!me) return res.status(403).json({ success: false, message: 'Akun Anda tidak terhubung ke data mahasiswa.' });
        req.body = { ...req.body, student_id: me.id, status: 'diajukan', created_at: req.body.created_at || new Date().toISOString() };
        return next();
      }
      // PUT/PATCH: hanya milik sendiri, hanya selagi 'diajukan', dan status/pemilik tidak boleh diubah
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const id = Number(parts[1]);
        const thesis = (db.theses || []).find(t => Number(t.id) === id);
        if (!thesis) return res.status(404).json({ success: false, message: 'Skripsi tidak ditemukan.' });
        const isOwn = me && Number(thesis.student_id) === Number(me.id);
        const stillDiajukan = thesis.status === 'diajukan';
        const notChangingStatus = !req.body.status || req.body.status === thesis.status;
        const notChangingOwner = !req.body.student_id || Number(req.body.student_id) === Number(thesis.student_id);
        if (isOwn && stillDiajukan && notChangingStatus && notChangingOwner) return next();
        return res.status(403).json({ success: false, message: 'Skripsi hanya dapat diedit oleh mahasiswa selagi berstatus diajukan; setelah itu hanya dosen/admin yang dapat mengubah.' });
      }
      return res.status(403).json({ success: false, message: 'Mahasiswa tidak dapat menghapus atau mengubah status skripsi.' });
    }
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

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

// Mahasiswa hanya boleh membaca skripsi miliknya (server-side scoping, bukan sekadar UI)
const scopeThesesRead = (req, res, next) => {
  if (req.method !== 'GET') return next();
  const parts = req.path.split('/').filter(Boolean);
  if (parts[0] !== 'theses') return next(); // hanya /theses & /theses/:id
  const role = req.user?.role;
  if (role !== 'mahasiswa') return next();
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const me = (db.students || []).find(s => String(s.user_id) === String(req.user.id));
    const mine = me ? (db.theses || []).filter(t => Number(t.student_id) === Number(me.id)) : [];
    if (parts.length === 1) return res.jsonp(mine);
    const id = Number(parts[1]);
    const found = mine.find(t => Number(t.id) === id);
    return found ? res.jsonp(found) : res.status(404).json({ success: false, message: 'Skripsi tidak ditemukan / bukan milik Anda.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Gagal membaca database.' });
  }
};

router.use(middlewares);
router.use(stripPasswordHash);
router.use(scopeThesesRead);
router.use(guardWrite);
router.use(apiRouter);

module.exports = router;
