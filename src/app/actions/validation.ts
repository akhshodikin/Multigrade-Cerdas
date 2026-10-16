"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getCurrentUser, requireAuth } from "@/lib/auth/session";
import {
  validateAtpPlan,
  ValidationRuleConfig,
  ValidationReportResult,
  detectPrerequisiteCycles,
} from "@/lib/curriculum/validation-engine";
import { recordCurriculumVersion } from "@/lib/curriculum/versioning";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Jalankan validasi mendalam pada suatu ATP Plan.
 */
export async function runAtpValidationAction(
  atpPlanId: string,
  customConfig?: Partial<ValidationRuleConfig>
): Promise<ActionResult<ValidationReportResult>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    const report = await validateAtpPlan(
      atpPlanId,
      customConfig,
      true, // Simpan ke database
      { id: user.id, name: user.name }
    );

    revalidatePath(`/dashboard/kurikulum/atp/${atpPlanId}`);
    revalidatePath("/dashboard/kurikulum/validasi");
    return { success: true, data: report, message: report.summary };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menjalankan validasi ATP.",
    };
  }
}

/**
 * Perbarui status penyelesaian masalah validasi (Terbuka / Selesai / Diabaikan).
 */
export async function updateIssueResolutionAction(
  issueId: string,
  resolutionStatus: "terbuka" | "selesai" | "diabaikan",
  resolutionNotes?: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const [existing] = await db
      .select()
      .from(schema.validationIssues)
      .where(eq(schema.validationIssues.id, issueId));

    if (!existing) {
      return { success: false, error: "Masalah validasi tidak ditemukan." };
    }

    await db
      .update(schema.validationIssues)
      .set({
        resolutionStatus,
        resolutionNotes: resolutionNotes || `Diperbarui oleh ${user.name}`,
      })
      .where(eq(schema.validationIssues.id, issueId));

    revalidatePath("/dashboard/kurikulum/validasi");
    return { success: true, data: null, message: `Status masalah berhasil diubah menjadi: ${resolutionStatus}.` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui status masalah.",
    };
  }
}

/**
 * Ajukan ATP untuk ditinjau oleh Kepala Sekolah / Administrator.
 */
export async function submitAtpForReviewAction(atpPlanId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const [plan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, atpPlanId));

    if (!plan) {
      return { success: false, error: "ATP Plan tidak ditemukan." };
    }

    const previousSnapshot = { ...plan };
    const nextVersion = plan.version + 1;

    await db
      .update(schema.atpPlans)
      .set({
        status: "in_review",
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.atpPlans.id, atpPlanId));

    await recordCurriculumVersion({
      entityType: "atp",
      entityId: plan.id,
      versionNumber: nextVersion,
      changeType: "status_changed",
      changedById: user.id,
      changedByName: user.name,
      previousSnapshot,
      currentSnapshot: { ...previousSnapshot, status: "in_review", version: nextVersion },
      changeReason: "Diajukan oleh guru untuk ditinjau Kepala Sekolah.",
    });

    revalidatePath(`/dashboard/kurikulum/atp/${atpPlanId}`);
    revalidatePath("/dashboard/kurikulum/atp");
    return { success: true, data: null, message: "ATP berhasil diajukan untuk ditinjau." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengajukan ATP.",
    };
  }
}

/**
 * Setujui ATP (khusus Kepala Sekolah / Admin) setelah pemeriksaan teknis & pedagogis.
 */
export async function approveAtpWithReviewAction(
  atpPlanId: string,
  reviewNotes?: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster"]);

    // Jalankan validasi teknis
    const validation = await validateAtpPlan(atpPlanId);
    if (!validation.isValidTechnically) {
      return {
        success: false,
        error: `Persetujuan ditolak: Terdapat ${validation.criticalCount} masalah kritis teknis yang wajib diselesaikan terlebih dahulu.`,
      };
    }

    const [plan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, atpPlanId));

    if (!plan) {
      return { success: false, error: "ATP Plan tidak ditemukan." };
    }

    const previousSnapshot = { ...plan };
    const nextVersion = plan.version + 1;

    await db
      .update(schema.atpPlans)
      .set({
        status: "approved",
        approvedById: user.id,
        approvedAt: new Date(),
        rejectionNotes: null,
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.atpPlans.id, atpPlanId));

    await recordCurriculumVersion({
      entityType: "atp",
      entityId: plan.id,
      versionNumber: nextVersion,
      changeType: "status_changed",
      changedById: user.id,
      changedByName: user.name,
      previousSnapshot,
      currentSnapshot: { ...previousSnapshot, status: "approved", approvedById: user.id, version: nextVersion },
      changeReason: reviewNotes || "Disetujui oleh Kepala Sekolah / Administrator setelah telaah pedagogis.",
    });

    revalidatePath(`/dashboard/kurikulum/atp/${atpPlanId}`);
    revalidatePath("/dashboard/kurikulum/atp");
    return { success: true, data: null, message: "ATP berhasil disetujui dan siap digunakan." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyetujui ATP.",
    };
  }
}

