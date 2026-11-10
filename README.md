# Sistem Informasi Manajemen Skripsi UNKLAB

Aplikasi web full-stack untuk manajemen skripsi: pengajuan judul, bimbingan konsultasi, analisis topik dengan AI, rekomendasi dosen pembimbing, dan penjadwalan sidang defense.

> **Catatan Penting:** Seluruh data di `backend/db.json` adalah **DATA UJI (DUMMY)**, bukan data resmi Universitas Klabat (UNKLAB). Semua nama, NIP/NPM, email, nomor telepon, dan judul skripsi pada aplikasi ini fiktif dan hanya untuk keperluan demo/pengujian.

## Teknologi

**Frontend** (`frontend/`)
- React 18 + Vite
- Tailwind CSS (tema navy/white/blue)
- React Router DOM, Axios, Lucide React

**Backend** (`backend/`)
- Node.js + Express
- JSON Server sebagai database sementara (file `db.json`)
- Gemini API (via backend proxy — API key **tidak pernah** terekspos ke frontend)
- Simulasi autentikasi (token = username) + role-based access control

## Cara Menjalankan

### Prasyarat
- Node.js 18+ dan npm

### 1. Backend (port 5000)

```bash
cd backend
npm install
node server.js
```

Backend berjalan di `http://localhost:5000`. Endpoint utama:

- `GET/POST/PUT/DELETE /api/<entitas>` — JSON Server (terproteksi auth): `users`, `students`, `lecturers`, `lecturer_expertise`, `theses`, `consultations`, `defense_requests`, `defense_schedules`, `lecturer_availability`
- `POST /api/login` — login demo
- `POST /api/ai/analyze` — analisis topik (Gemini / fallback keyword)
- `GET /api/ai/recommend?bidang=...` — rekomendasi dosen berbasis `lecturer_expertise`
- `GET /api/schedules`, `POST /api/schedules` — jadwal defense dengan **cek bentrok** (dosen & ruangan)
- `GET /api/schedules/check-conflict` — pratinjau cek bentrok
- `GET /api/health` — health check

#### Konfigurasi Gemini API (opsional)

Salin `backend/.env.example` menjadi `backend/.env` (atau edit `backend/.env`):

```env
PORT=5000
GEMINI_API_KEY=isi_api_key_anda
```

Jika `GEMINI_API_KEY` kosong/placeholder, backend otomatis memakai **mode fallback** (analisis berbasis kata kunci) dan aplikasi tetap berfungsi penuh untuk demo — hasil analisis akan diberi label "Analisis menggunakan mode fallback".

### 2. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173`.

Build produksi: `npm run build` (hasil di `frontend/dist/`).

### 3. Akses online sementara (tunnel, khusus demo)

Untuk demo online dari komputer yang sama, aplikasi juga bisa disajikan lewat satu port (`5000`, backend melayani build frontend) dan diekspos melalui tunnel publik, misalnya:

```bash
cd backend && npm run build   # (frontend: npm run build)
# jalankan backend (node server.js)
npx localtunnel --port 5000
```

Catatan localtunnel: pengunjung pertama kali melihat halaman "Friendly Reminder" dan diminta **Tunnel Password**, yaitu IP publik komputer pembuat tunnel (cek di whatismyip.com atau `curl ifconfig.me`). URL **berubah setiap kali tunnel di-restart**, dan tunnel hanya hidup selama prosesnya berjalan.

## Akun Demo

Password **berbeda per role** dan diverifikasi oleh backend (SHA-256). Password diberikan secara terpisah oleh presenter (tidak tertulis di sini). Setelah backend restart, semua sesi berakhir dan pengguna harus login ulang.

Untuk mengatur ulang password demo, edit konstanta `PASSWORDS` di `backend/scripts/set-demo-passwords.js` lalu jalankan:

```bash
cd backend && node scripts/set-demo-passwords.js
```

