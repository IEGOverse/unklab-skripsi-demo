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

    // Pencocokan berbasis token: bidang dari AI bisa berupa frasa panjang
    // ("Keamanan Jaringan dan Kecerdasan Buatan") — string utuh tidak akan cocok.
    const STOP = new Set(['dan', 'yang', 'untuk', 'dengan', 'of', 'the', 'and', 'di', 'ke', 'pada', 'berbasis', 'menggunakan']);
    const tokenize = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2 && !STOP.has(t));
    const bidangTokens = new Set(tokenize(bidang));

    const scored = data.lecturer_expertise.map(e => {
      const eTokens = tokenize(e.bidang_keahlian);
      const overlap = eTokens.filter(t => bidangTokens.has(t)).length;
      // juga hitung jika frasa keahlian terkandung utuh di dalam bidang
      const phrase = bidang.toLowerCase().includes(e.bidang_keahlian.toLowerCase()) ? eTokens.length : 0;
      return { e, overlap: Math.max(overlap, phrase) };
    }).filter(x => x.overlap > 0);

    const lecturerIds = [...new Set(scored.map(x => x.e.lecturer_id))];
    const lecturers = data.lecturers.filter(l => lecturerIds.includes(l.id));

    // Tambahkan skor kecocokan
    const rekomendasi = lecturers.map(lecturer => {
      const mine = scored.filter(x => x.e.lecturer_id === lecturer.id);
      return {
        ...lecturer,
        skor_kecocokan: mine.reduce((a, x) => a + x.overlap, 0),
        keahlian: mine.map(x => x.e.bidang_keahlian)
      };
    }).sort((a, b) => b.skor_kecocokan - a.skor_kecocokan);

    if (rekomendasi.length === 0) {
      // Cadangan: tidak ada ahli spesifik — tampilkan semua dosen dengan skor 0
      const semua = data.lecturers.map(lecturer => ({
        ...lecturer,
        skor_kecocokan: 0,
        keahlian: [],
      }));
      return res.json({
        success: true,
        data: semua,
        message: `Tidak ada dosen dengan keahlian spesifik untuk "${bidang}" — menampilkan semua dosen.`
      });
    }

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
