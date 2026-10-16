"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Trash2,
  FileText,
  BookOpen,
  Users,
  ShieldAlert,
  Sparkles,
  Layers,
  Database,
  History,
  Info,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import type {
  OutboxItem,
  CachedMaterial,
  CachedStudent,
  SyncHistoryEntry,
  EmergencyBackupDump,
} from "@/lib/offline/types";
import {
  getPendingOutboxItems,
  deleteOutboxItem,
  updateOutboxItem,
  enqueueOutboxItem,
  saveCachedMaterial,
  getCachedMaterials,
  saveCachedStudents,
  getCachedStudents,
  getSyncHistory,
  recordSyncHistory,
  clearUserCache,
  exportEmergencyBackup,
  importEmergencyBackup,
} from "@/lib/offline/indexed-db";
import {
  syncOutboxBatchAction,
  getOfflinePackageAction,
} from "@/app/actions/offline-sync";

interface OfflineSyncManagerViewProps {
  user: CurrentUser;
}

export function OfflineSyncManagerView({ user }: OfflineSyncManagerViewProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [cachedMaterials, setCachedMaterials] = useState<CachedMaterial[]>([]);
  const [cachedStudents, setCachedStudents] = useState<CachedStudent[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Modal / Viewer State
  const [viewingMaterial, setViewingMaterial] = useState<CachedMaterial | null>(null);
  const [conflictItem, setConflictItem] = useState<OutboxItem | null>(null);

  // Quick Action Draf Offline State
  const [quickJournalTopic, setQuickJournalTopic] = useState("");
  const [quickJournalDesc, setQuickJournalDesc] = useState("");

  const refreshAllData = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && "indexedDB" in window) {
        const items = await getPendingOutboxItems(user.id);
        const materials = await getCachedMaterials();
        const students = await getCachedStudents();
        const history = await getSyncHistory(user.id);

        setOutboxItems(items);
        setCachedMaterials(materials);
        setCachedStudents(students);
        setSyncHistory(history);
      }
    } catch (err) {
      console.error("[SyncManager] Gagal membaca IndexedDB:", err);
    }
  }, [user.id]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        refreshAllData();
      };
      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      refreshAllData();

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [refreshAllData]);

  // Sinkronisasi Batch Antrean Outbox
  const handleTriggerSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    setMessage({ type: "info", text: "Mengirim dan memvalidasi data ke server..." });

    try {
      const items = await getPendingOutboxItems(user.id);
      if (items.length === 0) {
        setMessage({ type: "info", text: "Tidak ada antrean mutasi lokal yang perlu disinkronkan." });
        setIsSyncing(false);
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
        status: failedCount > 0 || conflictCount > 0 ? (conflictCount > 0 ? "partial" : "failed") : "success",
        details: `Disinkronkan: ${syncedCount}, Konflik: ${conflictCount}, Ditolak: ${failedCount}`,
      });

      await refreshAllData();

      // Trigger custom window event untuk update navbar/banner
      window.dispatchEvent(new Event("outbox-updated"));

      if (conflictCount > 0) {
        setMessage({
          type: "error",
          text: `Sinkronisasi selesai dengan ${conflictCount} konflik versi. Silakan selesaikan konflik di bawah.`,
        });
      } else if (failedCount > 0) {
        setMessage({
          type: "error",
          text: `Sinkronisasi selesai: ${syncedCount} berhasil, ${failedCount} ditolak server.`,
        });
      } else {
        setMessage({
          type: "success",
          text: `Semua ${syncedCount} data berhasil disinkronkan dan diverifikasi oleh server SDN Kandangan I!`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: `Gagal menjalankan sinkronisasi: ${msg}` });
    } finally {
      setIsSyncing(false);
    }
  };

  // Unduh Paket Materi & Data Minimal Siswa untuk Offline Prep
  const handleDownloadOfflinePackage = async () => {
    if (!isOnline) {
      setMessage({ type: "error", text: "Anda sedang offline. Hubungkan ke internet untuk mengunduh materi." });
      return;
    }

    setIsDownloading(true);
    setMessage({ type: "info", text: "Mengunduh paket materi dan data siswa minimal dari server..." });

    try {
      const res = await getOfflinePackageAction(user.assignedGroupId || "A");
      if (!res.success) {
        throw new Error(res.error || "Gagal mengunduh paket dari server.");
      }

      for (const mat of res.materials) {
        await saveCachedMaterial(mat);
      }
      await saveCachedStudents(res.students);

      await refreshAllData();
      setMessage({
        type: "success",
        text: `Berhasil mengunduh ${res.materials.length} materi dan ${res.students.length} data siswa minimal (Zero PII) untuk pembelajaran luring.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: `Pengunduhan gagal: ${msg}` });
    } finally {
      setIsDownloading(false);
    }
  };

  // Quick Action: Buat Draf Jurnal Mengajar Offline
  const handleCreateOfflineJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickJournalTopic.trim()) return;

    try {
      const targetGroup = user.assignedGroupId || "A";
      await enqueueOutboxItem({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        entityType: "teaching_journal",
        action: "create",
        clientEntityId: `local-journal-${Date.now()}`,
        baseServerVersion: 0,
        payload: {
          date: new Date().toISOString().split("T")[0],
          groupId: targetGroup,
          subjectId: "bahasa-indonesia",
          allocatedHours: 2,
          lowerGrade: targetGroup === "A" ? 1 : targetGroup === "B" ? 3 : 5,
          higherGrade: targetGroup === "A" ? 2 : targetGroup === "B" ? 4 : 6,
          lowerGradeTpCode: "TP-01",
          lowerGradeTpText: `Pembelajaran mandiri ${quickJournalTopic}`,
          higherGradeTpCode: "TP-02",
          higherGradeTpText: `Bimbingan terbimbing ${quickJournalTopic}`,
          rotationActivityDescription: quickJournalDesc || "Kegiatan rotasi kelompok multigrade tercatat saat luring.",
          attendancePresent: 8,
          attendanceSick: 0,
          attendancePermit: 0,
          attendanceAbsent: 0,
          teacherReflection: "Dicatat dalam mode luring di Tosari.",
        },
      });

      setQuickJournalTopic("");
      setQuickJournalDesc("");
      await refreshAllData();
      window.dispatchEvent(new Event("outbox-updated"));
      setMessage({
        type: "success",
        text: "Draf jurnal mengajar luring berhasil disimpan ke antrean lokal!",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: `Gagal menyimpan draf: ${msg}` });
    }
  };

  // Hapus item dari Outbox
  const handleDeleteItem = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin membatalkan dan menghapus antrean perubahan ini?")) {
      await deleteOutboxItem(id);
      await refreshAllData();
      window.dispatchEvent(new Event("outbox-updated"));
      setMessage({ type: "info", text: "Item antrean lokal berhasil dihapus." });
    }
  };

  // Resolusi Konflik: Fork as New Draft
  const handleResolveConflictFork = async (item: OutboxItem) => {
    try {
      await updateOutboxItem(item.id, {
        action: "create",
        baseServerVersion: 0,
        serverEntityId: undefined,
        status: "pending",
        conflictDetails: null,
      });
      setConflictItem(null);
      await refreshAllData();
      setMessage({
        type: "success",
        text: "Konflik diselesaikan: Perubahan lokal diubah menjadi draf baru tersendiri.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: `Gagal resolusi konflik: ${msg}` });
    }
  };

  // Resolusi Konflik: Accept Server Version (Discard Client Changes)
  const handleResolveConflictDiscard = async (item: OutboxItem) => {
    try {
      await deleteOutboxItem(item.id);
      setConflictItem(null);
      await refreshAllData();
      window.dispatchEvent(new Event("outbox-updated"));
      setMessage({
        type: "info",
        text: "Konflik diselesaikan: Perubahan lokal dibatalkan dan mengadopsi data server.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: `Gagal mengadopsi versi server: ${msg}` });
    }
  };

  // Ekspor Cadangan Darurat (JSON Dump)
  const handleExportBackup = async () => {
    try {
      const dump: EmergencyBackupDump = await exportEmergencyBackup(user.id);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dump, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `backup-darurat-multigrade-${user.id}-${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setMessage({
        type: "success",
        text: "Cadangan darurat lokal (JSON) berhasil diekspor. Simpan di flashdisk atau kartu memori.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: `Gagal mengekspor cadangan: ${msg}` });
    }
  };

  // Impor Cadangan Darurat dari File JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed: EmergencyBackupDump = JSON.parse(text);

        if (!parsed.outboxItems || !Array.isArray(parsed.outboxItems)) {
          throw new Error("Format berkas cadangan JSON tidak valid.");
        }

        const count = await importEmergencyBackup(parsed);
        await refreshAllData();
        window.dispatchEvent(new Event("outbox-updated"));
        setMessage({
          type: "success",
          text: `Berhasil memulihkan ${count} antrean dan materi dari berkas cadangan darurat.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessage({ type: "error", text: `Pemulihan gagal: ${msg}` });
      }
    };
    reader.readAsText(file);
  };

  // Membersihkan Cache Sesi saat Pergantian Pengguna
  const handleClearCache = async () => {
    if (
      confirm(
        "PERHATIAN: Ini akan menghapus data cache offline untuk akun Anda pada perangkat ini. Pastikan semua antrean sudah tersinkronisasi atau diekspor. Lanjutkan?"
      )
    ) {
      await clearUserCache(user.id);
      await refreshAllData();
      window.dispatchEvent(new Event("outbox-updated"));
      setMessage({ type: "info", text: "Cache data lokal untuk akun Anda telah dibersihkan." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isOnline ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Pusat Sinkronisasi & Mode Offline
              </h1>
              <p className="text-sm text-slate-500">
                PWA & Penyimpanan Luring untuk Kondisi Blank Spot SDN Kandangan I Tosari
              </p>
            </div>
          </div>
        </div>

        {/* Status Indikator & Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold ${
            isOnline
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span>{isOnline ? "Koneksi Terhubung (Online)" : "Mode Luring (Offline)"}</span>
          </div>

          <button
            onClick={handleTriggerSync}
            disabled={!isOnline || isSyncing || outboxItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Menyinkronkan..." : `Sinkronkan (${outboxItems.length})`}</span>
          </button>
        </div>
      </div>

      {/* Pesan Feedback */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3 border shadow-sm ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : message.type === "error"
              ? "bg-rose-50 border-rose-300 text-rose-900"
              : "bg-blue-50 border-blue-300 text-blue-900"
          }`}
        >
          {message.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          {message.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
          {message.type === "info" && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
          <div className="flex-1 font-medium">{message.text}</div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs text-slate-500 hover:text-slate-800 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Disclaimer AI Generatif & Invarian Keamanan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-900">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-amber-950 block">AI Memerlukan Koneksi Online:</strong>
            Pembuatan modul ajar dan LKPD baru dengan AI memerlukan koneksi internet aktif. Namun modul yang sudah tersimpan dapat dibuka secara luring.
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex items-start gap-3 text-xs text-blue-900">
          <Database className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-blue-950 block">Server adalah Sumber Kebenaran:</strong>
            Data lokal bersifat sementara. Validasi ulang dan deteksi konflik dijalankan di server saat proses sinkronisasi berlangsung.
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl flex items-start gap-3 text-xs text-emerald-900">
          <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-emerald-950 block">Zero PII & Perangkat Bersama:</strong>
            Data pribadi sensitif siswa (NIK, telepon, ortu) tidak pernah disimpan di perangkat. Antrean mutasi diisolasi per ID pengguna ({user.name}).
          </div>
        </div>
      </div>

      {/* Bagian 1: Antrean Mutasi Lokal (Outbox Queue) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-base">
              Antrean Mutasi Lokal (Outbox) &mdash; {outboxItems.length} Menunggu
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Diisolasi untuk Akun: <strong>{user.name}</strong>
          </span>
        </div>

        {outboxItems.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">Tidak ada antrean tertunda</p>
            <p className="text-xs text-slate-400 mt-1">
              Semua perubahan jurnal, asesmen, atau modul ajar telah sinkron dengan server SDN Kandangan I.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Entitas</th>
                  <th className="p-3">Aksi</th>
                  <th className="p-3">Waktu Input</th>
                  <th className="p-3">Versi Acuan</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outboxItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-semibold text-slate-800">
                      {item.entityType === "teaching_journal"
                        ? "Jurnal Mengajar"
                        : item.entityType === "student_assessment"
                        ? "Asesmen Siswa"
                        : "Modul Ajar"}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.action === "create"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.action === "update"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {item.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(item.clientTimestamp).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="p-3 font-mono text-slate-600">v{item.baseServerVersion}</td>
                    <td className="p-3">
                      {item.status === "pending" && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                          Menunggu
                        </span>
                      )}
                      {item.status === "failed" && (
                        <span
                          title={item.errorMessage || "Gagal"}
                          className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-bold cursor-help"
                        >
                          Gagal ({item.retryCount}x)
                        </span>
                      )}
                      {item.status === "conflict" && (
                        <button
                          onClick={() => setConflictItem(item)}
                          className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold hover:bg-amber-600 transition flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Ada Konflik!
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Batalkan mutasi lokal ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bagian 2: Simulasi Pencatatan Draf Jurnal Luring (Saat Terputus di Tosari) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-slate-900 text-base">
            Pencatatan Draf Pembelajaran Luring Cepat
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Gunakan formulir ini saat koneksi internet sekolah sedang terputus untuk mencatat jurnal mengajar kelompok rangkap secara instan ke dalam memori lokal.
        </p>

        <form onSubmit={handleCreateOfflineJournal} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Materi / Topik Pembelajaran</label>
            <input
              type="text"
              value={quickJournalTopic}
              onChange={(e) => setQuickJournalTopic(e.target.value)}
              placeholder="Contoh: Menulis Kalimat Efektif"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Aktivitas Rotasi Kelompok</label>
            <input
              type="text"
              value={quickJournalDesc}
              onChange={(e) => setQuickJournalDesc(e.target.value)}
              placeholder="Contoh: Kelas 1 mandiri LKPD, Kelas 2 diskusi bimbingan"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-2"
            >
              <span>+ Simpan ke Antrean Lokal</span>
            </button>
          </div>
        </form>
      </div>

      {/* Bagian 3: Kesiapan Luring & Materi Terunduh (Offline Cache) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Unduh & Materi Cache */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-base">
                Materi Pembelajaran Terunduh ({cachedMaterials.length})
              </h2>
            </div>
            <button
              onClick={handleDownloadOfflinePackage}
              disabled={!isOnline || isDownloading}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg transition shadow-sm"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloading ? "animate-bounce" : ""}`} />
              <span>{isDownloading ? "Mengunduh..." : "Unduh Paket Kelompok"}</span>
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Modul ajar dan LKPD yang telah disetujui dapat diunduh ke cache peramban untuk dibaca langsung di kelas tanpa kuota.
          </p>

          {cachedMaterials.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              Belum ada materi yang diunduh untuk mode offline. Klik tombol <strong>Unduh Paket Kelompok</strong> saat online.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {cachedMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        mat.type === "modul_ajar"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-teal-100 text-teal-800"
                      }`}>
                        {mat.type === "modul_ajar" ? "Modul Ajar" : "LKPD"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">Kelompok {mat.groupId}</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 line-clamp-2">{mat.title}</h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">v{mat.version}</span>
                    <button
                      onClick={() => setViewingMaterial(mat)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      Buka Offline <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Data Siswa Minimal (Zero PII) & Cadangan Darurat */}
        <div className="space-y-6">
          {/* Box Siswa Minimal */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h2 className="font-bold text-slate-900 text-base">
                Data Siswa Minimal ({cachedStudents.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Sesuai standar privasi, hanya nama panggilan dan kode anonim yang disimpan di perangkat:
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {cachedStudents.length === 0 ? (
                <p className="text-slate-400 italic">Belum ada cache siswa.</p>
              ) : (
                cachedStudents.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{st.displayName}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({st.studentCode})</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                      Kelas {st.classId}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Box Cadangan Darurat (JSON Dump) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-slate-900 text-base">
                Cadangan & Pemulihan Darurat
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Jika perangkat rusak atau koneksi drop berkepanjangan di lereng Bromo:
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Cadangan (JSON Dump)</span>
              </button>

              <label className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Impor Cadangan JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleClearCache}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition mt-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Bersihkan Cache Akun Saya</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian 4: Riwayat Sinkronisasi (Audit Log Pengguna) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700" />
            <h2 className="font-bold text-slate-900 text-base">
              Riwayat Sinkronisasi Pengguna
            </h2>
          </div>
          <span className="text-xs text-slate-400">Disimpan di IndexedDB lokal</span>
        </div>

        {syncHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Belum ada riwayat sinkronisasi pada sesi perangkat ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Waktu Sinkronisasi</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Berhasil</th>
                  <th className="p-3">Konflik</th>
                  <th className="p-3">Gagal</th>
                  <th className="p-3">Rincian Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {syncHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/80">
                    <td className="p-3 text-slate-600">
                      {new Date(h.syncedAt).toLocaleString("id-ID")}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.status === "success"
                          ? "bg-emerald-100 text-emerald-800"
                          : h.status === "partial"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {h.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-emerald-600">{h.totalSynced}</td>
                    <td className="p-3 font-semibold text-amber-600">{h.totalConflicts}</td>
                    <td className="p-3 font-semibold text-rose-600">{h.totalFailed}</td>
                    <td className="p-3 text-slate-500">{h.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Resolusi Konflik Optimistik */}
      {conflictItem && conflictItem.conflictDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-extrabold text-slate-900 text-lg">
                Konflik Versi Terdeteksi
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              {conflictItem.conflictDetails.message}
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between border-b pb-1 font-semibold text-slate-700">
                <span>Versi Draf Lokal: v{conflictItem.baseServerVersion}</span>
                <span className="text-amber-700 font-bold">
                  Versi Server Saat Ini: v{conflictItem.conflictDetails.serverVersion}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Kolom yang bertentangan: <strong>{conflictItem.conflictDetails.conflictingFields.join(", ")}</strong>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-semibold">
              Pilih tindakan resolusi sesuai aturan kurikulum:
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleResolveConflictFork(conflictItem)}
                className="w-full text-left p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 transition text-xs font-semibold text-blue-900"
              >
                <div className="font-bold">Opsi A: Buat Draf Baru (Fork)</div>
                <div className="text-[11px] text-blue-700 mt-0.5">
                  Simpan perubahan lokal Anda sebagai draf terpisah baru di server tanpa menimpa versi yang ada.
                </div>
              </button>

              <button
                onClick={() => handleResolveConflictDiscard(conflictItem)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-xs font-semibold text-slate-800"
              >
                <div className="font-bold">Opsi B: Batalkan & Gunakan Versi Server</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Hapus mutasi lokal dan sinkronkan dengan perubahan yang sudah tersimpan di server.
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setConflictItem(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Tutup Sementara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Penampil Materi Offline */}
      {viewingMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">{viewingMaterial.title}</h3>
              </div>
              <button
                onClick={() => setViewingMaterial(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs text-slate-700 pr-2">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Tipe Materi:</span>
                  <strong className="text-slate-800 uppercase">{viewingMaterial.type}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Kelompok & Fase:</span>
                  <strong className="text-slate-800">Kelompok {viewingMaterial.groupId}</strong>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] whitespace-pre-wrap overflow-x-auto max-h-72">
                {JSON.stringify(viewingMaterial.data, null, 2)}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setViewingMaterial(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
