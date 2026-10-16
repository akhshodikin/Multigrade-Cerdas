"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getCurrentUser, requireAuth } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/audit/logger";
import { getAiProvider } from "@/lib/ai/provider-factory";
import {
  IntersectionMappingRequest,
  IntersectionMappingResult,
  IntersectionMappingResultSchema,
  SourceTpInput,
} from "@/lib/ai/types";
import { eq, and, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// PII Sanitization & Check
const PII_PATTERNS = [
  /\b\d{16}\b/, // NIK (16 digits)
  /\b\d{10,14}\b/, // Phone number or NISN
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
];

function containsPii(text?: string | null): boolean {
  if (!text) return false;
  return PII_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Mengambil daftar kelompok belajar rangkap dan mata pelajaran untuk dropdown.
 */
export async function getGroupsAndSubjectsAction() {
  const [groups, subjectsList] = await Promise.all([
    db.select().from(schema.multigradeGroups).orderBy(schema.multigradeGroups.id),
    db.select().from(schema.subjects).orderBy(schema.subjects.name),
  ]);

  return { groups, subjects: subjectsList };
}

/**
 * Mengambil TP untuk kelompok dan mapel tertentu, dipisahkan berdasarkan kelas rendah dan kelas tinggi.
 */
export async function getTpsForGroupAndSubjectAction(groupId: string, subjectId: string) {
  const group = await db.query.multigradeGroups.findFirst({
    where: eq(schema.multigradeGroups.id, groupId),
  });

  if (!group) {
    return { success: false, error: "Kelompok multigrade tidak ditemukan." };
  }

  const grades = group.grades.split(",").map((g) => parseInt(g.trim(), 10));
  const lowerGrade = Math.min(...grades);
  const higherGrade = Math.max(...grades);

  // Ambil semua TP untuk fase ini dan mapel ini
  const allTps = await db
    .select({
      id: schema.tujuanPembelajaran.id,
      code: schema.tujuanPembelajaran.code,
      competency: schema.tujuanPembelajaran.competency,
      contentScope: schema.tujuanPembelajaran.contentScope,
      description: schema.tujuanPembelajaran.description,
      targetGrade: schema.tujuanPembelajaran.targetGrade,
      cpId: schema.tujuanPembelajaran.cpId,
      verificationStatus: schema.tujuanPembelajaran.verificationStatus,
    })
    .from(schema.tujuanPembelajaran)
    .where(
      and(
        eq(schema.tujuanPembelajaran.subjectId, subjectId),
        eq(schema.tujuanPembelajaran.phase, group.phase as "Fase A" | "Fase B" | "Fase C")
      )
    )
    .orderBy(schema.tujuanPembelajaran.code);

  const lowerGradeTps = allTps.filter(
    (tp) => tp.targetGrade === lowerGrade || (tp.targetGrade === null && grades.includes(lowerGrade))
  );
  const higherGradeTps = allTps.filter(
    (tp) => tp.targetGrade === higherGrade || (tp.targetGrade === null && grades.includes(higherGrade))
  );

  return {
    success: true,
    data: {
      group,
      grades: { lowerGrade, higherGrade },
      lowerGradeTps,
      higherGradeTps,
    },
  };
}

export interface GenerateIntersectionInput {
  groupId: string;
  subjectId: string;
  academicYear?: string;
  semester?: "Ganjil" | "Genap";
  durationMinutes?: number;
  studentConditions?: string;
  selectedLowerTpIds: string[];
  selectedHigherTpIds: string[];
  providerId?: "gemini" | "mock_local" | "auto";
}

/**
 * Menjalankan analisis dan rekomendasi irisan materi multigrade via AI Provider yang dapat diganti.
 */
export async function generateMaterialIntersectionAction(
  input: GenerateIntersectionInput
): Promise<ActionResult<{ mapId: string; result: IntersectionMappingResult }>> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    if (!input.groupId || !input.subjectId) {
      return { success: false, error: "Kelompok dan mata pelajaran wajib dipilih." };
    }

    if (
      !input.selectedLowerTpIds ||
      input.selectedLowerTpIds.length === 0 ||
      !input.selectedHigherTpIds ||
      input.selectedHigherTpIds.length === 0
    ) {
      return {
        success: false,
        error: "Pilih minimal 1 TP untuk kelas rendah dan 1 TP untuk kelas tinggi dalam kelompok.",
      };
    }

    // PII check on student context
    if (containsPii(input.studentConditions)) {
      return {
        success: false,
        error:
          "Kondisi siswa mengandung data pribadi (NIK, No. HP, atau Email). Harap masukkan hanya karakteristik pedagogis atau konteks lingkungan umum tanpa PII.",
      };
    }

    // Ambil metadata kelompok & mapel
    const [group, subject] = await Promise.all([
      db.query.multigradeGroups.findFirst({
        where: eq(schema.multigradeGroups.id, input.groupId),
      }),
      db.query.subjects.findFirst({
        where: eq(schema.subjects.id, input.subjectId),
      }),
    ]);

    if (!group || !subject) {
      return { success: false, error: "Data kelompok atau mata pelajaran tidak valid." };
    }

    const grades = group.grades.split(",").map((g) => parseInt(g.trim(), 10));

    // Ambil TP yang dipilih dari database untuk memastikan ID valid dan data asli
    const allSelectedIds = [...input.selectedLowerTpIds, ...input.selectedHigherTpIds];
    const dbTps = await db
      .select({
        id: schema.tujuanPembelajaran.id,
        code: schema.tujuanPembelajaran.code,
        competency: schema.tujuanPembelajaran.competency,
        contentScope: schema.tujuanPembelajaran.contentScope,
        description: schema.tujuanPembelajaran.description,
        targetGrade: schema.tujuanPembelajaran.targetGrade,
        cpId: schema.tujuanPembelajaran.cpId,
        cpElement: schema.capaianPembelajaran.element,
      })
      .from(schema.tujuanPembelajaran)
      .leftJoin(
        schema.capaianPembelajaran,
        eq(schema.tujuanPembelajaran.cpId, schema.capaianPembelajaran.id)
      )
      .where(inArray(schema.tujuanPembelajaran.id, allSelectedIds));

    // Verifikasi bahwa seluruh TP ditemukan di DB (anti-hallucination check)
    const dbTpMap = new Map<string, typeof dbTps[0]>(dbTps.map((tp) => [tp.id, tp]));
    for (const id of allSelectedIds) {
      if (!dbTpMap.has(id)) {
        return {
          success: false,
          error: `TP dengan ID ${id} tidak ditemukan di database resmi.`,
        };
      }
    }

    const sourceTpsLowerGrade: SourceTpInput[] = input.selectedLowerTpIds
      .map((id) => dbTpMap.get(id)!)
      .map((tp) => ({
        id: tp.id,
        code: tp.code,
        competency: tp.competency,
        contentScope: tp.contentScope,
        description: tp.description,
        targetGrade: tp.targetGrade ?? Math.min(...grades),
        cpId: tp.cpId ?? undefined,
        cpElement: tp.cpElement ?? undefined,
      }));

    const sourceTpsHigherGrade: SourceTpInput[] = input.selectedHigherTpIds
      .map((id) => dbTpMap.get(id)!)
      .map((tp) => ({
        id: tp.id,
        code: tp.code,
        competency: tp.competency,
        contentScope: tp.contentScope,
        description: tp.description,
        targetGrade: tp.targetGrade ?? Math.max(...grades),
        cpId: tp.cpId ?? undefined,
        cpElement: tp.cpElement ?? undefined,
      }));

    // Ambil prasyarat antar TP yang dipilih
    const prereqs = await db
      .select({
        tpId: schema.tpPrerequisites.tpId,
        prerequisiteTpId: schema.tpPrerequisites.prerequisiteTpId,
        type: schema.tpPrerequisites.prerequisiteType,
      })
      .from(schema.tpPrerequisites)
      .where(
        and(
          inArray(schema.tpPrerequisites.tpId, allSelectedIds),
          inArray(schema.tpPrerequisites.prerequisiteTpId, allSelectedIds)
        )
      );

    const requestPayload: IntersectionMappingRequest = {
      groupId: group.id,
      groupName: group.name,
      phase: group.phase,
      classes: grades,
      subjectId: subject.id,
      subjectName: subject.name,
      academicYear: input.academicYear || "2024/2025",
      semester: input.semester || "Ganjil",
      durationMinutes: input.durationMinutes || 70,
      studentContext: input.studentConditions || undefined,
      sourceTpsLowerGrade,
      sourceTpsHigherGrade,
      prerequisites: prereqs.map((p) => ({
        tpId: p.tpId,
        prerequisiteTpId: p.prerequisiteTpId,
        type: p.type,
      })),
    };

    // Panggil AI Provider
    const provider = getAiProvider(input.providerId);
    const aiResult = await provider.generateIntersectionMapping(requestPayload);

    // Catat log penggunaan AI
    await db.insert(schema.aiUsageLogs).values({
      feature: "pemetaan_irisan_materi",
      provider: aiResult.provider,
      model: aiResult.model,
      promptTokens: aiResult.promptTokens,
      completionTokens: aiResult.completionTokens,
      totalTokens: aiResult.totalTokens,
      estimatedCostUsd: aiResult.estimatedCostUsd,
      latencyMs: aiResult.latencyMs,
      status: aiResult.success ? "success" : "error",
      errorMessage: aiResult.error || null,
      userId: user.id,
    });

    if (!aiResult.success || !aiResult.data) {
      return {
        success: false,
        error: aiResult.error || "Gagal memproses rekomendasi irisan materi dari penyedia AI.",
      };
    }

    const mappingResult = aiResult.data;

    // Strict Anti-Hallucination: Validasi semua TP ID yang direferensikan dalam output AI
    const validTpIds = new Set(allSelectedIds);
    for (const refId of mappingResult.mappingBasis.referencedTpIds) {
      if (!validTpIds.has(refId)) {
        return {
          success: false,
          error: `AI menghasilkan referensi TP ID palsu/halusinasi (${refId}) yang tidak ada dalam daftar TP sumber. Rekomendasi ditolak demi keamanan data.`,
        };
      }
    }

    // Simpan ke database dengan status "draft"
    const [inserted] = await db
      .insert(schema.multigradeMaterialMaps)
      .values({
        groupId: group.id,
        subjectId: subject.id,
        academicYear: requestPayload.academicYear,
        semester: requestPayload.semester,
        durationMinutes: requestPayload.durationMinutes,
        sharedTheme: mappingResult.sharedTheme,
        studentConditions: input.studentConditions || null,
        mappingStrategy: mappingResult.mappingStrategy,
        aiProvider: aiResult.provider,
        aiModel: aiResult.model,
        confidenceLevel: mappingResult.confidence.level,
        confidenceScore: mappingResult.confidence.score,
        confidenceDisclaimer: mappingResult.confidence.disclaimer,
        structuredOutput: mappingResult as unknown as Record<string, unknown>,
        status: "draft",
        createdById: user.id,
        version: 1,
      })
      .returning();

    // Catat Audit Log
    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "GENERATE_MATERIAL_INTERSECTION",
      targetEntity: "multigrade_material_maps",
      targetId: inserted.id,
      details: {
        groupId: group.id,
        subjectId: subject.id,
        strategy: mappingResult.mappingStrategy,
        provider: aiResult.provider,
        model: aiResult.model,
        tokenCost: aiResult.estimatedCostUsd,
      },
    });

    revalidatePath("/dashboard/kurikulum/irisan-materi");
    return {
      success: true,
      data: { mapId: inserted.id, result: mappingResult },
      message: `Analisis irisan materi berhasil disusun (${mappingResult.mappingStrategy}).`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan internal saat memproses irisan materi.",
    };
  }
}

