import type {
  OutboxItem,
  CachedMaterial,
  CachedStudent,
  SyncHistoryEntry,
  EmergencyBackupDump,
} from "./types";

const DB_NAME = "multigrade_offline_db";
const DB_VERSION = 1;

/**
 * Membuka koneksi IndexedDB (kompatibel dengan browser dan fake-indexeddb pada Vitest)
 */
export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idbFactory =
      typeof window !== "undefined"
        ? window.indexedDB
        : (globalThis as any).indexedDB;

    if (!idbFactory) {
      return reject(
        new Error(
          "IndexedDB tidak didukung pada lingkungan runtime saat ini."
        )
      );
    }

    const request = idbFactory.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;

      // 1. Antrean Mutasi Lokal (Outbox Queue)
      if (!db.objectStoreNames.contains("outbox_queue")) {
        const outboxStore = db.createObjectStore("outbox_queue", {
          keyPath: "id",
        });
        outboxStore.createIndex("userId", "userId", { unique: false });
        outboxStore.createIndex("status", "status", { unique: false });
        outboxStore.createIndex("clientTimestamp", "clientTimestamp", {
          unique: false,
        });
      }

      // 2. Cache Materi (Modul Ajar & LKPD Terunduh)
      if (!db.objectStoreNames.contains("cached_materials")) {
        const materialStore = db.createObjectStore("cached_materials", {
          keyPath: "id",
        });
        materialStore.createIndex("type", "type", { unique: false });
        materialStore.createIndex("groupId", "groupId", { unique: false });
        materialStore.createIndex("subjectId", "subjectId", { unique: false });
      }

      // 3. Cache Data Siswa Minimal (Zero PII - Ketentuan 3)
      if (!db.objectStoreNames.contains("cached_students")) {
        const studentStore = db.createObjectStore("cached_students", {
          keyPath: "id",
        });
        studentStore.createIndex("groupId", "groupId", { unique: false });
        studentStore.createIndex("classId", "classId", { unique: false });
      }

      // 4. Log Riwayat Sinkronisasi Pengguna
      if (!db.objectStoreNames.contains("sync_history")) {
        const historyStore = db.createObjectStore("sync_history", {
          keyPath: "id",
        });
        historyStore.createIndex("userId", "userId", { unique: false });
        historyStore.createIndex("syncedAt", "syncedAt", { unique: false });
      }

      // 5. Metadata Lokal (Kunci/Nilai)
      if (!db.objectStoreNames.contains("local_meta")) {
        db.createObjectStore("local_meta", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Menambahkan perubahan lokal ke dalam antrean (Outbox Queue)
 */
export async function enqueueOutboxItem(
  item: Omit<OutboxItem, "id" | "clientTimestamp" | "retryCount" | "status"> & {
    id?: string;
  }
): Promise<OutboxItem> {
  const db = await openOfflineDb();
  const id =
    item.id ||
    "outbox-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  const now = new Date().toISOString();

  const outboxItem: OutboxItem = {
    ...item,
    id,
    clientTimestamp: now,
    status: "pending",
    retryCount: 0,
    errorMessage: null,
    conflictDetails: null,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox_queue", "readwrite");
    const store = tx.objectStore("outbox_queue");
    const req = store.put(outboxItem);

    req.onsuccess = () => resolve(outboxItem);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Mengambil antrean outbox yang belum tersinkronisasi (Pending/Conflict/Failed)
 * Mendukung isolasi akun pada perangkat bersama (Ketentuan 4 & 5)
 */
export async function getPendingOutboxItems(
  userId?: string
): Promise<OutboxItem[]> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox_queue", "readonly");
    const store = tx.objectStore("outbox_queue");
    const req = store.getAll();

    req.onsuccess = () => {
      let items: OutboxItem[] = req.result || [];
      if (userId) {
        items = items.filter((i) => i.userId === userId);
      }
      // Urutkan berdasarkan waktu mutasi
      items.sort(
        (a, b) =>
          new Date(a.clientTimestamp).getTime() -
          new Date(b.clientTimestamp).getTime()
      );
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Memperbarui status item dalam outbox (misal setelah percobaan gagal / konflik)
 */
export async function updateOutboxItem(
  id: string,
  updates: Partial<OutboxItem>
): Promise<void> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox_queue", "readwrite");
    const store = tx.objectStore("outbox_queue");
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) {
        return reject(
          new Error(`Item outbox '${id}' tidak ditemukan di IndexedDB.`)
        );
      }
      const updated = { ...existing, ...updates };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Menghapus item outbox setelah sukses diverifikasi dan disimpan oleh server
 */
export async function deleteOutboxItem(id: string): Promise<void> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox_queue", "readwrite");
    const store = tx.objectStore("outbox_queue");
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Menyimpan materi terunduh (Modul Ajar / LKPD) ke cache IndexedDB
 */
export async function saveCachedMaterial(
  material: CachedMaterial
): Promise<void> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("cached_materials", "readwrite");
    const store = tx.objectStore("cached_materials");
    const req = store.put(material);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Mengambil materi terunduh dari cache IndexedDB saat offline
 */
export async function getCachedMaterials(
  type?: string
): Promise<CachedMaterial[]> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("cached_materials", "readonly");
    const store = tx.objectStore("cached_materials");
    const req = store.getAll();

    req.onsuccess = () => {
      let items: CachedMaterial[] = req.result || [];
      if (type) {
        items = items.filter((m) => m.type === type);
      }
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Menyimpan data siswa minimal tanpa PII (Ketentuan 3: Zero NIK/telepon/ortu)
 */
export async function saveCachedStudents(
  students: CachedStudent[]
): Promise<void> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("cached_students", "readwrite");
    const store = tx.objectStore("cached_students");

    for (const st of students) {
      store.put({
        id: st.id,
        studentCode: st.studentCode,
        displayName: st.displayName,
        classId: st.classId,
        groupId: st.groupId,
      });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Mengambil data siswa minimal saat offline untuk pengisian asesmen
 */
export async function getCachedStudents(
  groupId?: string
): Promise<CachedStudent[]> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("cached_students", "readonly");
    const store = tx.objectStore("cached_students");
    const req = store.getAll();

    req.onsuccess = () => {
      let items: CachedStudent[] = req.result || [];
      if (groupId) {
        items = items.filter((s) => s.groupId === groupId);
      }
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Mencatat log riwayat sinkronisasi untuk diperiksa pengguna
 */
export async function recordSyncHistory(
  entry: SyncHistoryEntry
): Promise<void> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync_history", "readwrite");
    const store = tx.objectStore("sync_history");
    const req = store.put(entry);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Mengambil riwayat sinkronisasi pengguna
 */
export async function getSyncHistory(
  userId?: string
): Promise<SyncHistoryEntry[]> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync_history", "readonly");
    const store = tx.objectStore("sync_history");
    const req = store.getAll();

    req.onsuccess = () => {
      let items: SyncHistoryEntry[] = req.result || [];
      if (userId) {
        items = items.filter((h) => h.userId === userId);
      }
      items.sort(
        (a, b) =>
          new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime()
      );
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Membersihkan data cache lokal saat logout/pergantian akun pada perangkat bersama (Ketentuan 4 & 5)
 */
export async function clearUserCache(userId: string): Promise<void> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ["outbox_queue", "cached_materials", "cached_students"],
      "readwrite"
    );

    // Hapus outbox milik user ini
    const outboxStore = tx.objectStore("outbox_queue");
    const outboxIndex = outboxStore.index("userId");
    const req = outboxIndex.openKeyCursor(IDBKeyRange.only(userId));

    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        outboxStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Ekspor Cadangan Darurat (JSON Dump) jika perangkat rusak atau koneksi drop berkepanjangan (Ketentuan 7)
 */
export async function exportEmergencyBackup(
  userId: string,
  schoolName: string = "SDN Kandangan I Tosari"
): Promise<EmergencyBackupDump> {
  const outbox = await getPendingOutboxItems(userId);
  const materials = await getCachedMaterials();
  const students = await getCachedStudents();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    schoolName,
    userId,
    outboxItems: outbox,
    cachedMaterials: materials,
    cachedStudents: students,
  };
}

/**
 * Impor Cadangan Darurat dari berkas JSON
 */
export async function importEmergencyBackup(
  dump: EmergencyBackupDump
): Promise<number> {
  const db = await openOfflineDb();
  let count = 0;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ["outbox_queue", "cached_materials", "cached_students"],
      "readwrite"
    );

    const outboxStore = tx.objectStore("outbox_queue");
    for (const item of dump.outboxItems || []) {
      outboxStore.put(item);
      count++;
    }

    const matStore = tx.objectStore("cached_materials");
    for (const m of dump.cachedMaterials || []) {
      matStore.put(m);
    }

    const stStore = tx.objectStore("cached_students");
    for (const s of dump.cachedStudents || []) {
      stStore.put(s);
    }

    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error);
  });
}
