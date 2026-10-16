"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/audit/logger";
import { revalidatePath } from "next/cache";
import type { ReportType, ExportFormat, AnyReportData } from "@/lib/reports/types";
import {
  fetchAtpReportData,
  fetchMaterialIntersectionReportData,
  fetchModulAjarReportData,
  fetchLkpdReportData,
  fetchTeachingJournalReportData,
  fetchAssessmentRecapReportData,
  fetchStudentProgressReportData,
  fetchTpCoverageReportData,
  fetchFollowUpQueueReportData,
  fetchPrincipalExecutiveSummaryData,
} from "@/lib/reports/data-fetchers";
import { generateAndTrackReport } from "@/lib/reports/version-tracker";

/**
 * Server Action: Mengambil data laporan teragregasi langsung dari database
 */
export async function getReportDataAction(
  reportType: ReportType,
  filterParams: Record<string, string> = {}
): Promise<{ success: boolean; data?: AnyReportData; error?: string }> {
  try {
    const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

    let reportData: AnyReportData;

    switch (reportType) {
      case "atp_multigrade":
        reportData = await fetchAtpReportData({
          planId: filterParams.planId,
          groupId: filterParams.groupId,
          semester: filterParams.semester,
        });
        break;
      case "irisan_materi":
        reportData = await fetchMaterialIntersectionReportData({
          mapId: filterParams.mapId,
          groupId: filterParams.groupId,
          subjectId: filterParams.subjectId,
        });
        break;
      case "modul_ajar":
        reportData = await fetchModulAjarReportData({
          lessonPlanId: filterParams.lessonPlanId,
        });
        break;
      case "lkpd":
        reportData = await fetchLkpdReportData({
          worksheetId: filterParams.worksheetId,
        });
        break;
      case "jurnal_mengajar":
        reportData = await fetchTeachingJournalReportData({
          groupId: filterParams.groupId,
          startDate: filterParams.startDate,
          endDate: filterParams.endDate,
        });
        break;
      case "rekap_asesmen":
        reportData = await fetchAssessmentRecapReportData({
          groupId: filterParams.groupId,
          subjectId: filterParams.subjectId,
        });
        break;
      case "kemajuan_siswa":
        if (!filterParams.studentId) {
          throw new Error("Parameter 'studentId' wajib disertakan untuk laporan kemajuan belajar individual.");
        }
        reportData = await fetchStudentProgressReportData(
          filterParams.studentId,
          currentUser
        );
        break;
      case "ketercapaian_tp":
        reportData = await fetchTpCoverageReportData({
          groupId: filterParams.groupId,
          subjectId: filterParams.subjectId,
        });
        break;
      case "daftar_tindak_lanjut":
        reportData = await fetchFollowUpQueueReportData({
          groupId: filterParams.groupId,
        });
        break;
      case "ringkasan_kepala_sekolah":
        reportData = await fetchPrincipalExecutiveSummaryData({
          academicYear: filterParams.academicYear,
          semester: filterParams.semester,
        });
        break;
      default:
        throw new Error(`Tipe laporan '${reportType}' tidak dikenali.`);
    }

    return { success: true, data: reportData };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Mengambil riwayat versi ekspor dokumen
 */
export async function getExportHistoryAction(reportType?: ReportType) {
  await requireAuth(["admin", "headmaster", "teacher"]);

  let whereClause = undefined;
  if (reportType) {
    whereClause = eq(schema.reportExportHistory.reportType, reportType);
  }

  const histories = await db.query.reportExportHistory.findMany({
    where: whereClause,
    orderBy: [desc(schema.reportExportHistory.createdAt)],
    limit: 50,
  });

  return histories;
}

/**
 * Server Action: Mencatat entri Jurnal Mengajar Kelas Rangkap baru
 */
export async function createTeachingJournalAction(input: {
  date: string;
  groupId: string;
  subjectId: string;
  allocatedHours: number;
  lowerGrade: number;
  higherGrade: number;
  lowerGradeTpCode?: string;
  lowerGradeTpText?: string;
  higherGradeTpCode?: string;
  higherGradeTpText?: string;
  rotationActivityDescription: string;
  attendancePresent: number;
  attendanceSick: number;
  attendancePermit: number;
  attendanceAbsent: number;
  learningEvidenceSummary?: string;
  challengesEncountered?: string;
  teacherReflection: string;
  nextActionPlan: string;
}) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const [journal] = await db
    .insert(schema.teachingJournals)
    .values({
      date: input.date,
      groupId: input.groupId,
      subjectId: input.subjectId,
      allocatedHours: input.allocatedHours,
      lowerGrade: input.lowerGrade,
      higherGrade: input.higherGrade,
      lowerGradeTpCode: input.lowerGradeTpCode,
      lowerGradeTpText: input.lowerGradeTpText,
      higherGradeTpCode: input.higherGradeTpCode,
      higherGradeTpText: input.higherGradeTpText,
      rotationActivityDescription: input.rotationActivityDescription,
      attendancePresent: input.attendancePresent,
      attendanceSick: input.attendanceSick,
      attendancePermit: input.attendancePermit,
      attendanceAbsent: input.attendanceAbsent,
      learningEvidenceSummary: input.learningEvidenceSummary,
      challengesEncountered: input.challengesEncountered,
      teacherReflection: input.teacherReflection,
      nextActionPlan: input.nextActionPlan,
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      verifiedByHeadmaster: false,
    })
    .returning();

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "CREATE_TEACHING_JOURNAL",
    targetEntity: "teaching_journals",
    targetId: journal.id,
    details: { groupId: input.groupId, date: input.date, subjectId: input.subjectId },
  });

  revalidatePath("/dashboard/laporan");
  return { success: true, journal };
}

/**
 * Server Action: Verifikasi Jurnal Mengajar oleh Kepala Sekolah
 */
export async function verifyTeachingJournalAction(journalId: string) {
  const currentUser = await requireAuth(["admin", "headmaster"]);

  const [updated] = await db
    .update(schema.teachingJournals)
    .set({
      verifiedByHeadmaster: true,
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.teachingJournals.id, journalId))
    .returning();

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "VERIFY_TEACHING_JOURNAL",
    targetEntity: "teaching_journals",
    targetId: journalId,
    details: { verifiedBy: currentUser.name },
  });

  revalidatePath("/dashboard/laporan");
  return { success: true, updated };
}
