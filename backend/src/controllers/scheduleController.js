const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../db.json');

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

/**
 * GET /api/schedules/check-conflict
 * Cek bentrok jadwal dosen atau ruangan
 * Query: tanggal, waktu, dosen_penguji_1_id, dosen_penguji_2_id, ruangan
 */
function checkConflict(req, res) {
  try {
    const { tanggal, waktu, dosen_penguji_1_id, dosen_penguji_2_id, ruangan, excludeId } = req.query;

    if (!tanggal || !waktu) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal dan waktu diperlukan untuk cek bentrok.'
      });
    }

    const data = readDb();
    const schedules = data.defense_schedules || [];

    const conflicts = schedules.filter(s => {
      if (excludeId && s.id == excludeId) return false;
      if (s.tanggal !== tanggal || s.waktu !== waktu) return false;

      // Bentrok dosen penguji 1
      if (dosen_penguji_1_id && s.dosen_penguji_1_id == dosen_penguji_1_id) return true;
      // Bentrok dosen penguji 2
      if (dosen_penguji_2_id && s.dosen_penguji_2_id == dosen_penguji_2_id) return true;
      // Bentrok ruangan
      if (ruangan && s.ruangan == ruangan) return true;

      return false;
    });

    res.json({
      success: true,
      hasConflict: conflicts.length > 0,
      conflicts,
      message: conflicts.length > 0
        ? 'Terdapat bentrok jadwal. Silakan pilih tanggal/waktu/ruangan lain.'
        : 'Jadwal tersedia, tidak ada bentrok.'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal memeriksa bentrok jadwal'
    });
  }
}

/**
 * POST /api/schedules
 * Buat jadwal defense baru (hanya admin)
 * Body: { defense_request_id, tanggal, waktu, ruangan, dosen_penguji_1_id, dosen_penguji_2_id }
 */
function createSchedule(req, res) {
  try {
    const {
      defense_request_id,
      tanggal,
      waktu,
      ruangan,
      dosen_penguji_1_id,
      dosen_penguji_2_id
    } = req.body;

    if (!defense_request_id || !tanggal || !waktu || !ruangan || !dosen_penguji_1_id || !dosen_penguji_2_id) {
      return res.status(400).json({
        success: false,
        message: 'Semua field jadwal harus diisi.'
      });
    }

    const data = readDb();

    // Cek bentrok sebelum menyimpan
    const existing = data.defense_schedules || [];
    const conflict = existing.find(s =>
      s.tanggal === tanggal &&
      s.waktu === waktu &&
      (s.dosen_penguji_1_id == dosen_penguji_1_id ||
        s.dosen_penguji_2_id == dosen_penguji_2_id ||
        s.ruangan == ruangan)
    );

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'Bentrok jadwal: dosen penguji atau ruangan sudah terpakai pada tanggal dan waktu tersebut.'
      });
    }

    const newSchedule = {
      id: existing.length > 0 ? Math.max(...existing.map(s => s.id)) + 1 : 1,
      defense_request_id: parseInt(defense_request_id),
      tanggal,
      waktu,
      ruangan,
      dosen_penguji_1_id: parseInt(dosen_penguji_1_id),
      dosen_penguji_2_id: parseInt(dosen_penguji_2_id),
      status: 'terjadwal',
      created_at: new Date().toISOString()
    };

    data.defense_schedules.push(newSchedule);
    writeDb(data);

    res.status(201).json({
      success: true,
      data: newSchedule,
      message: 'Jadwal defense berhasil dibuat.'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal membuat jadwal defense'
    });
  }
}

/**
 * GET /api/schedules
 * Lihat semua jadwal defense
 */
function listSchedules(req, res) {
  try {
    const data = readDb();
    const schedules = data.defense_schedules || [];

    // Join dengan data terkait untuk informasi lebih lengkap
    const requests = data.defense_requests || [];
    const lecturers = data.lecturers || [];

    const result = schedules.map(s => {
      const request = requests.find(r => r.id == s.defense_request_id);
      const penguji1 = lecturers.find(l => l.id == s.dosen_penguji_1_id);
      const penguji2 = lecturers.find(l => l.id == s.dosen_penguji_2_id);

      return {
        ...s,
        thesis_title: request ? (data.theses || []).find(t => t.id == request.thesis_id)?.judul : null,
        student_name: request ? (data.students || []).find(st => st.id == request.student_id)?.nama : null,
        dosen_penguji_1_nama: penguji1 ? penguji1.nama : null,
        dosen_penguji_2_nama: penguji2 ? penguji2.nama : null
      };
    });

    res.json({
      success: true,
      data: result,
      message: 'Daftar jadwal defense berhasil dimuat.'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal memuat jadwal defense'
    });
  }
}

module.exports = { checkConflict, createSchedule, listSchedules };
