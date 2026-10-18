# Panduan Pencadangan & Pemulihan Database (Backup & Restore)
**Aplikasi:** Multigrade Cerdas AI  
**Sekolah:** SDN SEDAENG II TOSARI, Kec. Tosari, Kab. Pasuruan  
**Mesin Database:** Embedded PostgreSQL (PGlite) & PostgreSQL Kompatibel  

---

## 1. Ikhtisar Sistem Pencadangan

Sistem pencadangan Multigrade Cerdas AI dirancang khusus untuk memenuhi kebutuhan keandalan sekolah di daerah pedesaan lereng Gunung Bromo dengan spesifikasi:
- **Format File:** File JSON mandiri berstempel waktu (`multigrade-cerdas-backup-YYYY-MM-DDTHH-mm-ss.json`).
- **Verifikasi Integritas:** Setiap arsip cadangan dilengkapi file checksum SHA-256 (`.json.sha256`) untuk mendeteksi korupsi data atau manipulasi berkas sebelum proses pemulihan dilakukan.
- **Urutan Relasional Asosiatif (FK-Ordered):** Data diekspor dan diimpor dengan memperhatikan dependensi Foreign Key dari 23 tabel skema database.
- **Audit Logging:** Setiap proses eksekusi pencadangan dan pemulihan dicatat secara permanen ke tabel `audit_logs`.

---

## 2. Cara Menjalankan Pencadangan (Backup)

### A. Melalui NPM Script (Lokal / Server)
Jalankan perintah berikut dari direktori utama proyek:
```bash
npm run db:backup
```
Atau menggunakan `tsx` secara langsung:
```bash
npx tsx scripts/backup-db.ts
```

Output yang dihasilkan akan berada di dalam direktori `backups/`:
1. `backups/multigrade-cerdas-backup-2026-10-16T18-45-00.json`
2. `backups/multigrade-cerdas-backup-2026-10-16T18-45-00.json.sha256`

### B. Otomasi Terjadwal (Cron Job Linux / VPS)
Untuk menjalankan pencadangan otomatis setiap malam pukul 00:00 WIB:
1. Buka konfigurasi crontab:
   ```bash
   crontab -e
   ```
2. Tambahkan baris jadwal berikut:
   ```cron
   0 0 * * * cd /path/to/MULTIGRADE\ CERDAS && npm run db:backup >> /var/log/multigrade-backup.log 2>&1
   ```

### C. Melalui Docker Compose
Jika aplikasi berjalan dalam kontainer Docker:
```bash
docker exec multigrade-cerdas-app npm run db:backup
```
File backup akan langsung tersimpan di folder `./backups` pada host mesin karena telah dimount sebagai volume persisten.

---

## 3. Cara Menjalankan Pemulihan (Restore)

### A. Pemulihan dari Berkas Cadangan Terbaru Secara Otomatis
Jika Anda tidak menentukan parameter nama file, sistem akan secara otomatis mencari berkas `.json` terbaru yang ada di folder `backups/`:
```bash
npm run db:restore
```

### B. Pemulihan dari Berkas Tertentu
Untuk memulihkan data dari berkas cadangan tertentu:
```bash
npm run db:restore backups/multigrade-cerdas-backup-2026-10-16T18-45-00.json
```

### C. Alur Verifikasi Otomatis Saat Pemulihan
1. **Pemeriksaan File & Checksum:** Skrip memeriksa keberadaan file `.json` dan pasangannya `.sha256`.
2. **Kalkulasi SHA-256:** Sistem menghitung hash aktual file cadangan dan mencocokkannya dengan hash referensi. Jika tidak cocok, proses **DIBATALKAN** seketika untuk mencegah data rusak masuk ke database.
3. **Penyelarasan Tipe Data:** Nilai tanggal string ISO dihidrasi kembali menjadi objek `Date` asli PostgreSQL.
4. **Penyimpanan Aman (Upsert):** Data dimasukkan dengan metode *conflict resolution* (`ON CONFLICT DO UPDATE` atau penyisipan urut).
5. **Pencatatan Audit:** Ringkasan jumlah tabel dan baris yang berhasil dipulihkan disimpan ke tabel audit log.

---

## 4. Prosedur Tanggap Darurat & Disaster Recovery (DR)

### Skenario 1: Kerusakan Disk atau Server Host Rusak Total
1. Siapkan mesin server baru yang telah terpasang Node.js 20+ atau Docker.
2. Clone repositori aplikasi:
   ```bash
   git clone <repo-url> "MULTIGRADE CERDAS"
   cd "MULTIGRADE CERDAS"
   npm ci
   ```
3. Salin berkas cadangan terakhir (`.json` dan `.sha256`) ke dalam folder `backups/`.
4. Jalankan migrasi dan inisialisasi skema awal:
   ```bash
   npm run db:push
   ```
5. Pulihkan seluruh data sekolah:
   ```bash
   npm run db:restore
   ```
6. Mulai ulang aplikasi:
   ```bash
   npm run start
   ```

### Skenario 2: Kesalahan Hapus Data oleh Pengguna
1. Identifikasi berkas cadangan sebelum waktu terjadinya insiden.
2. Hentikan sementara server aplikasi:
   ```bash
   docker compose down # atau hentikan proses node
   ```
3. Jalankan `npm run db:restore <nama-file-backup>`.
4. Jalankan pengujian verifikasi:
   ```bash
   npm test
   ```
5. Nyalakan kembali aplikasi.

---

## 5. Rotasi & Retensi Arsip Cadangan
Disarankan menerapkan kebijakan retensi cadangan sebagai berikut:
- **Cadangan Harian:** Disimpan selama 14 hari terakhir.
- **Cadangan Mingguan:** Disimpan selama 8 minggu (2 bulan).
- **Cadangan Akhir Semester:** Disimpan permanen (diarsipkan ke media penyimpanan eksternal atau Google Drive sekolah).
