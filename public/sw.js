const CACHE_NAME = "multigrade-pwa-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/dashboard/laporan",
  "/dashboard/asesmen",
  "/dashboard/kurikulum/modul-ajar",
  "/dashboard/kurikulum/lkpd",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
];

// 1. Install Event: Pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Sebagian aset gagal di-precache:", err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean up outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Intelligent Offline-First Caching
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Jangan tangani selain GET (misal POST/PUT/DELETE)
  if (event.request.method !== "GET") {
    return;
  }

  // ATURAN KEAMANAN & PENGEMBANGAN: Dilarang mencache otentikasi, login, rahasia API, atau localhost development
  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.pathname.includes("hot-update") ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname.includes("/login") ||
    url.pathname.startsWith("/api/ai")
  ) {
    return; // Pass through langsung ke jaringan tanpa cache
  }

  // Aset Statis & Materi Download (Cache First / Stale-While-Revalidate)
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkRes) => {
          if (networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // Halaman Navigasi Dashboard (Network First dengan Fallback Cache)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        })
        .catch(async () => {
          // Ketika offline, ambil versi halaman terakhir dari cache
          const cached = await caches.match(event.request);
          if (cached) return cached;

          // Jika halaman belum pernah dicache, arahkan ke fallback dashboard offline
          const fallback = await caches.match("/dashboard");
          if (fallback) return fallback;

          return new Response(
            `<!DOCTYPE html>
            <html lang="id">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Mode Offline - Multigrade Cerdas AI</title>
              <style>
                body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; text-align: center; }
                .card { max-width: 480px; margin: 3rem auto; background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; }
                h1 { color: #60a5fa; font-size: 1.5rem; margin-bottom: 0.5rem; }
                p { color: #cbd5e1; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1.5rem; }
                .btn { display: inline-block; background: #2563eb; color: #fff; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; font-size: 0.875rem; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>Mode Offline Aktif</h1>
                <p>Koneksi internet sekolah sedang tidak tersedia. Anda tetap dapat mengakses modul yang telah diunduh, membuat draf, dan mencatat asesmen di antrean lokal.</p>
                <a href="/dashboard" class="btn">Buka Dashboard Offline</a>
              </div>
            </body>
            </html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }
});
