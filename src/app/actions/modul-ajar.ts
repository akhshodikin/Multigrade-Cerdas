"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getCurrentUser, requireAuth } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/audit/logger";
import { recordCurriculumVersion } from "@/lib/curriculum/versioning";
import {
  generateModulAjarDraft,
  checkModulCurriculumIntegrity,
} from "@/lib/modul-ajar/generator";
import {
  ModulAjarGenerationOptions,
  TeachingStep,
  LearningObjectiveItem,
  CurriculumReferences,
  MediaAndResources,
  Differentiation,
  AssessmentPlan,
  Reflections,
  RemedialAndEnrichment,
} from "@/lib/modul-ajar/types";
import { eq, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

/**
 * Menghasilkan pratinjau rancangan Modul Ajar Multigrade AI tanpa langsung menyimpan ke database.
 */
export async function previewModulAjarAction(
  options: ModulAjarGenerationOptions
): Promise<ActionResult<any>> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);
    const draft = await generateModulAjarDraft(options, user.id);
    return { success: true, data: draft };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memproses pratinjau Modul Ajar.",
    };
  }
}

export interface SaveModulAjarInput {
  title: string;
  groupId: string;
  subjectId: string;
  phase: string;
  grades: string;
  academicYear: string;
  semester: "Ganjil" | "Genap";
  durationMinutes: number;
  allocatedHours: number;
  topic: string;
  essentialMaterial: string;
  initialCompetency: string;
  learningObjectives: LearningObjectiveItem[];
  curriculumReferences: CurriculumReferences;
  mediaAndResources: MediaAndResources;
  teachingSteps: TeachingStep[];
  differentiation: Differentiation;
  assessments: AssessmentPlan;
  reflections: Reflections;
  remedialAndEnrichment: RemedialAndEnrichment;
  teacherNotes?: string;
  aiProvider?: string;
  aiModel?: string;
  aiAssisted?: boolean;
}

/**
 * Menyimpan rancangan Modul Ajar Multigrade baru ke database PostgreSQL.
 */
export async function saveModulAjarAction(
  input: SaveModulAjarInput
): Promise<ActionResult<{ lessonPlanId: string }>> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    if (!input.title || input.title.trim().length === 0) {
      return { success: false, error: "Judul Modul Ajar wajib diisi." };
    }

    if (!input.learningObjectives || input.learningObjectives.length === 0) {
      return { success: false, error: "Pilih minimal 1 Tujuan Pembelajaran untuk modul ajar ini." };
    }

    const [insertedPlan] = await db
      .insert(schema.multigradeLessonPlans)
      .values({
        title: input.title.trim(),
        groupId: input.groupId,
        subjectId: input.subjectId,
        phase: input.phase,
        grades: input.grades,
        academicYear: input.academicYear || "2024/2025",
        semester: input.semester || "Ganjil",
        durationMinutes: input.durationMinutes || 70,
        allocatedHours: input.allocatedHours || 2,
        topic: input.topic,
        essentialMaterial: input.essentialMaterial,
        initialCompetency: input.initialCompetency,
        learningObjectives: input.learningObjectives,
        curriculumReferences: input.curriculumReferences,
        mediaAndResources: input.mediaAndResources,
        teachingSteps: input.teachingSteps,
        differentiation: input.differentiation,
        assessments: input.assessments,
        reflections: input.reflections,
        remedialAndEnrichment: input.remedialAndEnrichment,
        differentiatedStrategy: input.differentiation,
        teacherNotes: input.teacherNotes || null,
        status: "draft",
        teacherId: user.id,
        version: 1,
        aiAssisted: input.aiAssisted ?? true,
        aiProvider: input.aiProvider || "mock_local",
        aiModel: input.aiModel || "manual",
      })
      .returning();

    // Catat Versi Kurikulum
    await recordCurriculumVersion({
      entityType: "atp", // entity type compatibility
      entityId: insertedPlan.id,
      versionNumber: 1,
      changeType: "created",
      changedById: user.id,
      changedByName: user.name,
      currentSnapshot: {
        plan: insertedPlan,
      },
      changeReason: "Pembuatan Modul Ajar Multigrade baru.",
    });

    // Catat Log Audit
    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "CREATE_MODUL_AJAR",
      targetEntity: "multigrade_lesson_plans",
      targetId: insertedPlan.id,
      details: {
        title: insertedPlan.title,
        groupId: insertedPlan.groupId,
        subjectId: insertedPlan.subjectId,
        stepCount: input.teachingSteps.length,
      },
    });

    revalidatePath("/dashboard/kurikulum/modul-ajar");
    revalidatePath("/dashboard/kurikulum");

    return {
      success: true,
      data: { lessonPlanId: insertedPlan.id },
      message: `Modul Ajar '${insertedPlan.title}' berhasil disimpan sebagai Draf.`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan Modul Ajar.",
    };
  }
}