/**
 * Membuat pemetaan irisan materi secara manual oleh guru (tanpa AI atau saat offline total).
 */
export async function createManualIntersectionAction(payload: {
  groupId: string;
  subjectId: string;
  academicYear: string;
  semester: "Ganjil" | "Genap";
  durationMinutes: number;
  sharedTheme: string;
  studentConditions?: string;
  mappingStrategy: "terpadu_sebagian" | "terpisah_paralel" | "terpadu_penuh";
  structuredOutput: IntersectionMappingResult;
  teacherNotes?: string;
}): Promise<ActionResult<{ mapId: string }>> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const parseResult = IntersectionMappingResultSchema.safeParse(payload.structuredOutput);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Format struktur pemetaan manual tidak sesuai spesifikasi.",
      };
    }

    const [inserted] = await db
      .insert(schema.multigradeMaterialMaps)
      .values({
        groupId: payload.groupId,
        subjectId: payload.subjectId,
        academicYear: payload.academicYear,
        semester: payload.semester,
        durationMinutes: payload.durationMinutes,
        sharedTheme: payload.sharedTheme,
        studentConditions: payload.studentConditions || null,
        mappingStrategy: payload.mappingStrategy,
        aiProvider: "manual",
        aiModel: "guru-manual",
        confidenceLevel: "tinggi",
        confidenceScore: 100,
        confidenceDisclaimer:
          "Pemetaan ini disusun secara manual dan divalidasi langsung oleh guru pengampu SDN Sedaeng II Tosari.",
        structuredOutput: parseResult.data as unknown as Record<string, unknown>,
        status: "draft",
        teacherNotes: payload.teacherNotes || null,
        createdById: user.id,
        version: 1,
      })
      .returning();

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "CREATE_MANUAL_MATERIAL_INTERSECTION",
      targetEntity: "multigrade_material_maps",
      targetId: inserted.id,
      details: {
        groupId: payload.groupId,
        subjectId: payload.subjectId,
        strategy: payload.mappingStrategy,
      },
    });

    revalidatePath("/dashboard/kurikulum/irisan-materi");
    return { success: true, data: { mapId: inserted.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan pemetaan manual.",
    };
  }
}

