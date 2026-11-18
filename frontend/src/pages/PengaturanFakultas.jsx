import { useState, useEffect } from 'react';
import { getFacultyRules, updateFacultyRule } from '../api/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { Building2, Save, Info, RotateCcw, Plus, Trash2 } from 'lucide-react';

// Default resmi (ubah sesuai Buku Pedoman UNKLAB bila berbeda)
const DEFAULT_SCALE = [
  { huruf: 'A', min: 85 },
  { huruf: 'A-', min: 80 },
  { huruf: 'B+', min: 75 },
  { huruf: 'B', min: 70 },
  { huruf: 'B-', min: 65 },
  { huruf: 'C+', min: 60 },
  { huruf: 'C', min: 55 },
  { huruf: 'D', min: 50 },
  { huruf: 'E', min: 0 },
];

const DEFAULT_RULES = {
  FILKOM: {
    min_sks: 144, min_ipk: 2.75, min_bimbingan: 8, max_turnitin_percentage: 20, jumlah_penguji: 2, seminar_hasil_enabled: false,
    komponen: [
      { key: 'penulisan', label: 'Penulisan', bobot: 30 },
      { key: 'presentasi', label: 'Presentasi', bobot: 30 },
      { key: 'demo', label: 'Demo Sistem', bobot: 40 },
    ],
    checklist_dokumen: ['Link Repository / Source Code', 'Video Demo Aplikasi'],
    grade_scale: DEFAULT_SCALE,
  },
  FKEP: {
    min_sks: 144, min_ipk: 2.75, min_bimbingan: 8, max_turnitin_percentage: 25, jumlah_penguji: 3, seminar_hasil_enabled: false,
    komponen: [
      { key: 'penulisan', label: 'Penulisan', bobot: 30 },
      { key: 'presentasi', label: 'Presentasi', bobot: 30 },
      { key: 'praktik', label: 'Praktik Lapangan', bobot: 40 },
    ],
    checklist_dokumen: ['Sertifikat Ethical Clearance'],
    grade_scale: DEFAULT_SCALE,
  },
  FKIP: {
    min_sks: 144, min_ipk: 2.75, min_bimbingan: 8, max_turnitin_percentage: 25, jumlah_penguji: 2, seminar_hasil_enabled: false,
    komponen: [
      { key: 'penulisan', label: 'Penulisan', bobot: 30 },
      { key: 'presentasi', label: 'Presentasi', bobot: 30 },
      { key: 'instrumen', label: 'Instrumen / Expert Judgment', bobot: 40 },
    ],
    checklist_dokumen: ['Lembar Validasi Instrumen (Expert Judgment)'],
    grade_scale: DEFAULT_SCALE,
  },
  FAPERTA: {
    min_sks: 144, min_ipk: 2.50, min_bimbingan: 8, max_turnitin_percentage: 25, jumlah_penguji: 2, seminar_hasil_enabled: true,
    komponen: [
      { key: 'penulisan', label: 'Penulisan', bobot: 30 },
      { key: 'presentasi', label: 'Presentasi', bobot: 30 },
      { key: 'seminar_hasil', label: 'Seminar Hasil', bobot: 40 },
    ],
    checklist_dokumen: [],
    grade_scale: DEFAULT_SCALE,
  },
};