| Username  | Role      | Akses                                          |
|-----------|-----------|------------------------------------------------|
| `admin`   | Admin     | Semua halaman + kelola mahasiswa/dosen/skripsi/jadwal |
| `dosen_a` | Dosen     | Keahlian Dosen, Konsultasi, Jadwal Defense (lihat), Profil |
| `dosen_b` | Dosen     | Keahlian Dosen, Konsultasi, Jadwal Defense (lihat), Profil |
| `mhs_001` | Mahasiswa | Skripsi Saya, Pengajuan Defense, AI Rekomendasi, Konsultasi Saya, Profil |
| `mhs_002` | Mahasiswa | Skripsi Saya, Pengajuan Defense, AI Rekomendasi, Konsultasi Saya, Profil |

Catatan keamanan demo: respons API tidak pernah mengirim `password_hash`; password tersimpan sebagai hash SHA-256 di `db.json`.

## Fitur per Role

**Admin**
- Dashboard statistik (jumlah pengguna, mahasiswa, dosen, skripsi, pengajuan)
- CRUD Data Mahasiswa, Data Dosen (buat akun user + biodata sekaligus), Keahlian Dosen, Data Skripsi
- Riwayat Konsultasi (CRUD, pencarian, filter status, halaman Detail)
- Penjadwalan Defense: tetapkan jadwal sidang dengan dropdown pengajuan & penguji; **sistem menolak bentrok** dosen/ruangan pada tanggal & waktu yang sama

**Dosen**
- Kelola Keahlian Dosen, lihat/kelola Riwayat Konsultasi, lihat Jadwal Defense (read-only), Profil

**Mahasiswa**
- Skripsi Saya, Pengajuan Defense (self-scoped: hanya data milik sendiri, tombol "Isi Topik & Bidang dengan AI")
- AI Rekomendasi Dosen: analisis topik + rekomendasi dosen berbasis kecocokan keahlian
- Konsultasi Saya, Profil

**Kontrol akses** diterapkan di frontend (route guard per role, redirect ke `/`) **dan** di backend (middleware `authenticate` untuk semua `/api`, `authorize('admin')` untuk `POST /api/schedules`, guard tulis `/users` & `/defense_schedules` dan DELETE entitas master khusus admin).

## Struktur Folder

```
frontend/src/
  api/api.js              # axios instance + semua endpoint
  components/common/      # Button, Input, Select, Modal, Table
  components/layout/      # Sidebar, Navbar
  context/AuthContext.jsx # state login (localStorage)
  pages/                  # 12 halaman
backend/
  server.js               # entry point (port 5000)
  db.json                 # database sementara (DATA UJI)
  src/controllers/        # aiController, scheduleController
  src/middleware/         # auth (simulasi), errorHandler
  src/routes/             # aiRoutes, schedules, proxyRoutes (JSON Server + guard)
  src/services/geminiService.js  # Gemini + fallback keyword
```

## Keterbatasan (Demo)

1. **Autentikasi demo** — password diverifikasi (SHA-256) dan token acak disimpan di memori server; namun ini tidak setara keamanan produksi (tidak ada bcrypt/argon2, rate-limiting, atau JWT). Jangan dipakai di production.
2. **JSON Server** — database berbasis file; tidak ada transaksi/konkurensi; cocok untuk demo, bukan untuk produksi.
3. **Role guard backend** bersifat minimal (autentikasi + beberapa aturan tulis). Granularitas penuh (mis. dosen hanya boleh mengubah keahliannya sendiri) belum di-enforce di server.
4. **Data bersifat dummy** — bukan data resmi UNKLAB; seluruh identitas di aplikasi ini fiktif.
5. **Gemini API key** opsional; tanpa key aplikasi memakai mode fallback keyword.

## Troubleshooting

- **Port 5000/5173 sudah dipakai** — hentikan proses yang memakainya, atau ubah `PORT` di `backend/.env` dan `VITE_API_URL` di frontend.
- **401 di semua request** — token hilang/expired; login ulang.
- **"Bentrok jadwal" saat menyimpan** — dosen atau ruangan sudah terpakai pada tanggal/waktu tersebut; pilih kombinasi lain.
- **Hasil AI menyebut "mode fallback"** — `GEMINI_API_KEY` belum diisi; itu normal untuk demo.
