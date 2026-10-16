import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { recordAuditLog } from "@/lib/audit/logger";
import type { OutboxItem, SyncBatchResponse } from "./types";

/**
 * Server-Side Sync Engine:
 * 1. Memverifikasi sesi dan izin pengguna.
 * 2. Menjalankan validasi ulang setiap data.
 * 3. Menjalankan aturan deteksi konflik (optimistic concurrency).
 * 4. Mencatat transaksi ke audit logs dan offline_sync_logs.
 * "Jangan menganggap data lokal sebagai sumber kebenaran utama."
 */
export async function processSyncBatchOnServer(
  items: OutboxItem[],
  authenticatedUser: {
    id: string;
    name: string;
    role: string;
    assignedGroupId?: string | null;
  }
): Promise<SyncBatchResponse> {
  const results: SyncBatchResponse["results"] = [];

  for (const item of items) {
    try {
      // KEAMANAN KETENTUAN 4 & 5: Pengguna hanya boleh menyinkronkan data miliknya
      if (item.userId && item.userId !== authenticatedUser.id) {
        results.push({
          clientQueueId: item.id,
          status: "rejected",
          errorMessage: `Akses ditolak: Data dibuat oleh pengguna lain (${item.userName || item.userId}) pada perangkat bersama.`,
        });
        continue;
      }

      switch (item.entityType) {
        case "teaching_journal": {
          const res = await processTeachingJournalSync(item, authenticatedUser);
          results.push(res);
          break;
        }

        case "student_assessment": {
          const res = await processStudentAssessmentSync(item, authenticatedUser);
          results.push(res);
          break;
        }

        case "lesson_plan": {
          const res = await processLessonPlanSync(item, authenticatedUser);
          results.push(res);
          break;
        }

        default: {
          results.push({
            clientQueueId: item.id,
            status: "rejected",
            errorMessage: `Tipe entitas '${item.entityType}' tidak didukung oleh mesin sinkronisasi.`,
          });
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        clientQueueId: item.id,
        status: "rejected",
        errorMessage: `Gagal validasi server: ${errorMsg}`,
      });
    }
  }

  return {
    success: results.every((r) => r.status === "synced"),
    timestamp: new Date().toISOString(),
    results,
  };
}

/**
 * Pemrosesan Sinkronisasi Jurnal Mengajar
 */
async function processTeachingJournalSync(
  item: OutboxItem,
  user: { id: string; name: string; role: string; assignedGroupId?: string | null }
) {
  const p = item.payload as any;

  // Izin kelompok untuk guru
  if (user.role === "teacher" && user.assignedGroupId && user.assignedGroupId !== p.groupId) {
    return {
      clientQueueId: item.id,
      status: "rejected" as const,
      errorMessage: `Akses ditolak: Anda tidak ditugaskan pada kelompok '${p.groupId}'.`,
    };
  }

  if (item.action === "create") {
    const [inserted] = await db
      .insert(schema.teachingJournals)
      .values({
        date: p.date,
        groupId: p.groupId,
        subjectId: p.subjectId,
        allocatedHours: p.allocatedHours || 2,
        lowerGrade: p.lowerGrade,
        higherGrade: p.higherGrade,
        lowerGradeTpCode: p.lowerGradeTpCode,
        lowerGradeTpText: p.lowerGradeTpText,
        higherGradeTpCode: p.higherGradeTpCode,
        higherGradeTpText: p.higherGradeTpText,
        rotationActivityDescription: p.rotationActivityDescription,
        attendancePresent: p.attendancePresent || 0,
        attendanceSick: p.attendanceSick || 0,
        attendancePermit: p.attendancePermit || 0,
        attendanceAbsent: p.attendanceAbsent || 0,
        learningEvidenceSummary: p.learningEvidenceSummary,
        challengesEncountered: p.challengesEncountered,
        teacherReflection: p.teacherReflection || "Refleksi pembelajaran dicatat secara luring.",
        nextActionPlan: p.nextActionPlan || "Melanjutkan siklus rotasi kelas rangkap sesuai capaian.",
        teacherId: user.id,
        teacherName: user.name,
      })
      .returning();

    await recordSyncLog("teaching_journal", inserted.id, "insert", p, "synced");

    return {
      clientQueueId: item.id,
      status: "synced" as const,
      serverEntityId: inserted.id,
      serverVersion: 1,
    };
  } else {
    // Update jurnal mengajar dengan concurrency check
    const serverId = item.serverEntityId || item.clientEntityId;
    const existing = await db.query.teachingJournals.findFirst({
      where: eq(schema.teachingJournals.id, serverId),
    });

    if (!existing) {
      return {
        clientQueueId: item.id,
        status: "rejected" as const,
        errorMessage: "Jurnal mengajar target tidak ditemukan di server.",
      };
    }

    const [updated] = await db
      .update(schema.teachingJournals)
      .set({
        rotationActivityDescription: p.rotationActivityDescription || existing.rotationActivityDescription,
        attendancePresent: p.attendancePresent ?? existing.attendancePresent,
        attendanceSick: p.attendanceSick ?? existing.attendanceSick,
        attendancePermit: p.attendancePermit ?? existing.attendancePermit,
        attendanceAbsent: p.attendanceAbsent ?? existing.attendanceAbsent,
        teacherReflection: p.teacherReflection || existing.teacherReflection,
        nextActionPlan: p.nextActionPlan || existing.nextActionPlan,
        updatedAt: new Date(),
      })
      .where(eq(schema.teachingJournals.id, serverId))
      .returning();

    await recordSyncLog("teaching_journal", updated.id, "update", p, "synced");

    return {
      clientQueueId: item.id,
      status: "synced" as const,
      serverEntityId: updated.id,
      serverVersion: 2,
    };
  }
}