/**
 * Menyunting Modul Ajar (guru mengubah langkah, diferensiasi, asesmen) dan menaikkan nomor versi.
 */
export async function updateModulAjarAction(
  id: string,
  updates: Partial<SaveModulAjarInput> & { versionNotes?: string }
): Promise<ActionResult<{ version: number }>> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const existing = await db.query.multigradeLessonPlans.findFirst({
      where: eq(schema.multigradeLessonPlans.id, id),
    });

    if (!existing) {
      return { success: false, error: "Modul Ajar tidak ditemukan." };
    }

    const nextVersion = existing.version + 1;

    await db
      .update(schema.multigradeLessonPlans)
      .set({
        title: updates.title ?? existing.title,
        topic: updates.topic ?? existing.topic,
        durationMinutes: updates.durationMinutes ?? existing.durationMinutes,
        allocatedHours: updates.allocatedHours ?? existing.allocatedHours,
        essentialMaterial: updates.essentialMaterial ?? existing.essentialMaterial,
        initialCompetency: updates.initialCompetency ?? existing.initialCompetency,
        learningObjectives: updates.learningObjectives ?? existing.learningObjectives,
        teachingSteps: updates.teachingSteps ?? existing.teachingSteps,
        differentiation: updates.differentiation ?? existing.differentiation,
        assessments: updates.assessments ?? existing.assessments,
        reflections: updates.reflections ?? existing.reflections,
        remedialAndEnrichment: updates.remedialAndEnrichment ?? existing.remedialAndEnrichment,
        teacherNotes: updates.teacherNotes ?? existing.teacherNotes,
        version: nextVersion,
        versionNotes: updates.versionNotes || "Penyuntingan isi dan langkah pembelajaran modul.",
        updatedAt: new Date(),
      })
      .where(eq(schema.multigradeLessonPlans.id, id));

    // Catat Riwayat Versi
    await recordCurriculumVersion({
      entityType: "atp",
      entityId: id,
      versionNumber: nextVersion,
      changeType: "updated",
      changedById: user.id,
      changedByName: user.name,
      previousSnapshot: existing as unknown as Record<string, unknown>,
      currentSnapshot: {
        id,
        nextVersion,
        updatedFields: Object.keys(updates),
      },
      changeReason: updates.versionNotes || "Penyuntingan langkah dan diferensiasi modul ajar.",
    });

    // Catat Log Audit
    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UPDATE_MODUL_AJAR",
      targetEntity: "multigrade_lesson_plans",
      targetId: id,
      details: {
        version: nextVersion,
        reason: updates.versionNotes,
      },
    });

    revalidatePath(`/dashboard/kurikulum/modul-ajar/${id}`);
    revalidatePath("/dashboard/kurikulum/modul-ajar");

    return {
      success: true,
      data: { version: nextVersion },
      message: `Modul Ajar berhasil diperbarui ke Versi ${nextVersion}.`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui Modul Ajar.",
    };
  }
}

/**
 * Menduplikasi (Clone) Modul Ajar yang sudah ada untuk variasi atau pertemuan berikutnya.
 */