/**
 * Menyimpan pengeditan guru terhadap rekomendasi irisan materi.
 */
export async function updateMaterialIntersectionAction(
  mapId: string,
  updates: {
    sharedTheme?: string;
    studentConditions?: string;
    mappingStrategy?: "terpadu_sebagian" | "terpisah_paralel" | "terpadu_penuh";
    teacherNotes?: string;
    structuredOutput?: Partial<IntersectionMappingResult>;
  }
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const existing = await db.query.multigradeMaterialMaps.findFirst({
      where: eq(schema.multigradeMaterialMaps.id, mapId),
    });

    if (!existing) {
      return { success: false, error: "Data pemetaan irisan materi tidak ditemukan." };
    }

    let mergedStructuredOutput = existing.structuredOutput as unknown as IntersectionMappingResult;
    if (updates.structuredOutput) {
      mergedStructuredOutput = {
        ...mergedStructuredOutput,
        ...updates.structuredOutput,
      };
    }

    await db
      .update(schema.multigradeMaterialMaps)
      .set({
        sharedTheme: updates.sharedTheme ?? existing.sharedTheme,
        studentConditions: updates.studentConditions ?? existing.studentConditions,
        mappingStrategy: updates.mappingStrategy ?? existing.mappingStrategy,
        teacherNotes: updates.teacherNotes ?? existing.teacherNotes,
        structuredOutput: mergedStructuredOutput as unknown as Record<string, unknown>,
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.multigradeMaterialMaps.id, mapId));

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UPDATE_MATERIAL_INTERSECTION",
      targetEntity: "multigrade_material_maps",
      targetId: mapId,
      details: { newVersion: existing.version + 1 },
    });

    revalidatePath(`/dashboard/kurikulum/irisan-materi/${mapId}`);
    revalidatePath("/dashboard/kurikulum/irisan-materi");
    return { success: true, data: null, message: "Pemetaan materi berhasil diperbarui." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui pemetaan materi.",
    };
  }
}