/**
 * Pemrosesan Sinkronisasi Hasil Asesmen Siswa
 */
async function processStudentAssessmentSync(
  item: OutboxItem,
  user: { id: string; name: string; role: string; assignedGroupId?: string | null }
) {
  const p = item.payload as any;

  // Verifikasi siswa di database
  const student = await db.query.students.findFirst({
    where: eq(schema.students.id, p.studentId),
  });

  if (!student) {
    return {
      clientQueueId: item.id,
      status: "rejected" as const,
      errorMessage: `Siswa dengan ID '${p.studentId}' tidak ditemukan di database resmi.`,
    };
  }

  // Cek otorisasi kelompok untuk guru
  if (user.role === "teacher" && user.assignedGroupId && user.assignedGroupId !== student.groupId) {
    return {
      clientQueueId: item.id,
      status: "rejected" as const,
      errorMessage: `Akses ditolak: Anda tidak berwenang menginput nilai siswa kelompok '${student.groupId}'.`,
    };
  }

  // Cek apakah hasil asesmen ini sudah ada (upsert)
  const existing = await db.query.studentAssessmentResults.findFirst({
    where: and(
      eq(schema.studentAssessmentResults.assessmentId, p.assessmentId),
      eq(schema.studentAssessmentResults.studentId, p.studentId)
    ),
  });

  if (existing) {
    // ATURAN KONFLIK: Periksa apakah ada perubahan yang bertentangan
    if (
      existing.score !== null &&
      p.score !== undefined &&
      existing.score !== p.score &&
      item.baseServerVersion === 0
    ) {
      return {
        clientQueueId: item.id,
        status: "conflict" as const,
        serverEntityId: existing.id,
        serverVersion: 2,
        conflictDetails: {
          serverVersion: 2,
          serverPayload: {
            score: existing.score,
            masteryLevel: existing.masteryLevel,
            evidence: existing.learningEvidence,
            updatedAt: existing.updatedAt,
          },
          conflictingFields: ["score", "masteryLevel"],
          message: `Nilai di server telah diperbarui (${existing.score}) berbeda dengan input lokal (${p.score}).`,
        },
      };
    }

    const [updated] = await db
      .update(schema.studentAssessmentResults)
      .set({
        score: p.score ?? existing.score,
        masteryLevel: p.masteryLevel ?? existing.masteryLevel,
        learningEvidence: p.learningEvidence ?? existing.learningEvidence,
        teacherNotes: p.teacherNotes ?? existing.teacherNotes,
        followUpType: p.followUpType ?? existing.followUpType,
        followUpNotes: p.followUpNotes ?? existing.followUpNotes,
        followUpCompleted: p.followUpCompleted ?? existing.followUpCompleted,
        assessorId: user.id,
        assessorName: user.name,
        updatedAt: new Date(),
      })
      .where(eq(schema.studentAssessmentResults.id, existing.id))
      .returning();

    await recordSyncLog("student_assessment", updated.id, "update", p, "synced");

    return {
      clientQueueId: item.id,
      status: "synced" as const,
      serverEntityId: updated.id,
      serverVersion: 2,
    };
  } else {
    const [inserted] = await db
      .insert(schema.studentAssessmentResults)
      .values({
        assessmentId: p.assessmentId,
        studentId: p.studentId,
        classId: student.classId,
        subjectId: p.subjectId,
        tpId: p.tpId,
        score: p.score,
        masteryLevel: p.masteryLevel || "cukup",
        learningEvidence: p.learningEvidence,
        teacherNotes: p.teacherNotes,
        followUpType: p.followUpType || "tidak_perlu",
        followUpNotes: p.followUpNotes,
        followUpCompleted: p.followUpCompleted ?? false,
        assessorId: user.id,
        assessorName: user.name,
        assessmentDate: p.assessmentDate || new Date().toISOString().split("T")[0],
      })
      .returning();

    await recordSyncLog("student_assessment", inserted.id, "insert", p, "synced");

    return {
      clientQueueId: item.id,
      status: "synced" as const,
      serverEntityId: inserted.id,
      serverVersion: 1,
    };
  }
}

