// Migrasi: tambah entitas workflow pengajuan skripsi UNKLAB + dynamic faculty rules.
// Idempoten: skip jika entitas sudah ada.
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

if (db.faculty_rules) {
  console.log('faculty_rules sudah ada, skip migrasi.');
  process.exit(0);
}

db.faculty_rules = [
  {
    id: 1,
    fakultas: 'FILKOM',
    min_sks: 144,
    min_ipk: 2.75,
    min_bimbingan: 8,
    max_turnitin_percentage: 20,
    jumlah_penguji: 2,
    seminar_hasil_enabled: false,
    komponen: [
      { key: 'penulisan', label: 'Penulisan', bobot: 30 },
      { key: 'presentasi', label: 'Presentasi', bobot: 30 },
      { key: 'demo', label: 'Demo Sistem', bobot: 40 },
    ],
    checklist_dokumen: ['Link Repository / Source Code', 'Video Demo Aplikasi'],
  },
  {
    id: 2,
    fakultas: 'FKEP',
    min_sks: 144,
    min_ipk: 2.75,
    min_bimbingan: 8,
    max_turnitin_percentage: 25,
    jumlah_penguji: 3,
    seminar_hasil_enabled: false,
    komponen: [
      { key: 'penulisan', label: 'Penulisan', bobot: 30 },
      { key: 'presentasi', label: 'Presentasi', bobot: 30 },
      { key: 'praktik', label: 'Praktik Lapangan', bobot: 40 },
    ],
    checklist_dokumen: ['Sertifikat Ethical Clearance'],
  },
  {
    id: 3,
    fakultas: 'FKIP',
    min_sks: 144,
    min_ipk: 2.75,
    min_bimbingan: 8,
    max_turnitin_percentage: 25,
    jumlah_penguji: 2,
    seminar_hasil_enabled: false,
    komponen: [
      { key: 'penulisan', label: 'Penulisan', bobot: 30 },
      { key: 'presentasi', label: 'Presentasi', bobot: 30 },
      { key: 'instrumen', label: 'Instrumen / Expert Judgment', bobot: 40 },
    ],
    checklist_dokumen: ['Lembar Validasi Instrumen (Expert Judgment)'],
  },
  {
    id: 4,
    fakultas: 'FAPERTA',
    min_sks: 144,
    min_ipk: 2.50,
    min_bimbingan: 8,
    max_turnitin_percentage: 25,
    jumlah_penguji: 2,
    seminar_hasil_enabled: true,
    komponen: [
      { key: 'penulisan', label: 'Penulisan', bobot: 30 },
      { key: 'presentasi', label: 'Presentasi', bobot: 30 },
      { key: 'seminar_hasil', label: 'Seminar Hasil', bobot: 40 },
    ],
    checklist_dokumen: [],
  },
];

db.workflow = [
  {
    id: 1,
    thesis_id: 1,
    fakultas: 'FILKOM',
    stage: 3, // 1..9
    status: 'berjalan', // berjalan | selesai | mengulang_sempro | mengulang_sidang
    eligible: true,
    eligibility: { siu: true, sks: true, ipk: true, metodologi: true },
    judul_pilihan: [
      'Sistem Informasi Manajemen Skripsi Berbasis Web',
      'Sistem Pendukung Keputusan Penjadwalan Sidang Skripsi Berbasis Web',
      'Aplikasi Manajemen Bimbingan Skripsi Berbasis Mobile',
    ],
    judul_final: 'Sistem Informasi Manajemen Skripsi Berbasis Web',
    similarity_score: 12,
    pembimbing_1_id: 1,
    pembimbing_2_id: 2,
    bimbingan_bab13_selesai: 0,
    draf_link: '',
    acc_sempro: false,
    sempro_tanggal: null,
    sempro_nilai: null,
    sempro_catatan: '',
    izin_syarat_link: '',
    izin_syarat_verified: false,
    seminar_hasil_done: false,
    turnitin_score: null,
    acc_sidang: false,
    bebas_pustaka: false,
    bebas_business_office: false,
    transkrip_lengkap: false,
    sidang_tanggal: null,
    nilai: {},
    nilai_akhir: null,
    nilai_huruf: null,
    revisi_final_link: '',
    lulus: false,
    selesai_at: null,
    carry_over: false,
    semester_baru: '',
  },
  {
    id: 2,
    thesis_id: 2,
    fakultas: 'FILKOM',
    stage: 1,
    status: 'berjalan',
    eligible: false,
    eligibility: { siu: true, sks: true, ipk: true, metodologi: false },
    judul_pilihan: ['Analisis Sentimen Media Sosial Menggunakan Metode Naive Bayes'],
    judul_final: null,
    similarity_score: null,
    pembimbing_1_id: null,
    pembimbing_2_id: null,
    bimbingan_bab13_selesai: 0,
    draf_link: '',
    acc_sempro: false,
    sempro_tanggal: null,
    sempro_nilai: null,
    sempro_catatan: '',
    izin_syarat_link: '',
    izin_syarat_verified: false,
    seminar_hasil_done: false,
    turnitin_score: null,
    acc_sidang: false,
    bebas_pustaka: false,
    bebas_business_office: false,
    transkrip_lengkap: false,
    sidang_tanggal: null,
    nilai: {},
    nilai_akhir: null,
    nilai_huruf: null,
    revisi_final_link: '',
    lulus: false,
    selesai_at: null,
    carry_over: false,
    semester_baru: '',
  },
];

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('OK: db.json kini berisi faculty_rules (%d) dan workflow (%d)', db.faculty_rules.length, db.workflow.length);