/**
 * Tolak ATP dengan catatan alasan penolakan yang wajib diisi.
 */
export async function rejectAtpAction(
  atpPlanId: string,
  rejectionNotes: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster"]);

    if (!rejectionNotes || rejectionNotes.trim().length < 5) {
      return {
        success: false,
        error: "Catatan alasan penolakan wajib diisi minimal 5 karakter agar guru dapat memperbaiki alur.",
      };
    }

    const [plan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, atpPlanId));

    if (!plan) {
      return { success: false, error: "ATP Plan tidak ditemukan." };
    }

    const previousSnapshot = { ...plan };
    const nextVersion = plan.version + 1;

    await db
      .update(schema.atpPlans)
      .set({
        status: "rejected",
        rejectionNotes: rejectionNotes.trim(),
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.atpPlans.id, atpPlanId));

    await recordCurriculumVersion({
      entityType: "atp",
      entityId: plan.id,
      versionNumber: nextVersion,
      changeType: "status_changed",
      changedById: user.id,
      changedByName: user.name,
      previousSnapshot,
      currentSnapshot: { ...previousSnapshot, status: "rejected", rejectionNotes, version: nextVersion },
      changeReason: `Ditolak: ${rejectionNotes.trim()}`,
    });

    revalidatePath(`/dashboard/kurikulum/atp/${atpPlanId}`);
    revalidatePath("/dashboard/kurikulum/atp");
    return { success: true, data: null, message: "ATP telah ditolak dengan catatan perbaikan." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menolak ATP.",
    };
  }
}

/**
 * Terapkan ATP untuk Pembelajaran Aktif ("digunakan").
 */
export async function activateAtpForTeachingAction(atpPlanId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const [plan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, atpPlanId));

    if (!plan) {
      return { success: false, error: "ATP Plan tidak ditemukan." };
    }

    if (plan.status !== "approved") {
      return {
        success: false,
        error: "ATP hanya dapat digunakan dalam proses pembelajaran jika telah berstatus 'Disetujui' (approved).",
      };
    }

    const previousSnapshot = { ...plan };
    const nextVersion = plan.version + 1;

    await db
      .update(schema.atpPlans)
      .set({
        status: "in_use",
        inUseAt: new Date(),
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.atpPlans.id, atpPlanId));

    await recordCurriculumVersion({
      entityType: "atp",
      entityId: plan.id,
      versionNumber: nextVersion,
      changeType: "status_changed",
      changedById: user.id,
      changedByName: user.name,
      previousSnapshot,
      currentSnapshot: { ...previousSnapshot, status: "in_use", version: nextVersion },
      changeReason: "Diaktifkan sebagai panduan pembelajaran aktif di kelas multigrade.",
    });

    revalidatePath(`/dashboard/kurikulum/atp/${atpPlanId}`);
    revalidatePath("/dashboard/kurikulum/atp");
    return { success: true, data: null, message: "ATP berhasil diaktifkan untuk pembelajaran di kelas!" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengaktifkan ATP.",
    };
  }
}

/**
 * Perbarui urutan sekuensial dan alokasi jam pelajaran (JP) seluruh butir ATP.
 */
export async function updateAtpItemSequenceAndHoursAction(
  planId: string,
  items: { id: string; sequenceOrder: number; allocatedHours: number }[]
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const [plan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, planId));

    if (!plan) {
      return { success: false, error: "ATP Plan tidak ditemukan." };
    }

    // Ambil butir lama untuk snapshot
    const oldItems = await db
      .select()
      .from(schema.atpItems)
      .where(eq(schema.atpItems.atpPlanId, planId));

    // Perbarui tiap butir
    for (const item of items) {
      await db
        .update(schema.atpItems)
        .set({
          sequenceOrder: item.sequenceOrder,
          allocatedHours: item.allocatedHours,
        })
        .where(eq(schema.atpItems.id, item.id));
    }

    // Rekam versi baru ATP
    const nextVersion = plan.version + 1;
    await db
      .update(schema.atpPlans)
      .set({
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.atpPlans.id, planId));

    await recordCurriculumVersion({
      entityType: "atp",
      entityId: plan.id,
      versionNumber: nextVersion,
      changeType: "updated",
      changedById: user.id,
      changedByName: user.name,
      previousSnapshot: { plan, items: oldItems },
      currentSnapshot: { plan: { ...plan, version: nextVersion }, items },
      changeReason: "Penyesuaian urutan langkah pembelajaran dan alokasi JP oleh pendidik.",
    });

    revalidatePath(`/dashboard/kurikulum/atp/${planId}`);
    return { success: true, data: null, message: "Urutan alur ATP dan alokasi JP berhasil diperbarui." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui urutan ATP.",
    };
  }
}