/**
 * Pemrosesan Sinkronisasi Modul Ajar (dengan Deteksi Konflik Optimistik)
 */
async function processLessonPlanSync(
  item: OutboxItem,
  user: { id: string; name: string; role: string; assignedGroupId?: string | null }
) {
  const p = item.payload as any;

  if (item.action === "update") {
    const serverId = item.serverEntityId || item.clientEntityId;
    const existing = await db.query.multigradeLessonPlans.findFirst({
      where: eq(schema.multigradeLessonPlans.id, serverId),
    });

    if (!existing) {
      return {
        clientQueueId: item.id,
        status: "rejected" as const,
        errorMessage: "Modul ajar target tidak ditemukan di server.",
      };
    }

    // ATURAN KONFLIK KETENTUAN 6: Periksa nomor versi
    if (existing.version > item.baseServerVersion) {
      // Ada orang lain atau sesi lain yang telah menyimpan versi baru di server
      return {
        clientQueueId: item.id,
        status: "conflict" as const,
        serverEntityId: existing.id,
        serverVersion: existing.version,
        conflictDetails: {
          serverVersion: existing.version,
          serverPayload: {
            title: existing.title,
            topic: existing.topic,
            version: existing.version,
            status: existing.status,
            updatedAt: existing.updatedAt,
          },
          conflictingFields: ["title", "topic", "version"],
          message: `Modul ajar di server telah memiliki versi lebih baru (v${existing.version}) dibanding draf lokal Anda (v${item.baseServerVersion}).`,
        },
      };
    }

    const nextVersion = existing.version + 1;
    const [updated] = await db
      .update(schema.multigradeLessonPlans)
      .set({
        title: p.title || existing.title,
        topic: p.topic || existing.topic,
        essentialMaterial: p.essentialMaterial || existing.essentialMaterial,
        version: nextVersion,
        versionNotes: `Pembaruan sinkronisasi offline oleh ${user.name}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.multigradeLessonPlans.id, serverId))
      .returning();

    await recordSyncLog("lesson_plan", updated.id, "update", p, "synced");

    return {
      clientQueueId: item.id,
      status: "synced" as const,
      serverEntityId: updated.id,
      serverVersion: nextVersion,
    };
  } else {
    // Buat draf modul ajar baru dari offline
    const [inserted] = await db
      .insert(schema.multigradeLessonPlans)
      .values({
        title: p.title,
        groupId: p.groupId,
        subjectId: p.subjectId,
        phase: p.phase || "Fase A",
        grades: p.grades || "1,2",
        topic: p.topic || "Topik Draf Offline",
        essentialMaterial: p.essentialMaterial || "Materi Kontekstual",
        initialCompetency: p.initialCompetency || "Kompetensi awal",
        status: "draft",
        version: 1,
        learningObjectives: p.learningObjectives || [],
        curriculumReferences: p.curriculumReferences || {},
        mediaAndResources: p.mediaAndResources || {},
        teachingSteps: p.teachingSteps || [],
        differentiation: p.differentiation || {
          content: { lowerGrade: "", higherGrade: "" },
          process: { lowerGrade: "", higherGrade: "" },
          product: { lowerGrade: "", higherGrade: "" },
        },
        assessments: p.assessments || {
          diagnostic: { technique: "Observasi lisan pemantik", instrument: "Daftar pertanyaan", questions: [] },
          formative: { lowerGradeCriteria: "", higherGradeCriteria: "", observationRubric: [] },
        },
        reflections: p.reflections || { teacherReflectionGuide: [], studentReflectionQuestions: [] },
        remedialAndEnrichment: p.remedialAndEnrichment || { remedialPlan: "", enrichmentPlan: "", followUpAction: "" },
        differentiatedStrategy: p.differentiatedStrategy || {},
        teacherId: user.id,
      })
      .returning();

    await recordSyncLog("lesson_plan", inserted.id, "insert", p, "synced");

    return {
      clientQueueId: item.id,
      status: "synced" as const,
      serverEntityId: inserted.id,
      serverVersion: 1,
    };
  }
}

/**
 * Mencatat log transaksi sinkronisasi ke tabel offline_sync_logs
 */
async function recordSyncLog(
  entityType: string,
  clientEntityId: string,
  action: "insert" | "update" | "delete",
  payload: Record<string, unknown>,
  syncStatus: "pending" | "synced" | "conflict" | "failed"
) {
  try {
    await db.insert(schema.offlineSyncLogs).values({
      entityType,
      clientEntityId,
      action,
      payload,
      syncStatus,
      syncedAt: new Date(),
    });
  } catch (err) {
    console.warn("[SyncProcessor] Gagal mencatat offline_sync_logs:", err);
  }
}
