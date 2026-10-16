"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getCurrentUser, requireAuth } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/audit/logger";
import { recordCurriculumVersion } from "@/lib/curriculum/versioning";
import {
  generateMultigradeAtp,
  AtpGenerationOptions,
  AtpGenerationResult,
  GeneratedAtpItem,
  buildPromesCalendarWeeks,
  ProtaEntry,
  PromesEntry,
} from "@/lib/curriculum/atp-generator";
import { eq, and, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Mengambil pratinjau hasil generasi ATP Multigrade, Prota, Promes, dan Peta Cakupan TP.
 */
export async function previewAtpGenerationAction(
  options: AtpGenerationOptions
): Promise<ActionResult<AtpGenerationResult>> {
  try {
    await requireAuth(["admin", "headmaster", "teacher"]);
    const result = await generateMultigradeAtp(options);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memproses pratinjau ATP Multigrade.",
    };
  }
}

export interface SaveAtpPlanInput {
  title: string;
  groupId: string;
  subjectId: string;
  phase: "Fase A" | "Fase B" | "Fase C";
  academicYear: string;
  semester: "Semua" | "Ganjil" | "Genap";
  targetGrade?: number;
  totalHours: number;
  effectiveWeeks: number;
  description?: string;
  items: Array<{
    tpId: string;
    sequenceOrder: number;
    allocatedHours: number;
    targetGrade: number;
    semester: "Ganjil" | "Genap";
    startWeek: number;
    endWeek: number;
    monthName?: string;
    multigradeStrategy?: "terpadu_sebagian" | "terpisah_paralel" | "terpadu_penuh" | "mandiri";
    multigradeNotes?: string;
    pairedTpId?: string;
  }>;
}

/**
 * Menyimpan hasil rencana ATP Multigrade yang telah disesuaikan oleh guru ke database.
 */
export async function saveGeneratedAtpPlanAction(
  input: SaveAtpPlanInput
): Promise<ActionResult<{ planId: string }>> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    if (!input.title || input.title.trim().length === 0) {
      return { success: false, error: "Judul Rencana ATP wajib diisi." };
    }

    if (!input.items || input.items.length === 0) {
      return { success: false, error: "Pilih minimal 1 butir Tujuan Pembelajaran dalam alur ATP." };
    }

    // 1. Simpan Rencana ATP Induk
    const [insertedPlan] = await db
      .insert(schema.atpPlans)
      .values({
        title: input.title.trim(),
        subjectId: input.subjectId,
        phase: input.phase,
        groupId: input.groupId,
        targetGrade: input.targetGrade || null,
        semester: input.semester,
        academicYear: input.academicYear,
        totalHours: input.totalHours,
        effectiveWeeks: input.effectiveWeeks || 36,
        description: input.description || null,
        status: "draft",
        version: 1,
        authorId: user.id,
      })
      .returning();

    // 2. Simpan Butir Urutan ATP (Items)
    const itemsToInsert = input.items.map((item, idx) => ({
      atpPlanId: insertedPlan.id,
      tpId: item.tpId,
      sequenceOrder: item.sequenceOrder || idx + 1,
      allocatedHours: item.allocatedHours || 4,
      targetGrade: item.targetGrade,
      semester: item.semester,
      startWeek: item.startWeek || 1,
      endWeek: item.endWeek || 2,
      monthName: item.monthName || "Juli",
      multigradeStrategy: item.multigradeStrategy || "terpadu_sebagian",
      multigradeNotes: item.multigradeNotes || null,
      pairedTpId: item.pairedTpId || null,
    }));

    await db.insert(schema.atpItems).values(itemsToInsert);

    // 3. Catat Versi Kurikulum
    await recordCurriculumVersion({
      entityType: "atp",
      entityId: insertedPlan.id,
      versionNumber: 1,
      changeType: "created",
      changedById: user.id,
      changedByName: user.name,
      currentSnapshot: {
        plan: insertedPlan,
        itemsCount: itemsToInsert.length,
      },
      changeReason: "Penyusunan Rencana ATP Multigrade via Generator Cerdas.",
    });

    // 4. Catat Log Audit
    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "GENERATE_MULTIGRADE_ATP",
      targetEntity: "atp_plans",
      targetId: insertedPlan.id,
      details: {
        groupId: input.groupId,
        subjectId: input.subjectId,
        semester: input.semester,
        itemsCount: itemsToInsert.length,
        totalHours: input.totalHours,
      },
    });

    revalidatePath("/dashboard/kurikulum/atp");
    revalidatePath("/dashboard/kurikulum");

    return {
      success: true,
      data: { planId: insertedPlan.id },
      message: `Rencana ATP '${insertedPlan.title}' berhasil disimpan sebagai Draf.`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan rencana ATP Multigrade.",
    };
  }
}

