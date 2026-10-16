"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local");

    // Di environment development / localhost, matikan Service Worker agar webpack fast refresh dan chunking tidak rusak
    if (process.env.NODE_ENV !== "production" || isLocalhost) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((unregistered) => {
            if (unregistered) {
              console.log("[PWA Dev] Unregistered stale service worker:", registration.scope);
            }
          });
        }
      });

      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    // Hanya aktifkan service worker saat mode produksi terpasang penuh
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "[PWA] Service Worker berhasil terdaftar dengan scope:",
          registration.scope
        );
      })
      .catch((error) => {
        console.warn("[PWA] Pendaftaran Service Worker gagal:", error);
      });
  }, []);

  return null;
}
