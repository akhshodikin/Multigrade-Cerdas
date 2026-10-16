"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Sparkles,
} from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import {
  getPendingOutboxItems,
  deleteOutboxItem,
  updateOutboxItem,
  recordSyncHistory,
} from "@/lib/offline/indexed-db";
import { syncOutboxBatchAction } from "@/app/actions/offline-sync";

interface OfflineStatusBannerProps {
  user: CurrentUser;
}

export function OfflineStatusBanner({ user }: OfflineStatusBannerProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Periksa status pending items di IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && "indexedDB" in window) {
        const items = await getPendingOutboxItems(user.id);
        setPendingCount(items.length);
      }
    } catch (err) {
      console.warn("[OfflineBanner] Gagal membaca outbox IndexedDB:", err);
    }
  }, [user.id]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        refreshPendingCount();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("outbox-updated", refreshPendingCount);

      refreshPendingCount();

      // Polling lokal ringan tiap 10 detik
      const interval = setInterval(refreshPendingCount, 10000);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("outbox-updated", refreshPendingCount);
        clearInterval(interval);
      };
    }
  }, [refreshPendingCount]);

  // Trigger sinkronisasi otomatis/manual saat online
  const handleSyncNow = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    setSyncStatusMsg("Menyinkronkan data...");

    try {
      const items = await getPendingOutboxItems(user.id);
      if (items.length === 0) {
        setIsSyncing(false);
        setSyncStatusMsg(null);
        return;
      }

      const response = await syncOutboxBatchAction(items);

      let syncedCount = 0;
      let conflictCount = 0;
      let failedCount = 0;

      for (const res of response.results) {
        if (res.status === "synced") {
          syncedCount++;
          await deleteOutboxItem(res.clientQueueId);
        } else if (res.status === "conflict") {
          conflictCount++;
          await updateOutboxItem(res.clientQueueId, {
            status: "conflict",
            conflictDetails: res.conflictDetails || null,
          });
        } else {
          failedCount++;
          const target = items.find((i) => i.id === res.clientQueueId);
          await updateOutboxItem(res.clientQueueId, {
            status: "failed",
            retryCount: (target?.retryCount || 0) + 1,
            errorMessage: res.errorMessage || "Ditolak oleh server",
          });
        }
      }

      await recordSyncHistory({
        id: `sync-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        syncedAt: new Date().toISOString(),
        totalSynced: syncedCount,
        totalFailed: failedCount,
        totalConflicts: conflictCount,
        status:
          failedCount > 0 || conflictCount > 0
            ? conflictCount > 0
              ? "partial"
              : "failed"
            : "success",
        details: `Berhasil: ${syncedCount}, Konflik: ${conflictCount}, Gagal: ${failedCount}`,
      });

      await refreshPendingCount();

      if (conflictCount > 0) {
        setSyncStatusMsg(`Selesai: ${syncedCount} tersimpan, ${conflictCount} membutuhkan resolusi konflik.`);
      } else if (failedCount > 0) {
        setSyncStatusMsg(`Selesai: ${syncedCount} tersimpan, ${failedCount} gagal.`);
      } else {
        setSyncStatusMsg(`Sukses! ${syncedCount} data berhasil disinkronkan ke server.`);
      }

      setTimeout(() => setSyncStatusMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncStatusMsg(`Gagal sinkronisasi: ${msg}`);
      setTimeout(() => setSyncStatusMsg(null), 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-2 mb-4">
      {/* Banner Utama Saat Mode Offline atau Ada Antrean Pending */}
      {!isOnline ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-200/70 text-amber-900 rounded-lg shrink-0">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide uppercase text-amber-950">
                  Mode Offline Aktif
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-200 text-amber-900 rounded-full">
                  Koneksi Terputus
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                SDN Kandangan I Tosari: Anda dapat terus mencatat jurnal dan asesmen. Perubahan akan
                disimpan lokal dan otomatis disinkronkan saat terhubung kembali.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {pendingCount > 0 && (
              <span className="text-xs font-bold bg-amber-200/80 px-2.5 py-1 rounded-md text-amber-950 border border-amber-300">
                {pendingCount} Antrean Lokal
              </span>
            )}
            <Link
              href="/dashboard/offline-sync"
              className="text-xs font-semibold px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg transition shadow-sm"
            >
              Kelola Antrean
            </Link>
          </div>
        </div>
      ) : pendingCount > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50 border border-blue-300 rounded-xl text-blue-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-200/70 text-blue-900 rounded-lg shrink-0">
              <CloudOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide uppercase text-blue-950">
                  Koneksi Online Pulih
                </span>
                <span className="px-2 py-0.5 text-xs font-bold bg-blue-200 text-blue-900 rounded-full">
                  {pendingCount} Draf Lokal Menunggu
                </span>
              </div>
              <p className="text-xs text-blue-800 mt-0.5">
                Terdapat data jurnal atau asesmen lokal yang belum disinkronkan ke server SDN Kandangan I.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}
            </button>
            <Link
              href="/dashboard/offline-sync"
              className="text-xs font-semibold px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-800 border border-blue-200 rounded-lg transition"
            >
              Lihat Detail
            </Link>
          </div>
        </div>
      ) : null}

      {/* Notifikasi feedback hasil sinkronisasi jika ada */}
      {syncStatusMsg && (
        <div className="p-2.5 px-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncStatusMsg}</span>
        </div>
      )}
    </div>
  );
}