/**
 * Menyimpan pembaruan butir-butir alur ATP oleh guru pengampu (Manual Editing).
 */
export async function updateAtpPlanItemsAction(
  planId: string,
  updates: {
    title?: string;
    description?: string;
    items: Array<{
      id?: string;
      tpId: string;
      sequenceOrder: number;
      allocatedHours: number;
      targetGrade: number;
      semester: "Ganjil" | "Genap";
      startWeek: number;
      endWeek: number;
      monthName?: string;
      multigradeStrategy?: "terpadu_sebagian" | "terpisah_paralel" | "terpadu_penuh" | "mandiri";
      multigradeNotes?: string;
      pairedTpId?: string;
    }>;
  }
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const [existingPlan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, planId));

    if (!existingPlan) {
      return { success: false, error: "Rencana ATP tidak ditemukan." };
    }

    const nextVersion = existingPlan.version + 1;
    const newTotalHours = updates.items.reduce((acc, curr) => acc + curr.allocatedHours, 0);

    // 1. Update Rencana Induk
    await db
      .update(schema.atpPlans)
      .set({
        title: updates.title ?? existingPlan.title,
        description: updates.description ?? existingPlan.description,
        totalHours: newTotalHours,
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.atpPlans.id, planId));

    // 2. Hapus butir lama dan masukkan urutan yang diperbarui
    await db.delete(schema.atpItems).where(eq(schema.atpItems.atpPlanId, planId));

    const newItems = updates.items.map((item, idx) => ({
      atpPlanId: planId,
      tpId: item.tpId,
      sequenceOrder: item.sequenceOrder || idx + 1,
      allocatedHours: item.allocatedHours || 4,
      targetGrade: item.targetGrade,
      semester: item.semester,
      startWeek: item.startWeek || 1,
      endWeek: item.endWeek || 2,
      monthName: item.monthName || "Juli",
      multigradeStrategy: item.multigradeStrategy || "terpadu_sebagian",
      multigradeNotes: item.multigradeNotes || null,
      pairedTpId: item.pairedTpId || null,
    }));

    await db.insert(schema.atpItems).values(newItems);

    // 3. Catat Versi
    await recordCurriculumVersion({
      entityType: "atp",
      entityId: planId,
      versionNumber: nextVersion,
      changeType: "updated",
      changedById: user.id,
      changedByName: user.name,
      previousSnapshot: existingPlan as unknown as Record<string, unknown>,
      currentSnapshot: {
        plan: existingPlan,
        nextVersion,
        totalHours: newTotalHours,
        itemsCount: newItems.length,
      },
      changeReason: "Pengeditan manual alur ATP, JP, dan urutan oleh guru pengampu.",
    });

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UPDATE_ATP_ITEMS",
      targetEntity: "atp_plans",
      targetId: planId,
      details: { nextVersion, totalHours: newTotalHours },
    });

    revalidatePath(`/dashboard/kurikulum/atp/${planId}`);
    revalidatePath("/dashboard/kurikulum/atp");

    return {
      success: true,
      data: null,
      message: "Urutan ATP dan alokasi waktu berhasil diperbarui.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui urutan ATP.",
    };
  }
}

/**
 * Mengambil data komprehensif ATP Plan termasuk kelompok, guru, mata pelajaran, butir ATP, Prota, dan Promes.
 */
