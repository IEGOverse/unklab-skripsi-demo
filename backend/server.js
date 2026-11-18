require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const aiRoutes = require('./src/routes/aiRoutes');
const scheduleRoutes = require('./src/routes/schedules');
const proxyRoutes = require('./src/routes/proxyRoutes');
const tokenStore = require('./src/services/tokenStore');
const crypto = require('crypto');
const { authenticate, authorize } = require('./src/middleware/auth');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db.json');

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Data API harus selalu segar: matikan etag + paksa no-store saat response dikirim
// (json-server meng-set Cache-Control sendiri setelah middleware biasa — jadi kita
//  set header di dalam pembungkus res.json/jsonp/send)
app.disable('etag');
app.use('/api', (req, res, next) => {
  const setHdr = () => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  };
  const origJson = res.json.bind(res);
  const origJsonp = res.jsonp.bind(res);
  const origSend = res.send.bind(res);
  res.json = (body) => { setHdr(); return origJson(body); };
  res.jsonp = (body) => { setHdr(); return origJsonp(body); };
  res.send = (body) => { setHdr(); return origSend(body); };
  next();
});

// Route AI (proxy Gemini API)
app.use('/api/ai', aiRoutes);

// Route Jadwal Defense
app.use('/api/schedules', scheduleRoutes);

// Route Login simulasi (tidak perlu auth middleware)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const user = data.users.find(u => u.username === username);

    // Verifikasi password dengan SHA-256 (demo-level; produksi gunakan bcrypt/argon2)
    const hash = crypto.createHash('sha256').update(String(password || '')).digest('hex');

    if (!user || user.password_hash !== hash) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.'
      });
    }

    const token = tokenStore.issue(user.id);

    res.json({
      success: true,
      token, // Token acak; disimpan di server (in-memory), bukan username
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      message: 'Login berhasil.'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal memproses login.'
    });
  }
});

// Health check (sebelum middleware auth agar publik)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Skripsi Management UNKLAB berjalan' });
});

// Serve frontend build (untuk demo satu-port, mis. via tunnel)
const FRONTEND_DIST = process.env.FRONTEND_DIST || path.join(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Route Proxy ke JSON Server (dengan auth middleware untuk endpoint yang dilindungi)
app.use('/api', authenticate, proxyRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Backend berjalan di http://localhost:${PORT}`);
  console.log(`📁 JSON Server database: ${DB_PATH}`);
});

module.exports = app;