export async function duplicateModulAjarAction(
  id: string
): Promise<ActionResult<{ newLessonPlanId: string }>> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const original = await db.query.multigradeLessonPlans.findFirst({
      where: eq(schema.multigradeLessonPlans.id, id),
    });

    if (!original) {
      return { success: false, error: "Modul Ajar sumber tidak ditemukan." };
    }

    const clonedTitle = `Salinan - ${original.title}`;

    const [cloned] = await db
      .insert(schema.multigradeLessonPlans)
      .values({
        title: clonedTitle,
        groupId: original.groupId,
        subjectId: original.subjectId,
        phase: original.phase,
        grades: original.grades,
        academicYear: original.academicYear,
        semester: original.semester,
        durationMinutes: original.durationMinutes,
        allocatedHours: original.allocatedHours,
        topic: original.topic,
        essentialMaterial: original.essentialMaterial,
        initialCompetency: original.initialCompetency,
        learningObjectives: original.learningObjectives,
        curriculumReferences: original.curriculumReferences,
        mediaAndResources: original.mediaAndResources,
        teachingSteps: original.teachingSteps,
        differentiation: original.differentiation,
        assessments: original.assessments,
        reflections: original.reflections,
        remedialAndEnrichment: original.remedialAndEnrichment,
        differentiatedStrategy: original.differentiatedStrategy,
        teacherNotes: original.teacherNotes,
        status: "draft",
        teacherId: user.id,
        version: 1,
        clonedFromId: original.id,
        aiAssisted: original.aiAssisted,
        aiProvider: original.aiProvider,
        aiModel: original.aiModel,
      })
      .returning();

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "DUPLICATE_MODUL_AJAR",
      targetEntity: "multigrade_lesson_plans",
      targetId: cloned.id,
      details: {
        sourceId: original.id,
        clonedTitle: cloned.title,
      },
    });

    revalidatePath("/dashboard/kurikulum/modul-ajar");

    return {
      success: true,
      data: { newLessonPlanId: cloned.id },
      message: `Modul Ajar berhasil diduplikasi sebagai draf baru.`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menduplikasi Modul Ajar.",
    };
  }
}

/**
 * Mengajukan Modul Ajar untuk ditinjau oleh Kepala Sekolah.
 */
export async function submitModulForReviewAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    await db
      .update(schema.multigradeLessonPlans)
      .set({ status: "in_review", updatedAt: new Date() })
      .where(eq(schema.multigradeLessonPlans.id, id));

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "SUBMIT_MODUL_FOR_REVIEW",
      targetEntity: "multigrade_lesson_plans",
      targetId: id,
    });

    revalidatePath(`/dashboard/kurikulum/modul-ajar/${id}`);
    revalidatePath("/dashboard/kurikulum/modul-ajar");

    return { success: true, data: null, message: "Modul Ajar berhasil diajukan untuk tinjauan." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengajukan tinjauan modul.",
    };
  }
}

/**
 * Menyetujui Modul Ajar oleh Kepala Sekolah / Administrator.
 */
export async function approveModulAjarAction(
  id: string,
  reviewNotes?: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster"]);

    await db
      .update(schema.multigradeLessonPlans)
      .set({
        status: "approved",
        approvedById: user.id,
        approvedAt: new Date(),
        rejectionNotes: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.multigradeLessonPlans.id, id));

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "APPROVE_MODUL_AJAR",
      targetEntity: "multigrade_lesson_plans",
      targetId: id,
      details: { reviewNotes },
    });

    revalidatePath(`/dashboard/kurikulum/modul-ajar/${id}`);
    revalidatePath("/dashboard/kurikulum/modul-ajar");

    return { success: true, data: null, message: "Modul Ajar resmi disetujui Kepala Sekolah." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyetujui Modul Ajar.",
    };
  }
}

/**
 * Menerbitkan (Publish) Modul Ajar yang telah disetujui untuk implementasi pembelajaran.
 */
