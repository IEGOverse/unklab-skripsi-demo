/**
 * Middleware Autentikasi dan Role-Based Access Control
 * 
 * Catatan: Ini adalah simulasi untuk database sementara (JSON Server).
 * Token disimpan di localStorage frontend dan dikirim melalui header Authorization.
 * Untuk production, gunakan JWT yang sebenarnya dengan verifikasi signature.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../db.json');

/**
 * Mendapatkan data user dari db.json berdasarkan username
 */
const { resolve } = require('../services/tokenStore');

/**
 * Mendapatkan data user dari db.json berdasarkan id
 */
function getUserById(id) {
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    return data.users.find(u => u.id === id);
  } catch (err) {
    return null;
  }
}

/**
 * Middleware: verifikasi token hasil login
 * Header format: Authorization: Bearer <token acak dari /api/login>
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token akses tidak ditemukan. Silakan login terlebih dahulu.'
    });
  }

  const token = authHeader.split(' ')[1];

  // Token acak diterbitkan oleh /api/login, disimpan di token store in-memory
  const userId = resolve(token);
  const user = userId != null ? getUserById(userId) : null;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Sesi tidak valid atau sudah berakhir. Silakan login ulang.'
    });
  }

  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  next();
}

/**
 * Middleware: batasi akses berdasarkan role
 * @param {...string} roles - role yang diizinkan
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Role '${req.user.role}' tidak diizinkan mengakses endpoint ini.`
      });
    }

    next();
  };
}

module.exports = { authenticate, authorize, getUserById };
