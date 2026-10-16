"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { processSyncBatchOnServer } from "@/lib/offline/sync-processor";
import type {
  OutboxItem,
  SyncBatchResponse,
  CachedMaterial,
  CachedStudent,
} from "@/lib/offline/types";
import { recordAuditLog } from "@/lib/audit/logger";

/**
 * Server Action: Melakukan sinkronisasi batch antrean mutasi lokal (Outbox Queue)
 * "Periksa izin dan sesi sebelum sinkronisasi."
 * "Jangan menganggap data lokal sebagai sumber kebenaran utama."
 */
export async function syncOutboxBatchAction(
  items: OutboxItem[]
): Promise<SyncBatchResponse> {
  const user = await requireAuth(["admin", "headmaster", "teacher"]);

  if (!items || items.length === 0) {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      results: [],
    };
  }

  const response = await processSyncBatchOnServer(items, user);

  await recordAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "OFFLINE_BATCH_SYNC",
    targetEntity: "offline_sync",
    targetId: `sync-${Date.now()}`,
    details: {
      totalItems: items.length,
      successCount: response.results.filter((r) => r.status === "synced").length,
      conflictCount: response.results.filter((r) => r.status === "conflict").length,
      rejectedCount: response.results.filter((r) => r.status === "rejected").length,
    },
  });

  revalidatePath("/dashboard/asesmen");
  revalidatePath("/dashboard/modul-ajar");
  revalidatePath("/dashboard/jurnal");
  revalidatePath("/dashboard/offline-sync");

  return response;
}

/**
 * Server Action: Mengunduh paket materi & data minimal untuk kesiapan luring (Offline Prep)
 * Ketentuan 3: Zero PII (Hanya kode anonim, nama panggilan/tampilan, kelas, kelompok).
 */
export async function getOfflinePackageAction(targetGroupId?: string): Promise<{
  success: boolean;
  materials: CachedMaterial[];
  students: CachedStudent[];
  error?: string;
}> {
  const user = await requireAuth(["admin", "headmaster", "teacher"]);
  const groupId = targetGroupId || user.assignedGroupId || "A";

  try {
    // 1. Ambil Modul Ajar terverifikasi/disetujui untuk kelompok ini
    const lessonPlans = await db.query.multigradeLessonPlans.findMany({
      where: and(
        eq(schema.multigradeLessonPlans.groupId, groupId),
        inArray(schema.multigradeLessonPlans.status, ["approved", "published", "draft"])
      ),
      limit: 20,
    });

    // 2. Ambil LKPD untuk kelompok ini
    const lkpdList = await db.query.lkpdWorksheets.findMany({
      where: and(
        eq(schema.lkpdWorksheets.groupId, groupId),
        inArray(schema.lkpdWorksheets.status, ["approved", "published", "draft"])
      ),
      limit: 20,
    });

    // 3. Ambil Siswa MINIMAL (Zero PII: Tanpa NIK, telepon, nama ortu, catatan pribadi)
    const rawStudents = await db.query.students.findMany({
      where: and(
        eq(schema.students.groupId, groupId),
        eq(schema.students.isActive, true)
      ),
      columns: {
        id: true,
        studentCode: true,
        displayName: true,
        classId: true,
        groupId: true,
      },
    });

    const students: CachedStudent[] = rawStudents.map((st) => ({
      id: st.id,
      studentCode: st.studentCode,
      displayName: st.displayName,
      classId: st.classId,
      groupId: st.groupId,
    }));

    const now = new Date().toISOString();
    const materials: CachedMaterial[] = [
      ...lessonPlans.map((lp) => ({
        id: `mat-lp-${lp.id}`,
        type: "modul_ajar" as const,
        title: lp.title,
        groupId: lp.groupId,
        subjectId: lp.subjectId,
        data: {
          id: lp.id,
          title: lp.title,
          topic: lp.topic,
          essentialMaterial: lp.essentialMaterial,
          initialCompetency: lp.initialCompetency,
          grades: lp.grades,
          phase: lp.phase,
          allocatedHours: lp.allocatedHours,
          status: lp.status,
          version: lp.version,
        },
        downloadedAt: now,
        version: lp.version || 1,
      })),
      ...lkpdList.map((lk) => ({
        id: `mat-lk-${lk.id}`,
        type: "lkpd" as const,
        title: lk.title,
        groupId: lk.groupId,
        subjectId: lk.subjectId,
        grade: lk.grade,
        data: {
          id: lk.id,
          title: lk.title,
          themeOrTopic: lk.themeOrTopic,
          grade: lk.grade,
          targetTpCode: lk.targetTpCode,
          targetTpDescription: lk.targetTpDescription,
          stimulus: lk.stimulus,
          status: lk.status,
          version: lk.version,
        },
        downloadedAt: now,
        version: lk.version || 1,
      })),
    ];

    return {
      success: true,
      materials,
      students,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      materials: [],
      students: [],
      error: msg,
    };
  }
}

/**
 * Server Action: Mengambil riwayat log sinkronisasi dari server
 */
export async function getServerSyncLogsAction() {
  await requireAuth(["admin", "headmaster", "teacher"]);

  const logs = await db.query.offlineSyncLogs.findMany({
    orderBy: (t, { desc }) => [desc(t.syncedAt)],
    limit: 50,
  });

  return logs;
}
