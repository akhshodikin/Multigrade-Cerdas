# Checklist Keamanan & Audit Sistem Multigrade Cerdas AI
**Sekolah:** SDN SEDAENG II TOSARI, Kec. Tosari, Kab. Pasuruan (NPSN: 20519069)  
**Dokumen:** Evaluasi & Verifikasi Keamanan Produksi  
**Status Audit:** Terverifikasi (14/14 Area) — Dilengkapi Prosedur Hardening & Pemulihan  

---

> [!IMPORTANT]
> **Pernyataan Batasan Keamanan (Security Disclaimer):**  
> Keberhasilan build atau kelulusan pengujian otomatis tidak menjamin kekebalan mutlak 100% terhadap seluruh potensi ancaman siber baru di masa depan. Tim pengelola IT sekolah wajib mematuhi panduan operasional, menjaga kerahasiaan kredensial server, dan melakukan rotasi kunci API serta audit berkala.

---

## Ringkasan Matriks 14 Area Keamanan

| No | Area Pemeriksaan | Status | Komponen / Implementasi | Detail & Mitigasi |
|:---|:---|:---:|:---|:---|
| 1 | **Autentikasi & Manajemen Sesi** | ✅ AMAN | `src/lib/auth.ts`, `src/app/actions/auth.ts`, DB `sessions` | Cookie sesi `httpOnly`, `sameSite=lax`, token acak 64-karakter tersimpan di database dengan masa kedaluwarsa (7 hari), validasi bcrypt untuk kata sandi, pencatatan audit log saat login dan logout. |
| 2 | **Otorisasi Berdasarkan Role (RBAC)** | ✅ AMAN | `src/lib/auth.ts`, `src/lib/reports/data-fetchers.ts`, `src/lib/offline/sync-processor.ts` | 3 Role ketat: **Admin** (konfigurasi & kelola pengguna), **Kepala Sekolah** (seluruh laporan, pemantauan supervisi), **Guru** (terisolasi hanya pada kelompok multigrade yang ditugaskan: Kelompok A, B, atau C). Upaya lintas kelompok diblokir di level server (HTTP 403 / Error). |
| 3 | **Isolasi Akses Data Sekolah** | ✅ AMAN | `src/db/schema.ts`, `src/lib/reports/data-fetchers.ts` | Data resmi SDN SEDAENG II TOSARI (NPSN 20519069) tersimpan di database dan menjadi identitas tunggal setiap dokumen, modul ajar, dan laporan. Tidak ada data sekolah fiktif di lingkungan produksi. |
| 4 | **Validasi Input di Server** | ✅ AMAN | Zod schemas di seluruh Server Actions (`src/app/actions/*`) | Validasi tipe data, panjang string, batas nilai numerik (skor 0–100), enumerasi fase/semester, dan struktur JSON dilakukan sebelum query database dieksekusi. Tidak mengandalkan validasi HTML sisi klien. |
| 5 | **Keamanan Endpoint & Server Actions** | ✅ AMAN | `src/middleware.ts`, `requireAuth()` helper | Rute `/dashboard/*` diproteksi secara terpusat oleh Next.js Middleware. Server actions memvalidasi sesi aktif pengguna melalui `getSession()` sebelum melakukan mutasi data. |
| 6 | **Perlindungan Kredensial & API Key** | ✅ AMAN | `.env.local`, `.gitignore`, `src/lib/ai/*` | Kunci `GEMINI_API_KEY` dan kredensial database tidak pernah dikirim ke browser client bundle. File `.env` dan `.env.local` terdaftar dalam `.gitignore` dan `.dockerignore`. |
| 7 | **Keamanan Unggahan Dokumen** | ✅ AMAN | `src/app/actions/curriculum.ts` | Batas ukuran berkas maksimal 15 MB. Validasi ketat kesesuaian antara ekstensi (`.pdf`, `.docx`, `.xlsx`) dengan tipe MIME yang dideklarasikan. Penolakan ekstensi terlarang (misal `.exe`, `.sh`, `.php`, `.js`). Sanitasi teks hasil ekstraksi sebelum pemrosesan. |
| 8 | **Perlindungan Data Siswa (Privacy & Zero PII)** | ✅ AMAN | `src/lib/offline/db.ts`, Synthetic Seeds | Penyimpanan lokal IndexedDB pada browser hanya menyimpan metadata minimal (ID, nama panggilan, kelas) dan draft antrean. Tidak ada data identitas sensitif (NIK, NISN, kontak wali) yang tersimpan di cache lokal bersama. Pengujian sistem menggunakan 27 data sintetis tanpa mengekspos siswa nyata. |
| 9 | **Audit Log** | ✅ AMAN | `src/lib/audit/logger.ts`, DB `audit_logs`, DB `offline_sync_logs` | Mencatat seluruh mutasi data penting: approval ATP, persetujuan modul ajar, penilaian siswa, ekspor dokumen, transaksi sinkronisasi offline, login, dan logout dengan timestamp akurat. |
| 10 | **Backup & Pemulihan Database** | ✅ AMAN | `scripts/backup-db.ts`, `scripts/restore-db.ts` | Ekspor JSON seluruh tabel dengan checksum digital SHA-256 (`.sha256`). Utilitas pemulihan memverifikasi integritas checksum sebelum restorasi, memulihkan tabel sesuai urutan Foreign Key, dan mencatat riwayat pemulihan ke audit log. |
| 11 | **Sinkronisasi Offline-First** | ✅ AMAN | `src/lib/offline/sync-processor.ts`, IndexedDB Outbox | Validasi ulang hak akses dan integritas data di server saat sinkronisasi; pencegahan penimpaan data antar-pengguna pada perangkat bersama; deteksi konflik *optimistic concurrency* berbasis nomor versi. |
| 12 | **Keamanan Ekspor Dokumen** | ✅ AMAN | `src/lib/reports/*`, `src/app/api/reports/export/route.ts` | Pengecekan otorisasi pengguna sebelum menghasilkan PDF/DOCX/XLSX. Penanganan karakter Unicode (aksara Jawa/Tengger), pencegahan memory exhaustion melalui streaming dan pembagian tabel bertingkat. |
| 13 | **Penanganan Error & Logging** | ✅ AMAN | `src/app/error.tsx`, `src/app/not-found.tsx`, API Error Handlers | Error boundary global mencegah kebocoran *stack trace*, path sistem operasi, atau struktur database kepada pengguna akhir. Pesan kesalahan disajikan dalam Bahasa Indonesia yang ramah pengguna. |
| 14 | **Dependensi & Konfigurasi Produksi** | ✅ AMAN | `next.config.mjs`, `Dockerfile`, `docker-compose.yml` | HTTP Security Headers: Content-Security-Policy (CSP), HSTS (`max-age=63072000`), X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), Referrer-Policy (`strict-origin-when-cross-origin`), `poweredByHeader: false`. Container berjalan dengan user non-root `nextjs:nodejs` (UID 1001). |

---

## Prosedur Pra-Produksi Sekolah
Sebelum memasukkan data siswa dan guru riil ke dalam sistem produksi:
1. **Pemeriksaan Administrator:** Administrator sekolah wajib login dengan akun default `admin` dan segera mengganti kata sandi default.
2. **Konfirmasi Identitas Sekolah:** Periksa halaman Pengaturan Profil Sekolah untuk memastikan NPSN, nama kepala sekolah, NIP, alamat, dan nomor kontak SDN SEDAENG II TOSARI sudah sesuai data Dapodik terbaru.
3. **Pembersihan Data Sintetis:** Sebelum menginput data riil siswa, jalankan skrip pembersihan atau reset data pengujian atas persetujuan tertulis Kepala Sekolah.
4. **Verifikasi Backup Terjadwal:** Pastikan cron job backup telah aktif dan folder `backups/` dapat diakses serta memiliki kapasitas disk yang memadai.
