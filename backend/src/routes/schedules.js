const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { checkConflict, createSchedule, listSchedules } = require('../controllers/scheduleController');
const { decideOnProposal } = require('../controllers/proposalDecisionController');

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
 * POST /api/schedules/proposal-decision
 * Dosen menerima/menolak usulan jadwal dari admin (karena slot semula bentrok)
 */
router.post('/proposal-decision', authenticate, authorize('dosen'), decideOnProposal);

/**
 * GET /api/schedules
 * Lihat semua jadwal
 */
router.get('/', authenticate, listSchedules);

module.exports = router;