/**
 * Guru menandai pemetaan materi telah ditinjau (Reviewed).
 */
export async function reviewMaterialIntersectionAction(
  mapId: string,
  teacherNotes?: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    await db
      .update(schema.multigradeMaterialMaps)
      .set({
        status: "reviewed",
        teacherNotes: teacherNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.multigradeMaterialMaps.id, mapId));

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "REVIEW_MATERIAL_INTERSECTION",
      targetEntity: "multigrade_material_maps",
      targetId: mapId,
    });

    revalidatePath(`/dashboard/kurikulum/irisan-materi/${mapId}`);
    revalidatePath("/dashboard/kurikulum/irisan-materi");
    return { success: true, data: null, message: "Status diperbarui menjadi Ditinjau." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui status peninjauan.",
    };
  }
}

/**
 * Kepala Sekolah / Administrator menyetujui pemetaan irisan materi.
 */
export async function approveMaterialIntersectionAction(
  mapId: string,
  notes?: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster"]);

    await db
      .update(schema.multigradeMaterialMaps)
      .set({
        status: "approved",
        approvedById: user.id,
        approvedAt: new Date(),
        teacherNotes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.multigradeMaterialMaps.id, mapId));

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "APPROVE_MATERIAL_INTERSECTION",
      targetEntity: "multigrade_material_maps",
      targetId: mapId,
      details: { approvedBy: user.name },
    });

    revalidatePath(`/dashboard/kurikulum/irisan-materi/${mapId}`);
    revalidatePath("/dashboard/kurikulum/irisan-materi");
    return {
      success: true,
      data: null,
      message: "Pemetaan irisan materi berhasil disetujui untuk pelaksanaan pembelajaran.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyetujui pemetaan materi.",
    };
  }
}