export async function publishModulAjarAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const plan = await db.query.multigradeLessonPlans.findFirst({
      where: eq(schema.multigradeLessonPlans.id, id),
    });

    if (!plan) return { success: false, error: "Modul tidak ditemukan." };
    if (plan.status !== "approved" && user.role === "teacher") {
      return {
        success: false,
        error: "Modul Ajar harus disetujui oleh Kepala Sekolah sebelum diterbitkan.",
      };
    }

    await db
      .update(schema.multigradeLessonPlans)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(schema.multigradeLessonPlans.id, id));

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "PUBLISH_MODUL_AJAR",
      targetEntity: "multigrade_lesson_plans",
      targetId: id,
    });

    revalidatePath(`/dashboard/kurikulum/modul-ajar/${id}`);
    revalidatePath("/dashboard/kurikulum/modul-ajar");

    return { success: true, data: null, message: "Modul Ajar resmi diterbitkan untuk kelas." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menerbitkan Modul Ajar.",
    };
  }
}

/**
 * Menolak Modul Ajar dengan catatan evaluasi perbaikan.
 */
export async function rejectModulAjarAction(
  id: string,
  rejectionNotes: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster"]);

    if (!rejectionNotes || rejectionNotes.trim().length === 0) {
      return { success: false, error: "Wajib menyertakan alasan penolakan atau catatan revisi." };
    }

    await db
      .update(schema.multigradeLessonPlans)
      .set({
        status: "draft",
        rejectionNotes: rejectionNotes.trim(),
        updatedAt: new Date(),
      })
      .where(eq(schema.multigradeLessonPlans.id, id));

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "REJECT_MODUL_AJAR",
      targetEntity: "multigrade_lesson_plans",
      targetId: id,
      details: { rejectionNotes },
    });

    revalidatePath(`/dashboard/kurikulum/modul-ajar/${id}`);
    revalidatePath("/dashboard/kurikulum/modul-ajar");

    return {
      success: true,
      data: null,
      message: "Modul Ajar dikembalikan ke status Draf dengan catatan revisi.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menolak Modul Ajar.",
    };
  }
}

/**
 * Mengambil data komprehensif Modul Ajar termasuk relasi sekolah, guru, pengesahan, dan audit integritas.
 */
export async function getModulAjarFullDetailsAction(id: string) {
  const plan = await db.query.multigradeLessonPlans.findFirst({
    where: eq(schema.multigradeLessonPlans.id, id),
  });

  if (!plan) return null;

  const [group, subject, teacher, approver, school, integrityReport] = await Promise.all([
    db.query.multigradeGroups.findFirst({ where: eq(schema.multigradeGroups.id, plan.groupId) }),
    db.query.subjects.findFirst({ where: eq(schema.subjects.id, plan.subjectId) }),
    plan.teacherId ? db.query.users.findFirst({ where: eq(schema.users.id, plan.teacherId) }) : null,
    plan.approvedById ? db.query.users.findFirst({ where: eq(schema.users.id, plan.approvedById) }) : null,
    db.query.schoolProfile.findFirst(),
    checkModulCurriculumIntegrity(id),
  ]);

  const grades = group ? group.grades.split(",").map((g) => parseInt(g.trim(), 10)) : [1, 2];
  const lowerGrade = Math.min(...grades);
  const higherGrade = Math.max(...grades);

  return {
    plan,
    group,
    subject,
    teacher,
    approver,
    school,
    grades: { lowerGrade, higherGrade },
    integrityReport,
  };
}

/**
 * Menjalankan uji konsistensi kurikulum Modul Ajar terhadap perubahan database.
 */
export async function verifyModulCurriculumConsistencyAction(
  id: string
): Promise<ActionResult<any>> {
  try {
    await requireAuth(["admin", "headmaster", "teacher"]);
    const report = await checkModulCurriculumIntegrity(id);
    return { success: true, data: report };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memverifikasi konsistensi kurikulum.",
    };
  }
}
