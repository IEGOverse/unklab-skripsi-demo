const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { checkConflict, createSchedule, listSchedules } = require('../controllers/scheduleController');

/**
 * GET /api/schedules/check-conflict
 * Cek bentrok jadwal
 */
router.get('/check-conflict', authenticate, checkConflict);

/**
 * POST /api/schedules
 * Buat jadwal baru (hanya admin)
 */
router.post('/', authenticate, authorize('admin'), createSchedule);

/**
 * GET /api/schedules
 * Lihat semua jadwal
 */
router.get('/', authenticate, listSchedules);

module.exports = router;
