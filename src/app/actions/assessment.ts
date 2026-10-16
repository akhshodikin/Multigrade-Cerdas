"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import {
  createAssessmentSession,
  recordStudentResults,
  getStudentProgressProfile,
  getTpAssessmentRecap,
  getMultigradeGroupRecap,
} from "@/lib/assessment/engine";
import {
  CreateAssessmentSessionInput,
  StudentResultItemInput,
} from "@/lib/assessment/types";

/**
 * Server Action: Membuat Sesi Asesmen Baru
 */
export async function createAssessmentSessionAction(input: CreateAssessmentSessionInput) {
  const user = await requireAuth(["admin", "headmaster", "teacher"]);

  try {
    const assessment = await createAssessmentSession(input, user.id);

    await db.insert(schema.auditLogs).values({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "CREATE_ASSESSMENT_SESSION",
      targetEntity: "assessments",
      targetId: assessment.id,
      details: {
        title: assessment.title,
        assessmentType: assessment.assessmentType,
        subjectId: assessment.subjectId,
        classId: assessment.classId,
      },
    });

    revalidatePath("/dashboard/asesmen");
    return {
      success: true,
      message: `Sesi asesmen '${assessment.title}' berhasil dibuat.`,
      data: assessment,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Server Action: Mencatat / Memperbarui Hasil Asesmen Siswa (Beserta Bukti Belajar)
 */
export async function recordStudentResultsAction(
  assessmentId: string,
  results: StudentResultItemInput[]
) {
  const user = await requireAuth(["admin", "headmaster", "teacher"]);

  try {
    const saved = await recordStudentResults(
      assessmentId,
      results,
      user.id,
      user.name
    );

    await db.insert(schema.auditLogs).values({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "RECORD_ASSESSMENT_RESULTS",
      targetEntity: "student_assessment_results",
      targetId: assessmentId,
      details: {
        assessmentId,
        studentCount: saved.length,
      },
    });

    revalidatePath(`/dashboard/asesmen/${assessmentId}`);
    revalidatePath("/dashboard/asesmen");
    return {
      success: true,
      message: `Berhasil mencatat bukti & hasil penilaian untuk ${saved.length} siswa.`,
      data: saved,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Server Action: Mengambil Profil Kemajuan Belajar Individual Siswa
 */
export async function getStudentProgressProfileAction(studentId: string) {
  await requireAuth(["admin", "headmaster", "teacher"]);
  try {
    const profile = await getStudentProgressProfile(studentId);
    return { success: true, data: profile };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Server Action: Mengambil Rekap Capaian per TP
 */
export async function getTpRecapAction(tpId: string) {
  await requireAuth(["admin", "headmaster", "teacher"]);
  try {
    const recap = await getTpAssessmentRecap(tpId);
    return { success: true, data: recap };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Server Action: Mengambil Rekap Kelompok Multigrade
 */
export async function getMultigradeGroupRecapAction(groupId: string) {
  await requireAuth(["admin", "headmaster", "teacher"]);
  try {
    const recap = await getMultigradeGroupRecap(groupId);
    return { success: true, data: recap };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Server Action: Menandai Tindak Lanjut Selesai / Dalam Proses
 */
export async function markFollowUpCompletedAction(resultId: string, completed: boolean) {
  const user = await requireAuth(["admin", "headmaster", "teacher"]);

  try {
    const [updated] = await db
      .update(schema.studentAssessmentResults)
      .set({
        followUpCompleted: completed,
        updatedAt: new Date(),
      })
      .where(eq(schema.studentAssessmentResults.id, resultId))
      .returning();

    await db.insert(schema.auditLogs).values({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UPDATE_FOLLOWUP_STATUS",
      targetEntity: "student_assessment_results",
      targetId: resultId,
      details: { followUpCompleted: completed },
    });

    revalidatePath("/dashboard/asesmen");
    return { success: true, message: "Status tindak lanjut diperbarui.", data: updated };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Server Action: Mengambil Kriteria Ketercapaian Sekolah (KKTP)
 */
export async function getSchoolAssessmentCriteriaAction() {
  await requireAuth(["admin", "headmaster", "teacher"]);
  let criteria = await db.query.schoolAssessmentCriteria.findFirst({
    where: eq(schema.schoolAssessmentCriteria.schoolId, 1),
  });

  if (!criteria) {
    // Inisialisasi default
    const [created] = await db
      .insert(schema.schoolAssessmentCriteria)
      .values({
        schoolId: 1,
        academicYear: "2024/2025",
        semester: "Ganjil",
        passingScoreDefault: 70,
        levelsDefinition: [
          { level: "perlu_bimbingan", label: "Perlu Bimbingan (Mulai Berkembang)", scoreMin: 0, scoreMax: 59, description: "Belum mencapai kriteria minimal TP, memerlukan intervensi remedial intensif / tutor sebaya." },
          { level: "cukup", label: "Cukup (Sedang Berkembang)", scoreMin: 60, scoreMax: 74, description: "Mencapai kriteria dengan sebagian bantuan arahan guru." },
          { level: "baik", label: "Baik (Berkembang Sesuai Harapan)", scoreMin: 75, scoreMax: 89, description: "Mencapai seluruh indikator TP secara mandiri dan akurat." },
          { level: "sangat_baik", label: "Sangat Baik (Sangat Berkembang)", scoreMin: 90, scoreMax: 100, description: "Melampaui kriteria TP, bernalar kritis mendalam dan siap menerima pengayaan eksploratif." },
        ],
        remedialPolicy: "Siswa pada level Perlu Bimbingan mendapatkan pendampingan terfokus pada rotasi kelas rangkap atau dipasangkan dengan tutor sebaya.",
        enrichmentPolicy: "Siswa pada level Sangat Baik diberikan tugas eksploratif, tantangan studi kasus lokal Tosari, atau peran sebagai tutor sebaya.",
        nonNumericalRuleStatement: "Penguasaan Capaian Pembelajaran (CP) Fase tidak boleh disimpulkan hanya dari satu angka rata-rata, melainkan berdasarkan akumulasi bukti belajar kualitatif per TP.",
      })
      .returning();
    criteria = created;
  }

  return { success: true, data: criteria };
}