export async function getAtpPlanFullDetailsAction(planId: string) {
  const [plan] = await db
    .select()
    .from(schema.atpPlans)
    .where(eq(schema.atpPlans.id, planId));

  if (!plan) return null;

  const [group, subject, author, approver, school] = await Promise.all([
    plan.groupId
      ? db.query.multigradeGroups.findFirst({ where: eq(schema.multigradeGroups.id, plan.groupId) })
      : null,
    db.query.subjects.findFirst({ where: eq(schema.subjects.id, plan.subjectId) }),
    plan.authorId
      ? db.query.users.findFirst({ where: eq(schema.users.id, plan.authorId) })
      : null,
    plan.approvedById
      ? db.query.users.findFirst({ where: eq(schema.users.id, plan.approvedById) })
      : null,
    db.query.schoolProfile.findFirst(),
  ]);

  // Ambil butir ATP berurutan lengkap dengan data TP dan Elemen CP
  const rawItems = await db
    .select({
      id: schema.atpItems.id,
      atpPlanId: schema.atpItems.atpPlanId,
      tpId: schema.atpItems.tpId,
      sequenceOrder: schema.atpItems.sequenceOrder,
      allocatedHours: schema.atpItems.allocatedHours,
      targetGrade: schema.atpItems.targetGrade,
      semester: schema.atpItems.semester,
      startWeek: schema.atpItems.startWeek,
      endWeek: schema.atpItems.endWeek,
      monthName: schema.atpItems.monthName,
      multigradeStrategy: schema.atpItems.multigradeStrategy,
      multigradeNotes: schema.atpItems.multigradeNotes,
      pairedTpId: schema.atpItems.pairedTpId,
      tpCode: schema.tujuanPembelajaran.code,
      tpCompetency: schema.tujuanPembelajaran.competency,
      tpContentScope: schema.tujuanPembelajaran.contentScope,
      tpDescription: schema.tujuanPembelajaran.description,
      tpVerificationStatus: schema.tujuanPembelajaran.verificationStatus,
      cpElement: schema.capaianPembelajaran.element,
    })
    .from(schema.atpItems)
    .innerJoin(
      schema.tujuanPembelajaran,
      eq(schema.atpItems.tpId, schema.tujuanPembelajaran.id)
    )
    .leftJoin(
      schema.capaianPembelajaran,
      eq(schema.tujuanPembelajaran.cpId, schema.capaianPembelajaran.id)
    )
    .where(eq(schema.atpItems.atpPlanId, planId))
    .orderBy(asc(schema.atpItems.sequenceOrder));

  // Ambil seluruh TP untuk subjek dan fase ini untuk memeriksa cakupan (Coverage Map)
  const allTpsForPhase = await db
    .select({
      id: schema.tujuanPembelajaran.id,
      code: schema.tujuanPembelajaran.code,
      competency: schema.tujuanPembelajaran.competency,
      contentScope: schema.tujuanPembelajaran.contentScope,
      description: schema.tujuanPembelajaran.description,
      targetGrade: schema.tujuanPembelajaran.targetGrade,
      verificationStatus: schema.tujuanPembelajaran.verificationStatus,
      element: schema.capaianPembelajaran.element,
    })
    .from(schema.tujuanPembelajaran)
    .leftJoin(
      schema.capaianPembelajaran,
      eq(schema.tujuanPembelajaran.cpId, schema.capaianPembelajaran.id)
    )
    .where(
      and(
        eq(schema.tujuanPembelajaran.subjectId, plan.subjectId),
        eq(schema.tujuanPembelajaran.phase, plan.phase)
      )
    );

  const scheduledTpIds = new Set(rawItems.map((i) => i.tpId));
  const unscheduledTps = allTpsForPhase.filter((t) => !scheduledTpIds.has(t.id));

  // Pisahkan alur per kelas
  const grades = group ? group.grades.split(",").map((g) => parseInt(g.trim(), 10)) : [1, 2];
  const lowerGrade = Math.min(...grades);
  const higherGrade = Math.max(...grades);

  const lowerGradeItems = rawItems.filter((i) => i.targetGrade === lowerGrade);
  const higherGradeItems = rawItems.filter((i) => i.targetGrade === higherGrade);

  // Buat Prota Entries
  const protaEntries: ProtaEntry[] = rawItems.map((item, idx) => ({
    no: idx + 1,
    semester: item.semester as "Ganjil" | "Genap",
    element: item.cpElement || "Materi Pokok",
    grade: item.targetGrade,
    tpCode: item.tpCode,
    competency: item.tpCompetency,
    allocatedHours: item.allocatedHours,
    notes: item.multigradeNotes || "",
  }));

  // Buat Promes Matrices
  const promesWeeksGanjil = buildPromesCalendarWeeks("Ganjil");
  const promesWeeksGenap = buildPromesCalendarWeeks("Genap");

  const promesEntries: PromesEntry[] = rawItems.map((item, idx) => {
    const weeklyDistribution: Record<number, number> = {};
    const span = Math.max(1, item.endWeek - item.startWeek + 1);
    const hoursPerWeek = Math.round(item.allocatedHours / span) || 4;

    for (let w = item.startWeek; w <= item.endWeek; w++) {
      weeklyDistribution[w] = hoursPerWeek;
    }

    return {
      no: idx + 1,
      element: item.cpElement || "Materi Pokok",
      tpCode: item.tpCode,
      competency: item.tpCompetency,
      grade: item.targetGrade,
      allocatedHours: item.allocatedHours,
      weeklyDistribution,
      notes: item.multigradeNotes || "",
    };
  });

  return {
    plan,
    group,
    subject,
    author,
    approver,
    school,
    grades: { lowerGrade, higherGrade },
    items: rawItems,
    lowerGradeItems,
    higherGradeItems,
    allTpsForPhase,
    unscheduledTps,
    protaEntries,
    promesWeeksGanjil,
    promesWeeksGenap,
    promesEntries,
  };
}
