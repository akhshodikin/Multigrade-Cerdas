# Rencana Proyek: Multigrade Cerdas AI
## SDN SEDAENG II Tosari, Kabupaten Pasuruan

---

## 1. Konteks & Latar Belakang Sekolah
SDN SEDAENG II Tosari berlokasi di kawasan dataran tinggi Tosari, lereng Gunung Bromo, Kabupaten Pasuruan. Karakteristik operasional utama sekolah:
* **Jumlah Siswa:** 27 siswa (total seluruh sekolah dari kelas 1 sampai kelas 6).
* **Model Pembelajaran:** **Kelas Rangkap (*Multigrade Teaching*)** karena keterbatasan jumlah tenaga pendidik dan rasio rombongan belajar.
* **Struktur Kelompok Belajar (Kurikulum Merdeka):**
  * **Kelompok A:** Kelas 1 dan Kelas 2 (Fase A).
  * **Kelompok B:** Kelas 3 dan Kelas 4 (Fase B).
  * **Kelompok C:** Kelas 5 dan Kelas 6 (Fase C).
* **Cakupan Mata Pelajaran:** Seluruh mata pelajaran SD Kurikulum Merdeka (Pendidikan Agama dan Budi Pekerti, Pendidikan Pancasila, Bahasa Indonesia, Matematika, IPAS, PJOK, Seni Budaya, Bahasa Inggris, dan Muatan Lokal).
* **Infrastruktur Jaringan:** Koneksi internet bersifat **kadang tersedia (*intermittent connectivity*)**, rentan cuaca berkabut/hujan lebat di pegunungan, sehingga sistem **wajib memiliki ketahanan offline (*offline-first / offline-resilient*)**.
* **Ekosistem Pengembangan:** Google Antigravity dan Google AI Studio (Gemini API).

---

## 2. Tujuan Proyek
1. **Memudahkan Manajemen Kelas Rangkap bagi Guru:** Membantu guru merancang skenario pembelajaran di mana 1 guru mengajar 2 kelas berbeda secara serentak (misal: Kelas 3 bimbingan langsung, Kelas 4 tugas eksplorasi mandiri atau tutor sebaya).
2. **Diferensiasi Pembelajaran Berbasis AI (Kurikulum Merdeka):** Memanfaatkan Google AI Studio (Gemini) untuk memecah tema terpadu menjadi aktivitas belajar bertingkat sesuai fase tanpa membebani administrasi guru.
3. **Ketahanan Offline Penuh:** Memungkinkan guru tetap menginput absensi, modul ajar, dan nilai asesmen formatif saat internet mati, dengan sinkronisasi otomatis ketika koneksi kembali pulih.
4. **Privasi & Keamanan Data Siswa:** Memastikan data 27 siswa tidak terekspos ke internet publik maupun terkirim sebagai PII (*Personally Identifiable Information*) mentah ke model AI.

---

## 3. Tahapan Implementasi & Rencana Commit Git

Pengembangan dilakukan secara bertahap (*incremental*) dengan commit terstruktur pada repositori Git utama:

| Tahap | Milestone | Lingkup Kerja | Rencana Pesan Commit Git |
|---|---|---|---|
| **Tahap 1** | **Fondasi & Scaffold** *(Selesai)* | Inisialisasi repo Git, Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, konfigurasi Drizzle ORM, Zod, dan verifikasi build. | `feat(scaffold): initialize Next.js 15, TypeScript, Tailwind CSS, Drizzle ORM and Zod` |
| **Tahap 2** | **Desain Arsitektur & Perencanaan** *(Tahap Ini)* | Penyusunan 5 dokumen arsitektur: `PROJECT_PLAN.md`, `ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `SECURITY_PLAN.md`, dan `IMPLEMENTATION_STATUS.md`. | `docs(architecture): add comprehensive architecture, database, security, and project plan` |
| **Tahap 3** | **Migrasi Database & Skema Drizzle** | Pembuatan migration scripts Drizzle, koneksi PostgreSQL, dan seed data struktur kelompok & mata pelajaran resmi tanpa data siswa palsu. | `feat(db): generate initial migration and base reference seeds` |
| **Tahap 4** | **Arsitektur Offline-First & Client Cache** | Implementasi Service Worker / PWA caching, IndexedDB client store, dan antrean sinkronisasi outbox (`offline_sync_logs`). | `feat(offline): implement IndexedDB storage engine and outbox sync queue` |
| **Tahap 5** | **Integrasi Google AI Studio & Modul Multigrade** | Integrasi Google Gen AI SDK (Gemini API), prompt template diferensiasi kelas rangkap (Fase A, B, C), dan pembuat modul ajar dual-track. | `feat(ai): integrate Gemini API with multigrade differentiation prompt templates` |
| **Tahap 6** | **UI Guru & Asesmen Formatif Cepat** | Antarmuka pengisian asesmen berbasis observasi cepat (sesuai kebutuhan guru 27 siswa), dashboard kelas rangkap, dan rekonsiliasi data. | `feat(ui): add multigrade teacher dashboard and rapid formative assessment entry` |
| **Tahap 7** | **Audit Keamanan, Pengujian & Uji Operasional** | Pengujian offline-online cycle, audit zero-PII leak, dan uji coba terbatas pada perangkat guru SDN SEDAENG II. | `test(e2e): verify offline sync resilience and PII sanitization` |

---

## 4. Batasan & Aturan Ketat Proyek
1. **Dilarang Membuat Data CP Palsu:** Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP) hanya boleh diinput dari dokumen resmi BSKAP Kemendikbudristek nomor 032/H/KR/2024 atau revisi resmi terkini. Tidak boleh ada data CP karangan/halusinasi AI.
2. **Dilarang Memasukkan Data Siswa Nyata:** Pada repositori dan lingkungan pengujian, hanya digunakan kode anonim (misal: `SDN2-A-01` s/d `SDN2-C-27`) atau inisial samaran.
3. **Dilarang Menyatakan Fitur Selesai Sebelum Diuji:** Setiap fitur harus melalui kompilasi TypeScript (`tsc`), linting, dan verifikasi alur kerja nyata sebelum statusnya diubah menjadi *completed*.
4. **Prinsip Beban Ringan (Low Resource):** Aplikasi harus dapat berjalan lancar pada laptop guru spesifikasi standar sekolah tanpa ketergantungan server lokal yang rumit.
