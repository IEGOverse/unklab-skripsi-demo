const { analyzeTopic } = require('../services/geminiService');

/**
 * POST /api/ai/analyze
 * Menganalisis judul dan abstrak skripsi menggunakan Gemini API
 * Body: { judul, abstrak }
 */
async function analyze(req, res) {
  try {
    const { judul, abstrak } = req.body;

    if (!judul || !abstrak) {
      return res.status(400).json({
        success: false,
        message: 'Judul dan abstrak harus diisi.'
      });
    }

    const result = await analyzeTopic(judul, abstrak);

    res.json({
      success: true,
      data: result,
      message: 'Analisis topik selesai'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal menganalisis topik'
    });
  }
}

/**
 * GET /api/ai/recommend
 * Rekomendasi dosen berdasarkan bidang keahlian (cocokkan dengan lecturer_expertise)
 * Query: ?bidang=Sistem Informasi
 */
async function recommend(req, res) {
  try {
    const { bidang } = req.query;

    if (!bidang) {
      return res.status(400).json({
        success: false,
        message: 'Parameter bidang diperlukan.'
      });
    }

    // Baca data dari db.json
    const fs = require('fs');
    const path = require('path');
    const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../db.json');
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    const expertise = data.lecturer_expertise.filter(e =>
      e.bidang_keahlian.toLowerCase().includes(bidang.toLowerCase())
    );

    const lecturerIds = [...new Set(expertise.map(e => e.lecturer_id))];
    const lecturers = data.lecturers.filter(l => lecturerIds.includes(l.id));

    // Tambahkan skor kecocokan
    const rekomendasi = lecturers.map(lecturer => {
      const matchCount = expertise.filter(e => e.lecturer_id === lecturer.id).length;
      return {
        ...lecturer,
        skor_kecocokan: matchCount,
        keahlian: expertise.filter(e => e.lecturer_id === lecturer.id).map(e => e.bidang_keahlian)
      };
    }).sort((a, b) => b.skor_kecocokan - a.skor_kecocokan);

    res.json({
      success: true,
      data: rekomendasi,
      message: `Ditemukan ${rekomendasi.length} dosen dengan keahlian ${bidang}`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal mendapatkan rekomendasi dosen'
    });
  }
}

module.exports = { analyze, recommend };
