# Multigrade Cerdas AI — SDN Kandangan I Tosari

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.38-green.svg)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PGlite_WASM-336791.svg)](https://github.com/electric-sql/pglite)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-2.30-orange.svg)](https://ai.google.dev/)
[![Tests](https://img.shields.io/badge/Vitest-110%2F110_Passed-brightgreen.svg)](https://vitest.dev/)

**Multigrade Cerdas AI** adalah sistem terpadu perencanaan, pelaksanaan, asesmen, dan pelaporan pembelajaran kelas rangkap (*multigrade teaching*) berbasis kecerdasan buatan terkurasi untuk **SDN Kandangan I Tosari** (NPSN: 20519069), Kecamatan Tosari, Kabupaten Pasuruan, Jawa Timur.

Sistem dirancang secara khusus untuk mengatasi tantangan unik sekolah di daerah lereng Gunung Bromo dengan keterbatasan guru dan koneksi internet yang fluktuatif, memungkinkan guru menyusun perangkat ajar berdiferensiasi dan melakukan pencatatan asesmen baik secara **online** maupun **offline-first**.

---

## 🏛️ Struktur Kelompok Kelas Multigrade

Pembelajaran di SDN Kandangan I Tosari diorganisasikan ke dalam 3 kelompok kelas rangkap:
- **Kelompok A:** Kelas 1 dan Kelas 2 (Fase A)
- **Kelompok B:** Kelas 3 dan Kelas 4 (Fase B)
- **Kelompok C:** Kelas 5 dan Kelas 6 (Fase C)

Setiap kelompok diajar oleh guru kelas yang berfokus mendampingi siswa dengan model rotasi pembelajaran langsung dan terarah, memastikan setiap jenjang kelas tetap mencapai Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP) kurikulum nasional tanpa dicampuradukkan secara keliru.

---

## ✨ Fitur Utama Sistem

1. **Bank Kurikulum Resmi BSKAP 032/H/KR/2024:**
   - Validasi CP resmi nasional per fase dan elemen.
   - Unggah dan ekstraksi dokumen kurikulum sekolah (PDF, DOCX, XLSX) dengan batas aman 15 MB.
2. **Pemetaan Irisan Materi & Tema Bersama:**
   - Rekomendasi tema kontekstual lereng Bromo (pertanian sayur, kearifan lokal Tengger).
   - Pola rotasi bertahap untuk kelompok kelas rangkap.
3. **Generator ATP Multigrade Terpadu:**
   - Program tahunan (Prota), program semester (Promes), dan kalender alokasi waktu.
   - Peta cakupan TP per kelas dengan pemeriksaan prasyarat urutan belajar.
4. **Generator Modul Ajar Multigrade AI:**
   - Draf modul otomatis dengan 8 pola aktivitas rotasi belajar (bersama, terbimbing, mandiri terarah, berbagi hasil).
   - Diferensiasi konten, proses, dan produk yang dapat disunting guru.
5. **Generator LKPD & Media Pembelajaran Berdiferensiasi:**
   - Lembar kerja bertingkat per jenjang kelas dalam satu tema bersama.
   - Mode pratinjau cetak: Warna dan Hitam-Putih Hemat Tinta (*Eco B/W*).
   - Ekspor siap cetak ke format PDF dan Microsoft Word (DOCX).
6. **Asesmen & Kemajuan Belajar Siswa:**
   - Asesmen diagnostik, formatif, dan sumatif dengan rubrik penilaian bertingkat.
   - Rekomendasi tindak lanjut (remedial tutor sebaya & pengayaan eksploratif).
   - Rekap kemajuan per TP dan grafik capaian siswa.
7. **Jurnal Mengajar Harian:**
   - Pencatatan kehadiran siswa, pelaksanaan rotasi waktu, dan refleksi guru.
8. **Laporan Resmi & Ekspor Terintegrasi:**
   - 10 jenis dokumen resmi berformat A4 dengan kop resmi SDN Kandangan I Tosari.
   - Ekspor dalam format PDF, DOCX, dan Microsoft Excel (XLSX).
9. **Kemampuan Offline-First (PWA & IndexedDB):**
   - Tetap dapat digunakan saat koneksi internet terputus.
   - Antrean outbox lokal dan penyelarasan otomatis saat kembali online.
   - Deteksi konflik *optimistic concurrency* berbasis nomor versi.
10. **Hardening & Keamanan Produksi:**
    - Role-Based Access Control (RBAC): Admin, Kepala Sekolah, dan Guru terisolasi per kelompok.
    - Perlindungan data siswa: Nol PII di cache browser bersama.
    - Audit logging seluruh mutasi data penting.
    - Utilitas pencadangan dan pemulihan database ber-checksum SHA-256.

---

## 🚀 Memulai (Quick Start)

### Prasyarat
- Node.js versi 20.x atau lebih baru
- npm versi 10.x atau lebih baru

### 1. Instalasi Dependensi
```bash
git clone <repo-url> "MULTIGRADE CERDAS"
cd "MULTIGRADE CERDAS"
npm ci
```

### 2. Konfigurasi Environment
Salin template environment:
```bash
cp .env.example .env.local
```
Tambahkan kunci Google Gemini API:
```env
GEMINI_API_KEY="AIzaSy...kunci-api-gemini-anda..."
NEXT_PUBLIC_APP_URL="http://localhost:3005"
PORT=3005
```

### 3. Inisialisasi Database
Terapkan skema tabel dan isi data awal resmi SDN Kandangan I Tosari beserta 27 data siswa sintetis pengujian:
```bash
npm run db:push
npm run db:seed
```

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi dapat diakses melalui: `http://localhost:3005`

---

## 🧪 Pengujian Otomatis (Automated Testing)

Jalankan seluruh rangkaian pengujian otomatis (15 berkas pengujian):
```bash
npm test
```
Hasil verifikasi pengujian:
```text
✓ tests/curriculum-bank.test.ts (7 tests)
✓ tests/atp-generator.test.ts (8 tests)
✓ tests/modul-ajar.test.ts (12 tests)
✓ tests/auth.test.ts (4 tests)
✓ tests/lkpd-media.test.ts (12 tests)
✓ tests/audit-logs.test.ts (2 tests)
✓ tests/database-backup-restore.test.ts (5 tests)
✓ tests/school-and-groups.test.ts (5 tests)
✓ tests/offline-sync.test.ts (10 tests)
✓ tests/curriculum-validation.test.ts (7 tests)
✓ tests/reports-export.test.ts (7 tests)
✓ tests/assessment-progress.test.ts (8 tests)
✓ tests/e2e-security-workflow.test.ts (6 tests)
✓ tests/users-and-students.test.ts (4 tests)
✓ tests/material-intersection.test.ts (13 tests)

Test Files  15 passed (15)
     Tests  110 passed (110)
```

Jalankan pemeriksaan typecheck dan lint:
```bash
npx tsc --noEmit
npx eslint src/
```

---

## 💾 Pencadangan & Pemulihan Database

```bash
# Melakukan backup database (menghasilkan JSON & SHA-256)
npm run db:backup

# Memulihkan database dari backup terbaru
npm run db:restore

# Memulihkan dari file backup tertentu
npm run db:restore backups/multigrade-cerdas-backup-YYYY-MM-DD.json
```
Panduan lengkap: [BACKUP_RESTORE.md](file:///c:/Users/UseR/Videos/Antigravity%20Project/MULTIGRADE%20CERDAS/BACKUP_RESTORE.md).

---

## 🐳 Deployment Produksi (Docker Compose)

Jalankan kontainer produksi dengan persistent storage:
```bash
docker compose up -d --build
```
Periksa status kesehatan:
```bash
curl http://localhost:3005/api/health
```
Panduan lengkap: [DEPLOYMENT.md](file:///c:/Users/UseR/Videos/Antigravity%20Project/MULTIGRADE%20CERDAS/DEPLOYMENT.md).

---

## 📚 Dokumentasi Proyek

- [Panduan Pengguna (User Guide)](file:///c:/Users/UseR/Videos/Antigravity%20Project/MULTIGRADE%20CERDAS/USER_GUIDE.md) — Panduan lengkap berbahasa Indonesia untuk Guru, Kepala Sekolah, dan Admin.
- [Checklist Keamanan & Audit](file:///c:/Users/UseR/Videos/Antigravity%20Project/MULTIGRADE%20CERDAS/SECURITY_CHECKLIST.md) — Laporan verifikasi 14 area keamanan dan mitigasi risiko.
- [Panduan Backup & Restore](file:///c:/Users/UseR/Videos/Antigravity%20Project/MULTIGRADE%20CERDAS/BACKUP_RESTORE.md) — Tata cara pencadangan, verifikasi SHA-256, dan *disaster recovery*.
- [Panduan Deployment](file:///c:/Users/UseR/Videos/Antigravity%20Project/MULTIGRADE%20CERDAS/DEPLOYMENT.md) — Konfigurasi VPS, Docker Compose, HTTPS otomatis Caddy, dan rollback.
- [Status Implementasi](file:///c:/Users/UseR/Videos/Antigravity%20Project/MULTIGRADE%20CERDAS/IMPLEMENTATION_STATUS.md) — Matriks kepatuhan seluruh ketentuan dan riwayat fitur.

---

## 🔒 Kebijakan Privasi & Batasan Keamanan
Aplikasi menggunakan data sintetis untuk lingkungan pengembangan dan pengujian otomatis. Administrator sekolah wajib memeriksa profil sekolah dan menyetujui reset data sebelum menginput data riil siswa. Tidak ada klaim keamanan mutlak 100%; pengelolaan kredensial dan pembaruan berkala tetap menjadi tanggung jawab administrator sekolah.