const PengaturanFakultas = () => {
  const [rules, setRules] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const r = await getFacultyRules();
      const list = r.data?.data || r.data || [];
      setRules(list);
      if (list.length) {
        setSelectedId(list[0].id);
        setDraft(JSON.parse(JSON.stringify(list[0])));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const selectRule = (id) => {
    const r = rules.find(x => String(x.id) === String(id));
    if (r) {
      setSelectedId(id);
      setDraft(JSON.parse(JSON.stringify(r)));
      setMessage(null);
    }
  };

  const setKomponen = (idx, patch) => {
    const k = [...draft.komponen];
    k[idx] = { ...k[idx], ...patch };
    setDraft({ ...draft, komponen: k });
  };

  const setScaleRow = (idx, patch) => {
    const s = [...(draft.grade_scale || [])];
    s[idx] = { ...s[idx], ...patch };
    setDraft({ ...draft, grade_scale: s });
  };
  const addScaleRow = () => setDraft({ ...draft, grade_scale: [...(draft.grade_scale || []), { huruf: '', min: 0 }] });
  const removeScaleRow = (idx) => setDraft({ ...draft, grade_scale: (draft.grade_scale || []).filter((_, i) => i !== idx) });

  const totalBobot = draft?.komponen?.reduce((sum, k) => sum + (Number(k.bobot) || 0), 0) || 0;
  const scaleValid = draft?.grade_scale?.length > 0 && draft.grade_scale.every(s => s.huruf.trim() && Number(s.min) >= 0 && Number(s.min) <= 100);

  const handleSave = async () => {
    if (totalBobot !== 100) {
      setMessage({ type: 'error', text: `Total bobot komponen nilai harus 100% (saat ini ${totalBobot}%).` });
      return;
    }
    if (!scaleValid) {
      setMessage({ type: 'error', text: 'Skala mutu tidak valid: setiap baris wajib punya huruf dan nilai 0–100.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        fakultas: draft.fakultas,
        min_sks: Number(draft.min_sks),
        min_ipk: Number(draft.min_ipk),
        min_bimbingan: Number(draft.min_bimbingan),
        max_turnitin_percentage: Number(draft.max_turnitin_percentage),
        jumlah_penguji: Number(draft.jumlah_penguji),
        seminar_hasil_enabled: !!draft.seminar_hasil_enabled,
        komponen: draft.komponen.map(k => ({ key: k.key, label: k.label, bobot: Number(k.bobot) })),
        checklist_dokumen: (draft.checklistText || '').split('\n').map(s => s.trim()).filter(Boolean),
        grade_scale: [...draft.grade_scale].sort((a, b) => Number(b.min) - Number(a.min)),
      };
      delete payload.checklistText;
      await updateFacultyRule(draft.id, payload);
      setMessage({ type: 'success', text: 'Pengaturan fakultas berhasil disimpan.' });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan: ' + (e.response?.data?.message || e.message) });
    } finally { setSaving(false); }
  };

  // sinkronkan checklistText saat memilih rule
  useEffect(() => {
    if (draft && draft.checklistText === undefined) {
      setDraft(d => ({ ...d, checklistText: (d.checklist_dokumen || []).join('\n') }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleReset = async () => {
    const def = DEFAULT_RULES[draft?.fakultas];
    if (!def) { setMessage({ type: 'error', text: 'Fakultas tidak dikenali di template default.' }); return; }
    if (!confirm(`Kembalikan seluruh pengaturan ${draft.fakultas} ke nilai default? Perubahan Anda akan hilang.`)) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateFacultyRule(draft.id, { fakultas: draft.fakultas, ...def });
      setMessage({ type: 'success', text: `Pengaturan ${draft.fakultas} dikembalikan ke default.` });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal reset: ' + (e.response?.data?.message || e.message) });
    } finally { setSaving(false); }
  };

  if (loading || !draft) {
    return <div className="p-10 text-center text-gray-500">Memuat pengaturan fakultas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Pengaturan Fakultas</h1>
          <p className="text-gray-600">Dynamic Faculty Rules — alur & syarat menyesuaikan per fakultas tanpa mengubah kode</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <Select
            label="Pilih Fakultas"
            value={selectedId}
            onChange={(e) => selectRule(e.target.value)}
            options={rules.map(r => ({ value: r.id, label: r.fakultas }))}
          />
        </div>
        <Button variant="secondary" onClick={handleReset} disabled={saving}>
          <RotateCcw className="w-4 h-4 mr-2" /> Reset ke Default
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batas akademik & plagiasi */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
          <h3 className="font-bold font-display text-slate-900 mb-4">Batas Akademik & Plagiasi</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Min. SKS" type="number" value={draft.min_sks} onChange={(e) => setDraft({ ...draft, min_sks: e.target.value })} />
            <Input label="Min. IPK" type="number" step="0.01" value={draft.min_ipk} onChange={(e) => setDraft({ ...draft, min_ipk: e.target.value })} />
            <Input label="Min. Jumlah Bimbingan" type="number" value={draft.min_bimbingan} onChange={(e) => setDraft({ ...draft, min_bimbingan: e.target.value })} />
            <Input label="Max. Turnitin (%)" type="number" value={draft.max_turnitin_percentage} onChange={(e) => setDraft({ ...draft, max_turnitin_percentage: e.target.value })} />
            <Select label="Jumlah Penguji Sidang" value={draft.jumlah_penguji} onChange={(e) => setDraft({ ...draft, jumlah_penguji: e.target.value })} options={[{ value: 2, label: '2 orang' }, { value: 3, label: '3 orang' }]} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
            <input type="checkbox" checked={!!draft.seminar_hasil_enabled} onChange={(e) => setDraft({ ...draft, seminar_hasil_enabled: e.target.checked })} className="w-4 h-4 accent-blue-600" />
            Aktifkan tahap "Seminar Hasil" (khusus FAPERTA)
          </label>
        </div>

        {/* Komponen penilaian */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold font-display text-slate-900">Komponen Penilaian Sidang</h3>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${totalBobot === 100 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>Total: {totalBobot}%</span>
          </div>
          <div className="space-y-3">
            {draft.komponen.map((k, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input label={`Komponen ${idx + 1}`} value={k.label} onChange={(e) => setKomponen(idx, { label: e.target.value })} />
                </div>
                <div className="w-24">
                  <Input label="Bobot %" type="number" value={k.bobot} onChange={(e) => setKomponen(idx, { bobot: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Nilai akhir dihitung otomatis dari bobot ini dan dikonversi ke skala mutu di bawah.</p>
        </div>
      </div>

      {/* Skala mutu */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold font-display text-slate-900">Skala Mutu Skripsi</h3>
            <p className="text-xs text-gray-500">Batas bawah nilai untuk tiap huruf. Sesuaikan dengan Buku Pedoman UNKLAB bila berbeda.</p>
          </div>
          <Button variant="secondary" onClick={addScaleRow}><Plus className="w-4 h-4 mr-1" /> Tambah Huruf</Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {(draft.grade_scale || []).map((s, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <input
                  value={s.huruf}
                  onChange={(e) => setScaleRow(idx, { huruf: e.target.value })}
                  className="w-16 px-2 py-1.5 text-lg font-bold font-display text-slate-900 border border-slate-200 rounded-lg text-center"
                  placeholder="A"
                />
                <button onClick={() => removeScaleRow(idx)} className="text-rose-500 hover:text-rose-700 p-1" aria-label="Hapus baris"><Trash2 className="w-4 h-4" /></button>
              </div>
              <label className="block text-[10px] uppercase tracking-wide text-slate-500 mt-2">Min. nilai</label>
              <input
                type="number"
                value={s.min}
                onChange={(e) => setScaleRow(idx, { min: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Checklist dokumen dinamis */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
        <h3 className="font-bold font-display text-slate-900 mb-2">Checklist Dokumen Dinamis</h3>
        <p className="text-xs text-gray-500 mb-3">Satu dokumen per baris. Dokumen ini wajib diunggah di tahap "Penelitian & Syarat Khusus".</p>
        <textarea
          rows={Math.max(2, (draft.checklist_dokumen || []).length)}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none font-mono text-sm"
          value={draft.checklistText ?? (draft.checklist_dokumen || []).join('\n')}
          onChange={(e) => setDraft({ ...draft, checklistText: e.target.value, checklist_dokumen: e.target.value.split('\n') })}
          placeholder={'Contoh FILKOM:\nLink Repository / Source Code\nVideo Demo Aplikasi'}
        />
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>{message.text}</div>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={load} variant="secondary">Muat Ulang</Button>
        <Button onClick={handleSave} disabled={saving} variant="primary">
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>

      <div className="text-xs text-gray-500">
        <Info className="w-4 h-4 inline mr-1" />
        Dynamic Faculty Rules berlaku tanpa mengubah kode. "Reset ke Default" mengembalikan satu fakultas ke template (FILKOM/FKEP/FKIP/FAPERTA).
      </div>
    </div>
  );
};

export default PengaturanFakultas;
