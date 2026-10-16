"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
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
    }
  }, []);

  return null;
}
