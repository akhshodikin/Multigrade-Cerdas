import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ReportTypeEnum, type ReportType } from "@/lib/reports/types";
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
  getOfficialSchoolHeader,
} from "@/lib/reports/data-fetchers";
import { ReportHubWorkspace } from "@/components/reports/ReportHubWorkspace";

export default async function LaporanPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);
  const searchParams = await props.searchParams;

  const typeParam = searchParams.type || "atp_multigrade";
  const parsedType = ReportTypeEnum.safeParse(typeParam);
  const activeType: ReportType = parsedType.success ? parsedType.data : "atp_multigrade";

  const school = await getOfficialSchoolHeader();
  const multigradeGroups = await db.query.multigradeGroups.findMany();
  const subjects = await db.query.subjects.findMany();
  const students = await db.query.students.findMany({
    where: eq(schema.students.isActive, true),
    orderBy: [schema.students.classId, schema.students.studentCode],
  });

  const exportHistories = await db.query.reportExportHistory.findMany({
    orderBy: [desc(schema.reportExportHistory.createdAt)],
    limit: 50,
  });

  const studentId = searchParams.studentId || students[0]?.id;
  const groupId = searchParams.groupId;
  const subjectId = searchParams.subjectId;

  let reportData;
  try {
    switch (activeType) {
      case "atp_multigrade":
        reportData = await fetchAtpReportData({ groupId });
        break;
      case "irisan_materi":
        reportData = await fetchMaterialIntersectionReportData({ groupId, subjectId });
        break;
      case "modul_ajar":
        reportData = await fetchModulAjarReportData({});
        break;
      case "lkpd":
        reportData = await fetchLkpdReportData({});
        break;
      case "jurnal_mengajar":
        reportData = await fetchTeachingJournalReportData({ groupId });
        break;
      case "rekap_asesmen":
        reportData = await fetchAssessmentRecapReportData({ groupId, subjectId });
        break;
      case "kemajuan_siswa":
        reportData = await fetchStudentProgressReportData(studentId, currentUser);
        break;
      case "ketercapaian_tp":
        reportData = await fetchTpCoverageReportData({ groupId, subjectId });
        break;
      case "daftar_tindak_lanjut":
        reportData = await fetchFollowUpQueueReportData({ groupId });
        break;
      case "ringkasan_kepala_sekolah":
        reportData = await fetchPrincipalExecutiveSummaryData();
        break;
    }
  } catch (err: unknown) {
    // Fallback gracefully to ATP report if specific query failed
    reportData = await fetchAtpReportData({});
  }

  return (
    <div className="max-w-7xl mx-auto py-4 px-2 sm:px-4">
      <ReportHubWorkspace
        initialReportData={reportData}
        initialType={activeType}
        school={school}
        currentUser={{
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          assignedGroupId: currentUser.assignedGroupId,
        }}
        multigradeGroups={multigradeGroups}
        subjects={subjects}
        students={students.map((s) => ({
          id: s.id,
          studentCode: s.studentCode,
          displayName: s.displayName,
          fullName: s.fullName,
          classId: s.classId,
          groupId: s.groupId,
        }))}
        exportHistories={exportHistories}
      />
    </div>
  );
}
