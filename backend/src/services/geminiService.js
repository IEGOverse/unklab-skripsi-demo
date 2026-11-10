/**
 * Service Gemini API
 * 
 * Menggunakan Google Generative AI untuk menganalisis topik skripsi
 * dan menghasilkan rekomendasi bidang keahlian.
 * 
 * API Key disimpan di .env backend dan TIDAK pernah diekspose ke frontend.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;

/**
 * Menganalisis judul dan abstrak skripsi menggunakan Gemini API
 * @param {string} judul - Judul skripsi
 * @param {string} abstrak - Abstrak skripsi
 * @returns {Promise<Object>} Hasil analisis: topik, bidang, keahlian_dibutuhkan
 */
async function analyzeTopic(judul, abstrak) {
  if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
    // Fallback jika API key tidak dikonfigurasi
    return getFallbackAnalysis(judul, abstrak);
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Analisis skripsi berikut dan berikan hasil dalam format JSON yang valid (tanpa markdown code block):

Judul: ${judul}
Abstrak: ${abstrak}

Berikan output JSON dengan struktur:
{
  "topik": "Topik utama skripsi dalam 1-2 kalimat",
  "bidang": "Bidang ilmu yang relevan (contoh: Sistem Informasi, Data Mining, Jaringan Komputer, dll)",
  "keahlian_dibutuhkan": ["keahlian 1", "keahlian 2", "keahlian 3"],
  "alasan": "Alasan singkat mengapa bidang ini relevan dengan judul dan abstrak"
}

Pastikan output adalah JSON murni tanpa teks tambahan.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Coba parse JSON dari respons
    try {
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanText);
    } catch (parseErr) {
      // Jika gagal parse, coba ekstrak dengan regex
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Gagal memparsing respons Gemini');
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    return getFallbackAnalysis(judul, abstrak);
  }
}

/**
 * Analisis fallback ketika Gemini API tidak tersedia
 */
function getFallbackAnalysis(judul, abstrak) {
  const judulLower = judul.toLowerCase();
  const abstrakLower = abstrak.toLowerCase();

  let bidang = 'Sistem Informasi';
  let keahlian = ['Sistem Informasi', 'Pengembangan Sistem', 'Analisis Sistem'];
  let topik = `Analisis topik berdasarkan judul: ${judul}`;

  if (judulLower.includes('data mining') || abstrakLower.includes('naive bayes') || abstrakLower.includes('klasifikasi')) {
    bidang = 'Data Mining';
    keahlian = ['Data Mining', 'Machine Learning', 'Analisis Data'];
    topik = 'Analisis data dan klasifikasi menggunakan teknik data mining';
  } else if (judulLower.includes('jaringan') || abstrakLower.includes('jaringan komputer')) {
    bidang = 'Jaringan Komputer';
    keahlian = ['Jaringan Komputer', 'Keamanan Jaringan', 'Protokol Jaringan'];
    topik = 'Analisis jaringan komputer dan keamanan jaringan';
  } else if (judulLower.includes('sistem informasi') || abstrakLower.includes('sistem informasi')) {
    bidang = 'Sistem Informasi';
    keahlian = ['Sistem Informasi', 'Pengembangan Sistem', 'Analisis Sistem'];
    topik = 'Analisis dan pengembangan sistem informasi';
  }

  return {
    topik,
    bidang,
    keahlian_dibutuhkan: keahlian,
    alasan: 'Analisis menggunakan mode fallback (Gemini API tidak tersedia). Bidang ditentukan berdasarkan kata kunci pada judul dan abstrak.'
  };
}

module.exports = { analyzeTopic };
