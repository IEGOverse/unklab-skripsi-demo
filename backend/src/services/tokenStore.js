/**
 * Token store in-memory (untuk demo, bukan production).
 * Token acak diterbitkan saat login; authenticate memvalidasi token ini.
 * Token hilang saat backend restart — pengguna cukup login ulang.
 */
const crypto = require('crypto');

const tokens = new Map();

function issue(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, userId);
  return token;
}

function resolve(token) {
  return tokens.has(token) ? tokens.get(token) : null;
}

function revoke(token) {
  tokens.delete(token);
}

module.exports = { issue, resolve, revoke };