/**
 * Menolak pemetaan irisan materi dengan alasan koreksi.
 */
export async function rejectMaterialIntersectionAction(
  mapId: string,
  rejectionReason: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster"]);

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return { success: false, error: "Alasan penolakan / koreksi wajib diisi." };
    }

    await db
      .update(schema.multigradeMaterialMaps)
      .set({
        status: "rejected",
        rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(schema.multigradeMaterialMaps.id, mapId));

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "REJECT_MATERIAL_INTERSECTION",
      targetEntity: "multigrade_material_maps",
      targetId: mapId,
      details: { reason: rejectionReason },
    });

    revalidatePath(`/dashboard/kurikulum/irisan-materi/${mapId}`);
    revalidatePath("/dashboard/kurikulum/irisan-materi");
    return {
      success: true,
      data: null,
      message: "Pemetaan materi ditolak dan dikembalikan untuk revisi.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menolak pemetaan materi.",
    };
  }
}

/**
 * Hapus draf pemetaan irisan materi.
 */
export async function deleteMaterialIntersectionAction(mapId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const existing = await db.query.multigradeMaterialMaps.findFirst({
      where: eq(schema.multigradeMaterialMaps.id, mapId),
    });

    if (!existing) {
      return { success: false, error: "Data pemetaan tidak ditemukan." };
    }

    if (existing.status === "approved" && user.role === "teacher") {
      return {
        success: false,
        error: "Hanya Administrator atau Kepala Sekolah yang dapat menghapus pemetaan yang telah disetujui.",
      };
    }

    await db.delete(schema.multigradeMaterialMaps).where(eq(schema.multigradeMaterialMaps.id, mapId));

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "DELETE_MATERIAL_INTERSECTION",
      targetEntity: "multigrade_material_maps",
      targetId: mapId,
    });

    revalidatePath("/dashboard/kurikulum/irisan-materi");
    return { success: true, data: null, message: "Pemetaan berhasil dihapus." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghapus pemetaan.",
    };
  }
}