/**
 * Tambah relasi prasyarat belajar pada Tujuan Pembelajaran (dengan deteksi siklus sirkular).
 */
export async function addTpPrerequisiteAction(
  tpId: string,
  prerequisiteTpId: string,
  prerequisiteType: "wajib" | "dianjurkan",
  notes?: string
): Promise<ActionResult> {
  try {
    await requireAuth(["admin", "headmaster", "teacher"]);

    if (tpId === prerequisiteTpId) {
      return { success: false, error: "TP tidak dapat mensyaratkan dirinya sendiri." };
    }

    // Ambil seluruh prasyarat yang ada untuk cek siklus
    const existingPrereqs = await db.select().from(schema.tpPrerequisites);
    const simulated = [...existingPrereqs, { tpId, prerequisiteTpId }];

    const cycleCheck = detectPrerequisiteCycles(simulated);
    if (cycleCheck.hasCycle) {
      return {
        success: false,
        error: `Tidak dapat menambahkan prasyarat: Terdeteksi siklus sirkular (${cycleCheck.cyclePath?.join(" → ")}).`,
      };
    }

    await db.insert(schema.tpPrerequisites).values({
      tpId,
      prerequisiteTpId,
      prerequisiteType,
      notes: notes || null,
    });

    revalidatePath(`/dashboard/kurikulum/tp/${tpId}`);
    revalidatePath("/dashboard/kurikulum/tp");
    return { success: true, data: null, message: "Prasyarat pembelajaran berhasil ditambahkan." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menambahkan prasyarat.",
    };
  }
}

/**
 * Hapus relasi prasyarat belajar.
 */
export async function removeTpPrerequisiteAction(prerequisiteId: string, tpId: string): Promise<ActionResult> {
  try {
    await requireAuth(["admin", "headmaster", "teacher"]);

    await db.delete(schema.tpPrerequisites).where(eq(schema.tpPrerequisites.id, prerequisiteId));

    revalidatePath(`/dashboard/kurikulum/tp/${tpId}`);
    revalidatePath("/dashboard/kurikulum/tp");
    return { success: true, data: null, message: "Prasyarat berhasil dihapus." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghapus prasyarat.",
    };
  }
}

/**
 * Ubah rumusan Tujuan Pembelajaran (TP) secara pedagogis sesuai kebutuhan kelas tanpa mengubah teks CP asli.
 */
export async function updateTpPedagogicalAction(
  tpId: string,
  data: {
    competency: string;
    contentScope: string;
    description: string;
    targetGrade?: number;
    sourceType?: "verbatim_source" | "derived_teacher" | "ai_assisted";
    changeReason?: string;
  }
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["admin", "headmaster", "teacher"]);

    const [tp] = await db
      .select()
      .from(schema.tujuanPembelajaran)
      .where(eq(schema.tujuanPembelajaran.id, tpId));

    if (!tp) {
      return { success: false, error: "Tujuan Pembelajaran tidak ditemukan." };
    }

    const previousSnapshot = { ...tp };
    const nextVersion = tp.version + 1;

    await db
      .update(schema.tujuanPembelajaran)
      .set({
        competency: data.competency.trim(),
        contentScope: data.contentScope.trim(),
        description: data.description.trim(),
        targetGrade: data.targetGrade || tp.targetGrade,
        sourceType: data.sourceType || tp.sourceType,
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.tujuanPembelajaran.id, tpId));

    await recordCurriculumVersion({
      entityType: "tp",
      entityId: tp.id,
      versionNumber: nextVersion,
      changeType: "updated",
      changedById: user.id,
      changedByName: user.name,
      previousSnapshot,
      currentSnapshot: { ...previousSnapshot, ...data, version: nextVersion },
      changeReason: data.changeReason || "Penyesuaian pedagogis deskripsi TP tanpa mengubah teks CP resmi.",
    });

    revalidatePath(`/dashboard/kurikulum/tp/${tpId}`);
    revalidatePath("/dashboard/kurikulum/tp");
    return { success: true, data: null, message: "Tujuan Pembelajaran berhasil diperbarui dengan aman." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui TP.",
    };
  }
}
