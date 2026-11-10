const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { analyze, recommend } = require('../controllers/aiController');

/**
 * POST /api/ai/analyze
 * Menganalisis topik skripsi (memerlukan autentikasi)
 */
router.post('/analyze', authenticate, analyze);

/**
 * GET /api/ai/recommend
 * Rekomendasi dosen berdasarkan bidang (memerlukan autentikasi)
 */
router.get('/recommend', authenticate, recommend);

module.exports = router;