/**
 * Mengambil daftar seluruh pemetaan irisan materi dengan relasi kelompok & mapel.
 */
export async function getMaterialIntersectionListAction(filter?: {
  groupId?: string;
  subjectId?: string;
  status?: string;
}) {
  const conditions = [];
  if (filter?.groupId) {
    conditions.push(eq(schema.multigradeMaterialMaps.groupId, filter.groupId));
  }
  if (filter?.subjectId) {
    conditions.push(eq(schema.multigradeMaterialMaps.subjectId, filter.subjectId));
  }
  if (filter?.status) {
    conditions.push(
      eq(
        schema.multigradeMaterialMaps.status,
        filter.status as "draft" | "reviewed" | "approved" | "rejected"
      )
    );
  }

  const query = db
    .select({
      id: schema.multigradeMaterialMaps.id,
      groupId: schema.multigradeMaterialMaps.groupId,
      groupName: schema.multigradeGroups.name,
      groupPhase: schema.multigradeGroups.phase,
      groupGrades: schema.multigradeGroups.grades,
      subjectId: schema.multigradeMaterialMaps.subjectId,
      subjectName: schema.subjects.name,
      sharedTheme: schema.multigradeMaterialMaps.sharedTheme,
      mappingStrategy: schema.multigradeMaterialMaps.mappingStrategy,
      aiProvider: schema.multigradeMaterialMaps.aiProvider,
      confidenceLevel: schema.multigradeMaterialMaps.confidenceLevel,
      confidenceScore: schema.multigradeMaterialMaps.confidenceScore,
      status: schema.multigradeMaterialMaps.status,
      version: schema.multigradeMaterialMaps.version,
      academicYear: schema.multigradeMaterialMaps.academicYear,
      semester: schema.multigradeMaterialMaps.semester,
      durationMinutes: schema.multigradeMaterialMaps.durationMinutes,
      creatorName: schema.users.name,
      createdAt: schema.multigradeMaterialMaps.createdAt,
      updatedAt: schema.multigradeMaterialMaps.updatedAt,
    })
    .from(schema.multigradeMaterialMaps)
    .leftJoin(
      schema.multigradeGroups,
      eq(schema.multigradeMaterialMaps.groupId, schema.multigradeGroups.id)
    )
    .leftJoin(schema.subjects, eq(schema.multigradeMaterialMaps.subjectId, schema.subjects.id))
    .leftJoin(schema.users, eq(schema.multigradeMaterialMaps.createdById, schema.users.id))
    .orderBy(desc(schema.multigradeMaterialMaps.createdAt));

  const items = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
  return items;
}

/**
 * Mengambil detail pemetaan irisan materi berdasarkan ID.
 */
export async function getMaterialIntersectionByIdAction(mapId: string) {
  const mapData = await db.query.multigradeMaterialMaps.findFirst({
    where: eq(schema.multigradeMaterialMaps.id, mapId),
  });

  if (!mapData) return null;

  const [group, subject, creator, approver] = await Promise.all([
    db.query.multigradeGroups.findFirst({
      where: eq(schema.multigradeGroups.id, mapData.groupId),
    }),
    db.query.subjects.findFirst({
      where: eq(schema.subjects.id, mapData.subjectId),
    }),
    mapData.createdById
      ? db.query.users.findFirst({ where: eq(schema.users.id, mapData.createdById) })
      : null,
    mapData.approvedById
      ? db.query.users.findFirst({ where: eq(schema.users.id, mapData.approvedById) })
      : null,
  ]);

  return {
    ...mapData,
    group: group || null,
    subject: subject || null,
    creator: creator || null,
    approver: approver || null,
    structuredOutput: mapData.structuredOutput as unknown as IntersectionMappingResult,
  };
}
