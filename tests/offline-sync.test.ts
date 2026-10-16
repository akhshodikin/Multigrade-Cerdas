import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  openOfflineDb,
  enqueueOutboxItem,
  getPendingOutboxItems,
  updateOutboxItem,
  deleteOutboxItem,
  saveCachedMaterial,
  getCachedMaterials,
  saveCachedStudents,
  getCachedStudents,
  recordSyncHistory,
  getSyncHistory,
  clearUserCache,
  exportEmergencyBackup,
  importEmergencyBackup,
} from "@/lib/offline/indexed-db";
import { processSyncBatchOnServer } from "@/lib/offline/sync-processor";
import type { OutboxItem, CachedMaterial, CachedStudent } from "@/lib/offline/types";

describe("Pengujian Mode Offline-First & Sinkronisasi Multigrade Cerdas AI (SDN Kandangan I Tosari)", () => {
  let teacherUserA: typeof schema.users.$inferSelect;
  let teacherUserB: typeof schema.users.$inferSelect;
  let sampleGroupA: typeof schema.multigradeGroups.$inferSelect;
  let sampleSubjectMat: typeof schema.subjects.$inferSelect;
  let sampleStudent: typeof schema.students.$inferSelect;

  beforeAll(async () => {
    // Ambil data acuan dari database
    const teachers = await db.query.users.findMany({
      where: eq(schema.users.role, "teacher"),
    });

    if (teachers.length < 2) {
      throw new Error("Dibutuhkan minimal 2 akun guru untuk menguji keamanan perangkat bersama.");
    }
    teacherUserA = teachers[0];
    teacherUserB = teachers[1];

    const group = await db.query.multigradeGroups.findFirst({
      where: eq(schema.multigradeGroups.id, "group-a"),
    });
    const subject = await db.query.subjects.findFirst({
      where: eq(schema.subjects.id, "matematika"),
    });
    const student = await db.query.students.findFirst({
      where: eq(schema.students.classId, 1),
    });

    if (!group || !subject || !student) {
      throw new Error("Data seed awal (kelompok, mapel, siswa) belum lengkap.");
    }

    sampleGroupA = group;
    sampleSubjectMat = subject;
    sampleStudent = student;
  });

  // 1. Inisialisasi Database IndexedDB Lokal
  it("harus berhasil membuka IndexedDB multigrade_offline_db dan membuat semua object store", async () => {
    const idb = await openOfflineDb();
    expect(idb.name).toBe("multigrade_offline_db");
    expect(idb.objectStoreNames.contains("outbox_queue")).toBe(true);
    expect(idb.objectStoreNames.contains("cached_materials")).toBe(true);
    expect(idb.objectStoreNames.contains("cached_students")).toBe(true);
    expect(idb.objectStoreNames.contains("sync_history")).toBe(true);
    expect(idb.objectStoreNames.contains("local_meta")).toBe(true);
  });

  // 2. Pencatatan Mutasi Lokal Saat Offline (Outbox Queue)
  it("harus dapat menyimpan antrean jurnal mengajar dan asesmen secara luring ke outbox", async () => {
    const journalItem = await enqueueOutboxItem({
      userId: teacherUserA.id,
      userName: teacherUserA.name,
      userRole: teacherUserA.role,
      entityType: "teaching_journal",
      action: "create",
      clientEntityId: "local-journal-test-01",
      baseServerVersion: 0,
      payload: {
        date: "2026-10-16",
        groupId: "group-a",
        subjectId: sampleSubjectMat.id,
        allocatedHours: 2,
        lowerGrade: 1,
        higherGrade: 2,
        lowerGradeTpCode: "TP-MAT-01",
        lowerGradeTpText: "Membilang bilangan cacah",
        higherGradeTpCode: "TP-MAT-02",
        higherGradeTpText: "Penjumlahan bilangan cacah",
        rotationActivityDescription: "Rotasi kelompok kelas 1 bimbingan guru, kelas 2 latihan mandiri",
        attendancePresent: 8,
        teacherReflection: "Siswa kelas 1 aktif, siswa kelas 2 mandiri",
      },
    });

    expect(journalItem.id).toBeDefined();
    expect(journalItem.status).toBe("pending");
    expect(journalItem.retryCount).toBe(0);

    const pendingItems = await getPendingOutboxItems(teacherUserA.id);
    expect(pendingItems.some((i) => i.id === journalItem.id)).toBe(true);
  });

  // 3. Penyimpanan Data Siswa Minimal Tanpa PII (Ketentuan 3: Zero NIK/Telepon/Ortu)
  it("harus menyimpan data siswa minimal ke cache IndexedDB tanpa menyertakan PII", async () => {
    const minimalStudents: CachedStudent[] = [
      {
        id: sampleStudent.id,
        studentCode: sampleStudent.studentCode,
        displayName: sampleStudent.displayName,
        classId: sampleStudent.classId,
        groupId: sampleStudent.groupId,
      },
    ];

    await saveCachedStudents(minimalStudents);
    const cached = await getCachedStudents();

    expect(cached.length).toBeGreaterThan(0);
    const found = cached.find((s) => s.id === sampleStudent.id);
    expect(found).toBeDefined();
    expect(found?.studentCode).toBe(sampleStudent.studentCode);
    expect(found?.displayName).toBe(sampleStudent.displayName);

    // Pastikan tidak ada properti PII seperti NIK, nomor telepon, atau data orang tua
    expect((found as any).nik).toBeUndefined();
    expect((found as any).phone).toBeUndefined();
    expect((found as any).guardianName).toBeUndefined();
  });

  // 4. Cache Materi Terunduh (Modul Ajar & LKPD)
  it("harus dapat menyimpan dan membaca materi pembelajaran offline", async () => {
    const sampleMaterial: CachedMaterial = {
      id: "mat-test-lp-01",
      type: "modul_ajar",
      title: "Modul Ajar Matematika Penjumlahan Multigrade",
      groupId: "group-a",
      subjectId: sampleSubjectMat.id,
      data: {
        theme: "Penjumlahan Bilangan Cacah",
        essentialMaterial: "Konsep nilai tempat puluhan dan satuan",
      },
      downloadedAt: new Date().toISOString(),
      version: 1,
    };

    await saveCachedMaterial(sampleMaterial);
    const materials = await getCachedMaterials("modul_ajar");

    expect(materials.length).toBeGreaterThan(0);
    const foundMat = materials.find((m) => m.id === sampleMaterial.id);
    expect(foundMat).toBeDefined();
    expect(foundMat?.title).toBe(sampleMaterial.title);
  });

  // 5. Penyambungan Kembali & Sinkronisasi Berhasil ke Server (Online Sync)
  it("harus berhasil memproses batch sync jurnal mengajar ke database server dan membersihkan outbox", async () => {
    const queueItem = await enqueueOutboxItem({
      userId: teacherUserA.id,
      userName: teacherUserA.name,
      userRole: teacherUserA.role,
      entityType: "teaching_journal",
      action: "create",
      clientEntityId: "local-sync-success-01",
      baseServerVersion: 0,
      payload: {
        date: "2026-10-16",
        groupId: "group-a",
        subjectId: sampleSubjectMat.id,
        allocatedHours: 2,
        lowerGrade: 1,
        higherGrade: 2,
        lowerGradeTpCode: "TP-01",
        lowerGradeTpText: "Pengenalan Lambang Bilangan",
        higherGradeTpCode: "TP-02",
        higherGradeTpText: "Operasi Hitung",
        rotationActivityDescription: "Aktivitas bertukar kelompok",
        attendancePresent: 8,
        teacherReflection: "Berjalan kondusif",
      },
    });

    // Simulasi Server Sync Processing
    const syncResult = await processSyncBatchOnServer([queueItem], {
      id: teacherUserA.id,
      name: teacherUserA.name,
      role: teacherUserA.role,
      assignedGroupId: "group-a",
    });

    expect(syncResult.success).toBe(true);
    expect(syncResult.results[0].status).toBe("synced");
    expect(syncResult.results[0].serverEntityId).toBeDefined();

    // Hapus dari antrean setelah sukses
    await deleteOutboxItem(queueItem.id);
    const remaining = await getPendingOutboxItems(teacherUserA.id);
    expect(remaining.some((i) => i.id === queueItem.id)).toBe(false);
  });

  // 6. Penanganan Konflik Perubahan Data (Optimistic Concurrency Control)
  it("harus mendeteksi konflik ketika serverVersion > baseServerVersion dan mempertahankan data server", async () => {
    // 1. Buat modul ajar di server dengan versi 2
    const [insertedLp] = await db
      .insert(schema.multigradeLessonPlans)
      .values({
        title: "Modul Ajar IPAS Gunung Bromo",
        groupId: "group-a",
        subjectId: "ipas",
        phase: "Fase A",
        grades: "1,2",
        topic: "Ekosistem Bromo Versi Guru Lain",
        essentialMaterial: "Material Server",
        initialCompetency: "Awal",
        learningObjectives: [],
        curriculumReferences: {},
        mediaAndResources: {},
        teachingSteps: [
          {
            stepNumber: 1,
            stepName: "Pembukaan Bersama",
            durationMinutes: 10,
            patternType: "bersama",
            teacherRole: "Guru memandu apersepsi",
            lowerGradeActivity: "Menjawab pertanyaan pemantik",
            higherGradeActivity: "Menjawab pertanyaan pemantik",
            classroomManagementNotes: "Pengaturan tempat duduk lingkaran",
          },
        ],
        differentiation: { content: { lowerGrade: "", higherGrade: "" }, process: { lowerGrade: "", higherGrade: "" }, product: { lowerGrade: "", higherGrade: "" } },
        assessments: { diagnostic: { technique: "Observasi", instrument: "Rubrik", questions: [] }, formative: { lowerGradeCriteria: "", higherGradeCriteria: "", observationRubric: [] } },
        reflections: { teacherReflectionGuide: [], studentReflectionQuestions: [] },
        remedialAndEnrichment: { remedialPlan: "", enrichmentPlan: "", followUpAction: "" },
        differentiatedStrategy: {},
        status: "approved",
        version: 2, // Server sudah di versi 2
        teacherId: teacherUserA.id,
      })
      .returning();

    // 2. Klien mencoba mengirim pembaruan yang dibuat dari baseServerVersion = 1 (ketinggalan versi)
    const conflictOutboxItem: OutboxItem = {
      id: "outbox-conflict-01",
      userId: teacherUserA.id,
      userName: teacherUserA.name,
      userRole: teacherUserA.role,
      entityType: "lesson_plan",
      action: "update",
      clientEntityId: "local-draft-conflict",
      serverEntityId: insertedLp.id,
      baseServerVersion: 1, // Klien berasumsi versi 1
      payload: {
        title: "Modul Ajar IPAS Versi Offline yang Terlambat",
        topic: "Topik Versi Offline",
      },
      clientTimestamp: new Date().toISOString(),
      status: "pending",
      retryCount: 0,
    };

    const response = await processSyncBatchOnServer([conflictOutboxItem], {
      id: teacherUserA.id,
      name: teacherUserA.name,
      role: teacherUserA.role,
      assignedGroupId: "group-a",
    });

    expect(response.results[0].status).toBe("conflict");
    expect(response.results[0].conflictDetails).toBeDefined();
    expect(response.results[0].conflictDetails?.serverVersion).toBe(2);

    // Verifikasi bahwa server record TIDAK tertimpa secara sepihak
    const checkServer = await db.query.multigradeLessonPlans.findFirst({
      where: eq(schema.multigradeLessonPlans.id, insertedLp.id),
    });
    expect(checkServer?.title).toBe("Modul Ajar IPAS Gunung Bromo");
    expect(checkServer?.version).toBe(2);

    // Bersihkan data tes modul ajar agar tidak mempengaruhi suite tes lain
    await db.delete(schema.multigradeLessonPlans).where(eq(schema.multigradeLessonPlans.id, insertedLp.id));
  });

  // 7. Keamanan Perangkat Bersama (Shared Device Protection - Ketentuan 4 & 5)
  it("harus menolak sinkronisasi jika pengguna yang masuk berbeda dengan pembuat mutasi lokal", async () => {
    // Item dibuat oleh Guru A
    const itemByTeacherA: OutboxItem = {
      id: "outbox-shared-device-01",
      userId: teacherUserA.id,
      userName: teacherUserA.name,
      userRole: "teacher",
      entityType: "teaching_journal",
      action: "create",
      clientEntityId: "shared-journal-01",
      baseServerVersion: 0,
      payload: {
        date: "2026-10-16",
        groupId: "group-a",
        subjectId: sampleSubjectMat.id,
        rotationActivityDescription: "Catatan Guru A",
      },
      clientTimestamp: new Date().toISOString(),
      status: "pending",
      retryCount: 0,
    };

    // Percobaan sinkronisasi saat perangkat sedang dipakai login oleh Guru B
    const syncResponse = await processSyncBatchOnServer([itemByTeacherA], {
      id: teacherUserB.id, // Login sebagai Guru B
      name: teacherUserB.name,
      role: teacherUserB.role,
      assignedGroupId: "group-b",
    });

    expect(syncResponse.results[0].status).toBe("rejected");
    expect(syncResponse.results[0].errorMessage).toContain("Akses ditolak");
  });

  // 8. Pembersihan Cache Saat Logout / Pergantian Akun
  it("harus membersihkan antrean outbox pengguna saat clearUserCache dipanggil", async () => {
    await enqueueOutboxItem({
      userId: teacherUserA.id,
      userName: teacherUserA.name,
      userRole: teacherUserA.role,
      entityType: "teaching_journal",
      action: "create",
      clientEntityId: "cleanup-test-01",
      baseServerVersion: 0,
      payload: { date: "2026-10-16", groupId: "group-a", subjectId: "bahasa-indonesia" },
    });

    await enqueueOutboxItem({
      userId: teacherUserB.id,
      userName: teacherUserB.name,
      userRole: teacherUserB.role,
      entityType: "teaching_journal",
      action: "create",
      clientEntityId: "cleanup-test-02",
      baseServerVersion: 0,
      payload: { date: "2026-10-16", groupId: "group-b", subjectId: "bahasa-indonesia" },
    });

    // Bersihkan cache hanya untuk Guru A
    await clearUserCache(teacherUserA.id);

    const outboxA = await getPendingOutboxItems(teacherUserA.id);
    expect(outboxA.length).toBe(0);

    const outboxB = await getPendingOutboxItems(teacherUserB.id);
    expect(outboxB.length).toBeGreaterThan(0);
  });

  // 9. Ekspor dan Impor Cadangan Darurat (Emergency Recovery Dump - Ketentuan 7)
  it("harus dapat mengekspor dump cadangan darurat ke JSON dan memulihkannya kembali", async () => {
    const dumpItem = await enqueueOutboxItem({
      userId: teacherUserB.id,
      userName: teacherUserB.name,
      userRole: teacherUserB.role,
      entityType: "teaching_journal",
      action: "create",
      clientEntityId: "emergency-journal-01",
      baseServerVersion: 0,
      payload: {
        date: "2026-10-16",
        groupId: "group-b",
        subjectId: sampleSubjectMat.id,
        rotationActivityDescription: "Catatan darurat sebelum laptop restart",
      },
    });

    // 1. Ekspor dump
    const backupDump = await exportEmergencyBackup(teacherUserB.id, "SDN Kandangan I Tosari");
    expect(backupDump.schoolName).toBe("SDN Kandangan I Tosari");
    expect(backupDump.userId).toBe(teacherUserB.id);
    expect(backupDump.outboxItems.some((i) => i.id === dumpItem.id)).toBe(true);

    // 2. Hapus item dari database lokal seolah perangkat direset
    await deleteOutboxItem(dumpItem.id);
    const checkEmpty = await getPendingOutboxItems(teacherUserB.id);
    expect(checkEmpty.some((i) => i.id === dumpItem.id)).toBe(false);

    // 3. Pulihkan kembali melalui impor dump
    const restoredCount = await importEmergencyBackup(backupDump);
    expect(restoredCount).toBeGreaterThan(0);

    const restoredItems = await getPendingOutboxItems(teacherUserB.id);
    expect(restoredItems.some((i) => i.id === dumpItem.id)).toBe(true);
  });

  // 10. Pencatatan Riwayat Sinkronisasi (Sync History Audit)
  it("harus mencatat riwayat log sinkronisasi lokal untuk ditinjau oleh guru", async () => {
    await recordSyncHistory({
      id: "sync-hist-test-01",
      userId: teacherUserA.id,
      userName: teacherUserA.name,
      syncedAt: new Date().toISOString(),
      totalSynced: 3,
      totalFailed: 0,
      totalConflicts: 0,
      status: "success",
      details: "3 jurnal mengajar berhasil disinkronkan ke server",
    });

    const history = await getSyncHistory(teacherUserA.id);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].totalSynced).toBe(3);
    expect(history[0].status).toBe("success");
  });
});
