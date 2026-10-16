"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, inArray, like } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import {
  generateDifferentiatedLkpdPair,
  generateComplementaryMediaSet,
  checkLkpdCurriculumIntegrity,
} from "@/lib/lkpd-media/generator";
import { GenerateDifferentiatedLkpdOptions, LkpdStatus } from "@/lib/lkpd-media/types";

/**
 * Server Action: Generate sepasang LKPD berdiferensiasi untuk kelas rangkap
 */
export async function generateLkpdPairAction(options: GenerateDifferentiatedLkpdOptions) {
  const user = await requireAuth(["admin", "headmaster", "teacher"]);

  try {
    const result = await generateDifferentiatedLkpdPair(options, user.id);

    // Catat log audit
    await db.insert(schema.auditLogs).values({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "GENERATE_LKPD_PAIR",
      targetEntity: "lkpd_worksheets",
      targetId: result.lowerGradeLkpd.id,
      details: {
        lowerGrade: result.lowerGradeLkpd.grade,
        higherGrade: result.higherGradeLkpd.grade,
        themeOrTopic: options.themeOrTopic,
        subjectId: options.subjectId,
      },
    });

    revalidatePath("/dashboard/kurikulum/lkpd");
    return {
      success: true,
      message: `Sepasang LKPD untuk Kelas ${result.lowerGradeLkpd.grade} & ${result.higherGradeLkpd.grade} berhasil dibuat!`,
      data: {
        lowerGradeLkpd: result.lowerGradeLkpd,
        higherGradeLkpd: result.higherGradeLkpd,
      },
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Server Action: Mengambil daftar LKPD
 */
export async function getLkpdListAction(filter?: {
  groupId?: string;
  grade?: number;
  subjectId?: string;
  status?: string;
}) {
  await requireAuth(["admin", "headmaster", "teacher"]);

  let query = db
    .select({
      id: schema.lkpdWorksheets.id,
      title: schema.lkpdWorksheets.title,
      grade: schema.lkpdWorksheets.grade,
      groupId: schema.lkpdWorksheets.groupId,
      subjectId: schema.lkpdWorksheets.subjectId,
      subjectName: schema.subjects.name,
      phase: schema.lkpdWorksheets.phase,
      themeOrTopic: schema.lkpdWorksheets.themeOrTopic,
      targetTpCode: schema.lkpdWorksheets.targetTpCode,
      status: schema.lkpdWorksheets.status,
      version: schema.lkpdWorksheets.version,
      timeAllocationMinutes: schema.lkpdWorksheets.timeAllocationMinutes,
      createdAt: schema.lkpdWorksheets.createdAt,
      updatedAt: schema.lkpdWorksheets.updatedAt,
      authorName: schema.users.name,
    })
    .from(schema.lkpdWorksheets)
    .leftJoin(schema.subjects, eq(schema.lkpdWorksheets.subjectId, schema.subjects.id))
    .leftJoin(schema.users, eq(schema.lkpdWorksheets.authorId, schema.users.id))
    .orderBy(desc(schema.lkpdWorksheets.createdAt));

  const list = await query;

  // Filter di memori jika ada kriteria
  const filtered = list.filter((item) => {
    if (filter?.groupId && item.groupId !== filter.groupId) return false;
    if (filter?.grade && item.grade !== filter.grade) return false;
    if (filter?.subjectId && item.subjectId !== filter.subjectId) return false;
    if (filter?.status && item.status !== filter.status) return false;
    return true;
  });

  return { success: true, data: filtered };
}

/**
 * Server Action: Mengambil detail lengkap LKPD
 */
export async function getLkpdDetailsAction(lkpdId: string) {
  await requireAuth(["admin", "headmaster", "teacher"]);

  const [lkpd, school] = await Promise.all([
    db.query.lkpdWorksheets.findFirst({
      where: eq(schema.lkpdWorksheets.id, lkpdId),
    }),
    db.query.schoolProfile.findFirst(),
  ]);

  if (!lkpd) {
    return { success: false, error: "LKPD tidak ditemukan." };
  }

  // Ambil info pendukung
  const [subject, group, author, approver] = await Promise.all([
    db.query.subjects.findFirst({ where: eq(schema.subjects.id, lkpd.subjectId) }),
    db.query.multigradeGroups.findFirst({ where: eq(schema.multigradeGroups.id, lkpd.groupId) }),
    lkpd.authorId ? db.query.users.findFirst({ where: eq(schema.users.id, lkpd.authorId) }) : null,
    lkpd.approvedById ? db.query.users.findFirst({ where: eq(schema.users.id, lkpd.approvedById) }) : null,
  ]);

  // Cari apakah ada media pendukung terkait modul ajar atau kelompok
  let relatedMedia: (typeof schema.learningMediaItems.$inferSelect)[] = [];
  if (lkpd.lessonPlanId) {
    relatedMedia = await db.query.learningMediaItems.findMany({
      where: eq(schema.learningMediaItems.lessonPlanId, lkpd.lessonPlanId),
    });
  } else {
    relatedMedia = await db.query.learningMediaItems.findMany({
      where: and(
        eq(schema.learningMediaItems.groupId, lkpd.groupId),
        eq(schema.learningMediaItems.subjectId, lkpd.subjectId)
      ),
      limit: 6,
    });
  }

  return {
    success: true,
    data: {
      lkpd,
      school,
      subject,
      group,
      authorName: author?.name,
      approverName: approver?.name,
      relatedMedia,
    },
  };
}

/**
 * Server Action: Memperbarui konten LKPD
 */
export async function updateLkpdAction(
  lkpdId: string,
  updates: Partial<typeof schema.lkpdWorksheets.$inferInsert>
) {
  const user = await requireAuth(["admin", "headmaster", "teacher"]);

  const existing = await db.query.lkpdWorksheets.findFirst({
    where: eq(schema.lkpdWorksheets.id, lkpdId),
  });

  if (!existing) {
    return { success: false, error: "LKPD tidak ditemukan." };
  }

  const nextVersion = existing.version + 1;

  const [updated] = await db
    .update(schema.lkpdWorksheets)
    .set({
      ...updates,
      version: nextVersion,
      updatedAt: new Date(),
    })
    .where(eq(schema.lkpdWorksheets.id, lkpdId))
    .returning();

  // Audit log
  await db.insert(schema.auditLogs).values({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "UPDATE_LKPD",
    targetEntity: "lkpd_worksheets",
    targetId: lkpdId,
    details: { version: nextVersion, title: updated.title },
  });

  revalidatePath(`/dashboard/kurikulum/lkpd/${lkpdId}`);
  revalidatePath("/dashboard/kurikulum/lkpd");

  return { success: true, message: `LKPD versi ${nextVersion} berhasil disimpan.`, data: updated };
}

/**
 * Server Action: Duplikasi LKPD
 */
export async function duplicateLkpdAction(lkpdId: string) {
  const user = await requireAuth(["admin", "headmaster", "teacher"]);

  const original = await db.query.lkpdWorksheets.findFirst({
    where: eq(schema.lkpdWorksheets.id, lkpdId),
  });

  if (!original) {
    return { success: false, error: "LKPD asli tidak ditemukan." };
  }

  const [cloned] = await db
    .insert(schema.lkpdWorksheets)
    .values({
      ...original,
      id: undefined,
      title: `${original.title} (Salinan)`,
      status: "draft",
      version: 1,
      versionNotes: `Diduplikasi dari LKPD ID: ${original.id}`,
      clonedFromId: original.id,
      authorId: user.id,
      approvedById: null,
      approvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  await db.insert(schema.auditLogs).values({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "DUPLICATE_LKPD",
    targetEntity: "lkpd_worksheets",
    targetId: cloned.id,
    details: { clonedFromId: original.id, newTitle: cloned.title },
  });

  revalidatePath("/dashboard/kurikulum/lkpd");
  return { success: true, message: "LKPD berhasil diduplikasi sebagai draf baru.", data: cloned };
}

/**
 * Server Action: Persetujuan LKPD oleh Kepala Sekolah / Admin
 */
export async function approveLkpdAction(lkpdId: string) {
  const user = await requireAuth(["admin", "headmaster"]);

  try {
    const [updated] = await db
      .update(schema.lkpdWorksheets)
      .set({
        status: "approved",
        approvedById: user.id,
        approvedAt: new Date(),
        rejectionNotes: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.lkpdWorksheets.id, lkpdId))
      .returning();

    await db.insert(schema.auditLogs).values({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "APPROVE_LKPD",
      targetEntity: "lkpd_worksheets",
      targetId: lkpdId,
      details: { status: "approved" },
    });

    revalidatePath(`/dashboard/kurikulum/lkpd/${lkpdId}`);
    revalidatePath("/dashboard/kurikulum/lkpd");

    return { success: true, message: "LKPD telah resmi disetujui Kepala Sekolah.", data: updated };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Server Action: Publikasikan LKPD
 */
export async function publishLkpdAction(lkpdId: string) {
  const user = await requireAuth(["admin", "headmaster", "teacher"]);

  try {
    const [updated] = await db
      .update(schema.lkpdWorksheets)
      .set({
        status: "published",
        updatedAt: new Date(),
      })
      .where(eq(schema.lkpdWorksheets.id, lkpdId))
      .returning();

    revalidatePath(`/dashboard/kurikulum/lkpd/${lkpdId}`);
    revalidatePath("/dashboard/kurikulum/lkpd");

    return { success: true, message: "LKPD resmi diterbitkan untuk kegiatan pembelajaran.", data: updated };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Server Action: Penolakan LKPD dengan Catatan Revisi
 */
export async function rejectLkpdAction(lkpdId: string, notes: string) {
  const user = await requireAuth(["admin", "headmaster"]);

  if (!notes || notes.trim().length === 0) {
    return { success: false, error: "Catatan perbaikan wajib disertakan saat menolak LKPD." };
  }

  const [updated] = await db
    .update(schema.lkpdWorksheets)
    .set({
      status: "draft",
      rejectionNotes: notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.lkpdWorksheets.id, lkpdId))
    .returning();

  await db.insert(schema.auditLogs).values({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "REJECT_LKPD",
    targetEntity: "lkpd_worksheets",
    targetId: lkpdId,
    details: { reason: notes },
  });

  revalidatePath(`/dashboard/kurikulum/lkpd/${lkpdId}`);
  revalidatePath("/dashboard/kurikulum/lkpd");

  return { success: true, message: "LKPD dikembalikan ke status draf untuk direvisi.", data: updated };
}

/**
 * Server Action: Mengambil Item Perpustakaan Media
 */
export async function getMediaLibraryAction(filter?: {
  mediaType?: string;
  subjectId?: string;
  phase?: string;
  search?: string;
}) {
  await requireAuth(["admin", "headmaster", "teacher"]);

  let query = db
    .select({
      id: schema.learningMediaItems.id,
      title: schema.learningMediaItems.title,
      mediaType: schema.learningMediaItems.mediaType,
      subjectId: schema.learningMediaItems.subjectId,
      subjectName: schema.subjects.name,
      phase: schema.learningMediaItems.phase,
      targetGrade: schema.learningMediaItems.targetGrade,
      groupId: schema.learningMediaItems.groupId,
      description: schema.learningMediaItems.description,
      tags: schema.learningMediaItems.tags,
      contentData: schema.learningMediaItems.contentData,
      colorModeSupported: schema.learningMediaItems.colorModeSupported,
      isPublicLibrary: schema.learningMediaItems.isPublicLibrary,
      createdAt: schema.learningMediaItems.createdAt,
      authorName: schema.users.name,
    })
    .from(schema.learningMediaItems)
    .leftJoin(schema.subjects, eq(schema.learningMediaItems.subjectId, schema.subjects.id))
    .leftJoin(schema.users, eq(schema.learningMediaItems.authorId, schema.users.id))
    .orderBy(desc(schema.learningMediaItems.createdAt));

  const items = await query;

  const filtered = items.filter((item) => {
    if (filter?.mediaType && filter.mediaType !== "semua" && item.mediaType !== filter.mediaType) return false;
    if (filter?.subjectId && filter.subjectId !== "semua" && item.subjectId !== filter.subjectId) return false;
    if (filter?.phase && filter.phase !== "semua" && item.phase !== filter.phase) return false;
    if (filter?.search && filter.search.trim().length > 0) {
      const q = filter.search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      return matchTitle || matchDesc;
    }
    return true;
  });

  return { success: true, data: filtered };
}

/**
 * Server Action: Generate Media Pembelajaran untuk Modul Ajar / Tema
 */
export async function generateMediaForLessonPlanAction(options: {
  lessonPlanId?: string;
  groupId: string;
  subjectId: string;
  themeOrTopic: string;
}) {
  const user = await requireAuth(["admin", "headmaster", "teacher"]);

  try {
    const result = await generateComplementaryMediaSet(options, user.id);

    await db.insert(schema.auditLogs).values({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "GENERATE_MEDIA_SET",
      targetEntity: "learning_media_items",
      targetId: options.lessonPlanId || options.groupId,
      details: { themeOrTopic: options.themeOrTopic, subjectId: options.subjectId },
    });

    revalidatePath("/dashboard/kurikulum/media-pembelajaran");
    return {
      success: true,
      message: "Paket 5 media pembelajaran (kartu gambar, bacaan bertingkat, literasi-numerasi, presentasi, ilustrasi) berhasil dibuat!",
      data: result,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Server Action: Verifikasi Integritas Kurikulum LKPD
 */
export async function verifyLkpdCurriculumAction(lkpdId: string) {
  await requireAuth(["admin", "headmaster", "teacher"]);
  try {
    const report = await checkLkpdCurriculumIntegrity(lkpdId);
    return { success: true, data: report };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}
