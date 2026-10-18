# Panduan Deployment Produksi (Deployment Guide)
**Aplikasi:** Multigrade Cerdas AI  
**Sekolah:** SDN SEDAENG II TOSARI, Kec. Tosari, Kab. Pasuruan  
**Target Lingkungan:** Cloud VPS (Ubuntu/Debian) atau Mini Server Sekolah (On-Premise)  

---

## 1. Kebutuhan Sistem Minimum (System Requirements)

- **Sistem Operasi:** Ubuntu 22.04 LTS / Debian 12 / Windows Server 2022
- **Arsitektur CPU:** x86_64 atau ARM64 (2 Core CPU disarankan)
- **RAM:** Minimum 2 GB (Disarankan 4 GB untuk build & AI streaming)
- **Penyimpanan Disk:** Minimum 20 GB SSD (dengan alokasi volume database dan backup)
- **Perangkat Lunak:**
  - Docker versi 24.0+ & Docker Compose v2+ (Metode Docker)
  - ATAU Node.js versi 20.x LTS & npm 10+ (Metode Bare Metal)
- **Koneksi Jaringan:** Akses keluar ke `generativelanguage.googleapis.com` (port 443) untuk fitur AI Gemini.

---

## 2. Persiapan Environment Secret

Salin file `.env.example` menjadi `.env.production` atau `.env`:
```bash
cp .env.example .env
```

Sesuaikan konfigurasi environment produksi:
```ini
# Environment
NODE_ENV=production
PORT=3005
NEXT_PUBLIC_APP_URL=https://multigrade.sdnsedaeng2.sch.id

# Google AI Studio API Key (Wajib diisi untuk generasi cerdas)
GEMINI_API_KEY=AIzaSy...KunciRahasiaAnda...

# Path Penyimpanan Database PGlite
PGLITE_DATA_DIR=/app/data/postgres
```

> [!WARNING]
> Jangan pernah memublikasikan file `.env` atau kunci `GEMINI_API_KEY` ke repositori publik (GitHub/GitLab). File ini sudah terdaftar dalam `.gitignore` dan `.dockerignore`.

---

## 3. Opsi Deployment A: Menggunakan Docker Compose (Direkomendasikan)

Metode ini mengemas seluruh aplikasi ke dalam kontainer mandiri dengan isolasi penuh dan izin non-root.

### Langkah 1: Bangun & Jalankan Kontainer
```bash
docker compose up -d --build
```

### Langkah 2: Periksa Status Kontainer
```bash
docker compose ps
docker compose logs -f app
```

### Langkah 3: Periksa Indikator Kesehatan (Healthcheck)
Kontainer dilengkapi dengan automated health probe yang memverifikasi kesiapan web server dan database internal:
```bash
curl -f http://localhost:3005/api/health
```
Respons yang diharapkan:
```json
{
  "status": "healthy",
  "service": "multigrade-cerdas-ai",
  "school": "SDN SEDAENG II TOSARI",
  "npsn": "20519069"
}
```

---

## 4. Konfigurasi HTTPS & Reverse Proxy Otomatis (Caddy)

Untuk mengamankan lalu lintas data dengan sertifikat SSL/TLS gratis (Let's Encrypt), gunakan Caddy server:

1. Buat DNS Record A di penyedia domain Anda:
   `multigrade.sdnsedaeng2.sch.id` -> `[IP-PUBLIC-SERVER-ANDA]`
2. Aktifkan service `caddy` di file `docker-compose.yml` dengan menghapus tanda komentar `#`.
3. Pastikan port 80 dan 443 dibuka di firewall server:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 3005/tcp
   ```
4. Jalankan ulang compose:
   ```bash
   docker compose up -d
   ```
   Caddy akan secara otomatis menerbitkan dan memperpanjang sertifikat SSL tanpa perlu konfigurasi manual!

---

## 5. Opsi Deployment B: Bare Metal dengan PM2 (Alternatif Tanpa Docker)

Jika menggunakan server lokal Windows/Linux tanpa Docker:

1. Pasang dependensi dan lakukan build aplikasi:
   ```bash
   npm ci
   npm run build
   ```
2. Pasang PM2 secara global:
   ```bash
   npm install -g pm2
   ```
3. Jalankan aplikasi menggunakan PM2:
   ```bash
   pm2 start npm --name "multigrade-cerdas" -- run start
   pm2 save
   pm2 startup
   ```

---

## 6. Prosedur Pembaruan Aplikasi (Rolling Update)

Ketika ada versi atau pembaruan kode baru:
```bash
# 1. Tarik pembaruan git
git pull origin master

# 2. Lakukan backup data database sebelum update
npm run db:backup

# 3. Rebuild dan restart kontainer
docker compose up -d --build

# 4. Verifikasi status
docker compose logs -f --tail=50 app
curl http://localhost:3005/api/health
```

---

## 7. Prosedur Pemulihan Kegagalan (Failure Recovery Protocol)

Jika deployment baru mengalami masalah atau aplikasi tidak dapat booting:

1. **Rollback Kode:**
   Kembalikan ke commit git stabil sebelumnya:
   ```bash
   git log -n 5 --oneline
   git checkout <commit-hash-sebelumnya>
   ```
2. **Re-deploy Kontainer:**
   ```bash
   docker compose up -d --build
   ```
3. **Pemulihan Database (Bila Terjadi Anomali Data):**
   ```bash
   npm run db:restore
   ```
4. **Periksa Audit Log Error:**
   Periksa log kontainer untuk mengetahui akar masalah:
   ```bash
   docker logs --tail 100 multigrade-cerdas-app
   ```
