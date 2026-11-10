import { useState } from 'react';
import { aiAnalyze, aiRecommend } from '../api/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Shield, Users } from 'lucide-react';

const AIRecommendasi = () => {
  const [judul, setJudul] = useState('');
  const [abstrak, setAbstrak] = useState('');
  const [result, setResult] = useState(null);
  const [rekomendasi, setRekomendasi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await aiAnalyze({ judul, abstrak });
      setResult(res.data.data);
    } catch (e) {
      setError('Gagal menganalisis topik: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRecommend = async () => {
    if (!result?.bidang) {
      setError('Silakan analisis topik terlebih dahulu.');
      return;
    }
    setLoading(true);
    try {
      const res = await aiRecommend({ bidang: result.bidang });
      setRekomendasi(res.data.data || []);
    } catch (e) {
      setError('Gagal mendapatkan rekomendasi: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">AI Rekomendasi Dosen</h1>
      </div>
      <p className="text-gray-600">Masukkan judul dan abstrak skripsi untuk mendapatkan analisis topik dan rekomendasi dosen pembimbing/penguji.</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <Input label="Judul Skripsi" value={judul} onChange={(e) => setJudul(e.target.value)} required />
          <Input label="Abstrak" value={abstrak} onChange={(e) => setAbstrak(e.target.value)} required className="min-h-[100px]" />
          <Button type="submit" disabled={loading} variant="primary">
            {loading ? 'Menganalisis...' : 'Analisis Topik'}
          </Button>
        </form>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded border border-red-100 text-sm">{error}</div>
      )}

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hasil Analisis AI</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-700 font-medium mb-1">Topik</p>
              <p className="text-gray-900">{result.topik}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm text-green-700 font-medium mb-1">Bidang</p>
              <p className="text-gray-900">{result.bidang}</p>
            </div>
          </div>
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Keahlian yang Dibutuhkan</p>
            <div className="flex flex-wrap gap-2">
              {(result.keahlian_dibutuhkan || []).map((k, i) => (
                <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{k}</span>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-600 italic">{result.alasan}</p>

          <Button onClick={handleRecommend} disabled={loading} variant="primary">
            {loading ? 'Mencari...' : 'Cari Rekomendasi Dosen'}
          </Button>
        </div>
      )}

      {rekomendasi.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <Users className="w-5 h-5 mr-2 inline" /> Dosen Direkomendasikan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rekomendasi.map((d) => (
              <div key={d.id} className="p-4 border border-gray-200 rounded-lg">
                <p className="font-semibold text-gray-900">{d.nama}</p>
                <p className="text-sm text-gray-600">{d.nip}</p>
                <p className="text-xs text-gray-500">{d.prodi}</p>
                <div className="mt-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Skor: {d.skor_kecocokan}</span>
                </div>
                <p className="mt-2 text-xs text-gray-600">Keahlian: {(d.keahlian || []).join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        Catatan: Data ini adalah data uji (dummy), bukan data resmi UNKLAB. Analisis AI menggunakan backend proxy (API key tidak terekspos di frontend).
      </div>
    </div>
  );
};

export default AIRecommendasi;
