# Panduan Pengguna Multigrade Cerdas AI (User Manual)
**Sekolah:** SDN SEDAENG II TOSARI, Kec. Tosari, Kab. Pasuruan  
**Penyusun:** Tim Pengembang Kurikulum Multigrade Cerdas AI  
**Bahasa:** Bahasa Indonesia  

---

## Daftar Isi
1. [Pendahuluan & Konsep Multigrade Cerdas](#1-pendahuluan--konsep-multigrade-cerdas)
2. [Alur Masuk (Login) & Pengenalan Peran Pengguna](#2-alur-masuk-login--pengenalan-peran-pengguna)
3. [Panduan untuk Guru (Kelompok Belajar A, B, dan C)](#3-panduan-untuk-guru)
   - 3.1 [Eksplorasi Bank Kurikulum & Unggah Dokumen Resmi](#31-eksplorasi-bank-kurikulum)
   - 3.2 [Pemetaan Irisan Materi & Tema Bersama](#32-pemetaan-irisan-materi)
   - 3.3 [Penyusunan Alur Tujuan Pembelajaran (ATP) Multigrade](#33-penyusunan-atp-multigrade)
   - 3.4 [Penyusunan Modul Ajar Multigrade AI](#34-penyusunan-modul-ajar-multigrade-ai)
   - 3.5 [Generator LKPD Berdiferensiasi & Media Pembelajaran](#35-generator-lkpd-berdiferensiasi)
   - 3.6 [Pencatatan Asesmen, Nilai & Bukti Belajar Siswa](#36-pencatatan-asesmen-dan-kemajuan-siswa)
   - 3.7 [Pencatatan Jurnal Mengajar Harian](#37-pencatatan-jurnal-mengajar-harian)
   - 3.8 [Bekerja dalam Mode Offline (Tanpa Internet) & Sinkronisasi](#38-bekerja-dalam-mode-offline)
4. [Panduan untuk Kepala Sekolah (Supervisi & Monitoring)](#4-panduan-untuk-kepala-sekolah)
   - 4.1 [Supervisi & Persetujuan Perangkat Ajar](#41-supervisi--persetujuan-perangkat-ajar)
   - 4.2 [Pemantauan Jurnal Guru & Kehadiran Kelas](#42-pemantauan-jurnal-guru)
   - 4.3 [Laporan Ringkasan Eksekutif Pelaksanaan Pembelajaran](#43-laporan-ringkasan-eksekutif)
5. [Panduan untuk Administrator Sekolah](#5-panduan-untuk-administrator-sekolah)
   - 5.1 [Manajemen Profil Sekolah SDN SEDAENG II](#51-manajemen-profil-sekolah)
   - 5.2 [Manajemen Akun Guru & Penugasan Kelompok](#52-manajemen-akun-guru)
   - 5.3 [Pencadangan (Backup) & Pemulihan Database](#53-pencadangan-dan-pemulihan)
   - 5.4 [Pemeriksaan Audit Log Keamanan](#54-pemeriksaan-audit-log)

---

## 1. Pendahuluan & Konsep Multigrade Cerdas

Multigrade Cerdas AI adalah sistem terpadu yang dirancang khusus untuk memfasilitasi pembelajaran kelas rangkap (*multigrade teaching*) di **SDN SEDAENG II TOSARI**. Kondisi geografis lereng pegunungan Tengger/Bromo dengan jumlah siswa efisien menuntut penggabungan kelas:
- **Kelompok A:** Kelas 1 dan Kelas 2 (Fase A)
- **Kelompok B:** Kelas 3 dan Kelas 4 (Fase B)
- **Kelompok C:** Kelas 5 dan Kelas 6 (Fase C)

Sistem ini memastikan bahwa meskipun diajar dalam satu ruangan dengan satu tema kontekstual (misal: pertanian sayur lereng Bromo, kearifan lokal Tengger), **Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP) masing-masing jenjang kelas tetap terpenuhi dan tidak dicampuradukkan secara keliru.**

---

## 2. Alur Masuk (Login) & Pengenalan Peran Pengguna

1. Buka peramban (browser) di laptop atau HP Anda: `http://localhost:3005` (atau URL resmi sekolah).
2. Masukkan nama pengguna (username) dan kata sandi:
   - **Administrator:** `admin` (kata sandi awal: `admin123`)
   - **Kepala Sekolah:** `kepsek` (kata sandi awal: `kepsek123`)
   - **Guru Kelompok A (Kelas 1-2):** `guru.a` (kata sandi awal: `guru123`)
   - **Guru Kelompok B (Kelas 3-4):** `guru.b` (kata sandi awal: `guru123`)
   - **Guru Kelompok C (Kelas 5-6):** `guru.c` (kata sandi awal: `guru123`)
3. Klik tombol **"Masuk ke Aplikasi"**. Sistem akan mengarahkan Anda ke Dashboard sesuai hak akses masing-masing.

---

## 3. Panduan untuk Guru

### 3.1 Eksplorasi Bank Kurikulum
- Buka menu **Bank Kurikulum** pada bilah navigasi kiri.
- Anda dapat meninjau rumusan resmi CP BSKAP 032/H/KR/2024 untuk mata pelajaran Bahasa Indonesia, Matematika, IPAS, PPKn, dan Seni.
- Jika ada pembaruan dokumen kurikulum sekolah, Anda dapat mengunggah berkas PDF, DOCX, atau XLSX resmi (maksimal 15 MB). Sistem akan mengekstraksi dan memvalidasi keaslian rumusan CP secara otomatis.

### 3.2 Pemetaan Irisan Materi & Tema Bersama
- Buka menu **Irisan Materi**.
- Pilih kelompok Anda (misal Kelompok A) dan mata pelajaran (misal Matematika).
- Klik tombol **"Analisis Irisan Cerdas AI"**. Sistem akan mencari irisan kompetensi antara Kelas 1 dan Kelas 2, menyarankan tema kontekstual lereng Bromo (misal: "Menghitung Hasil Panen Kentang & Apel Tosari"), serta menyusun strategi rotasi belajar.
- Guru dapat mengedit rekomendasi draf sebelum menekan tombol **"Setujui Pemetaan"**.

### 3.3 Penyusunan Alur Tujuan Pembelajaran (ATP) Multigrade
- Buka menu **Generator ATP**.
- Pilih kelompok kelas, semester, dan mata pelajaran.
- Sistem menampilkan TP yang telah diverifikasi dan menyusun alokasi waktu mingguan secara proporsional.
- Periksa peringatan prasyarat jika ada TP yang terlewati.
- Klik **"Simpan Draf ATP"** atau **"Kirim untuk Persetujuan Kepala Sekolah"**.

### 3.4 Penyusunan Modul Ajar Multigrade AI
- Buka menu **Modul Ajar**.
- Klik **"Buat Modul Ajar Baru"**.
- Pilih TP dari ATP yang telah disetujui, tentukan alokasi JP, dan kondisi pembelajaran.
- Pilih pola rotasi pembelajaran multigrade 8 langkah:
  1. *Pembukaan bersama.*
  2. *Pengantar kontekstual bersama.*
  3. *Guru mendampingi kelompok rendah secara intensif.*
  4. *Kelompok tinggi mengerjakan eksplorasi mandiri terarah.*
  5. *Guru berpindah memfasilitasi kelompok tinggi.*
  6. *Kelompok rendah latihan berpasangan / tutor sebaya.*
  7. *Berbagi hasil antar-kelompok.*
  8. *Asesmen & refleksi penutup.*
- Klik **"Hasilkan Draf AI"**. Guru dapat merevisi setiap bagian modul, lalu klik **"Ajukan Draf Modul"**.

### 3.5 Generator LKPD Berdiferensiasi & Media Pembelajaran
- Buka menu **LKPD & Media**.
- Sistem menghasilkan LKPD bertingkat:
  - **Lembar Kelas Rendah:** Stimulus visual gambar konkret, petunjuk sederhana dengan ikon, pertanyaan pilihan berilustrasi.
  - **Lembar Kelas Tinggi:** Analisis data naratif, soal pemecahan masalah bertingkat, refleksi penalaran.
- Terdapat opsi pratinjau cetak: mode warna cerah dan mode **Hitam Putih Hemat Tinta (Eco B/W)** untuk pencetakan hemat di sekolah.
- Tersedia opsi ekspor ke format **PDF Siap Cetak** dan **DOCX (Microsoft Word)** untuk penyesuaian lanjutan.

### 3.6 Pencatatan Asesmen dan Kemajuan Siswa
- Buka menu **Asesmen & Kemajuan**.
- Guru memilih sesi asesmen (diagnostik, formatif, atau sumatif).
- Masukkan skor, pilih tingkat ketercapaian (*perlu bimbingan*, *cukup*, *baik*, *sangat baik*), dan tuliskan bukti belajar nyata (misal: "Mampu menjelaskan urutan bilangan menggunakan kartu biji pinus").
- Sistem memberikan rekomendasi tindak lanjut (remedial tutor sebaya atau pengayaan eksploratif) yang dapat disetujui guru.
- Rekap perkembangan per TP dapat langsung dilihat secara grafik maupun diekspor ke format Excel (XLSX).

### 3.7 Pencatatan Jurnal Mengajar Harian
- Buka menu **Jurnal Mengajar**.
- Catat kehadiran siswa (Hadir, Sakit, Izin, Alpa), ringkasan keterlaksanaan rotasi aktivitas, refleksi suasana kelas, dan kendala yang dihadapi.
- Jurnal tersimpan secara aman dan langsung dapat disupervisi oleh Kepala Sekolah.

### 3.8 Bekerja dalam Mode Offline (Tanpa Internet)
Jika koneksi internet di sekolah terputus:
1. Aplikasi tetap dapat dibuka langsung dari browser laptop atau HP (didukung Progressive Web App & Service Worker).
2. Guru tetap dapat membuat draf modul, menginput hasil asesmen siswa, dan mencatat jurnal harian.
3. Seluruh perubahan disimpan dalam antrean aman di perangkat Anda (*Outbox Queue*).
4. Ketika perangkat terhubung kembali ke internet, indikator status di pojok kanan atas akan berubah menjadi hijau dan tombol **"Sinkronkan Data"** akan mengirim data ke server sekolah secara otomatis.

---

## 4. Panduan untuk Kepala Sekolah

### 4.1 Supervisi & Persetujuan Perangkat Ajar
- Kepala Sekolah memiliki akses melihat seluruh perangkat ajar di Kelompok A, Kelompok B, dan Kelompok C.
- Buka menu **Modul Ajar** atau **ATP**, klik tab **"Menunggu Persetujuan"**.
- Teliti keselarasan TP dengan CP resmi. Jika sesuai, klik **"Setujui (Approve)"**; jika memerlukan perbaikan, berikan catatan revisi dan klik **"Kembalikan ke Guru"**.

### 4.2 Pemantauan Jurnal Guru
- Buka menu **Jurnal Mengajar**.
- Pilih filter guru dan rentang tanggal untuk melihat rekap kehadiran harian siswa, pelaksanaan pembelajaran multigrade, serta catatan refleksi guru.

### 4.3 Laporan Ringkasan Eksekutif
- Buka menu **Laporan & Ekspor**.
- Pilih **"Ringkasan Pelaksanaan Pembelajaran untuk Kepala Sekolah"**.
- Sistem menyusun laporan resmi berformat A4 lengkap dengan kop surat SDN SEDAENG II TOSARI, matriks ketercapaian kurikulum seluruh kelompok, dan ruang tanda tangan resmi Kepala Sekolah.
- Laporan dapat diunduh dalam format PDF atau Excel.

---

## 5. Panduan untuk Administrator Sekolah

### 5.1 Manajemen Profil Sekolah
- Masuk menggunakan akun `admin`.
- Buka menu **Pengaturan Sekolah**.
- Pastikan data NPSN (20519069), alamat sekolah di Dusun Sedaeng, Desa Sedaeng, Kecamatan Tosari, nama Kepala Sekolah, dan NIP sudah sesuai data Dapodik terkini.

### 5.2 Manajemen Akun Guru
- Buka menu **Manajemen Pengguna**.
- Tambahkan atau ubah data akun guru. Pastikan kolom **Kelompok yang Ditugaskan** terisi dengan benar (`Kelompok A`, `Kelompok B`, atau `Kelompok C`) agar aturan isolasi data berfungsi sebagaimana mestinya.

### 5.3 Pencadangan & Pemulihan Database
- Jalankan pencadangan mingguan dari terminal server (`npm run db:backup`).
- Periksa keberadaan file cadangan di folder `backups/`.
- Bila diperlukan pemulihan pasca insiden, jalankan `npm run db:restore` sesuai petunjuk pada [BACKUP_RESTORE.md](file:///c:/Users/UseR/Videos/Antigravity%20Project/MULTIGRADE%20CERDAS/BACKUP_RESTORE.md).

### 5.4 Pemeriksaan Audit Log
- Buka menu **Audit Log** untuk meninjau rekam jejak sistem: aktivitas login, mutasi nilai siswa, pengesahan modul, dan waktu sinkronisasi offline.
