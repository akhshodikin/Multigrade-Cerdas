import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { ReportTypeEnum, ExportFormatEnum, type ReportType, type ExportFormat } from "@/lib/reports/types";
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

export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type");
    const formatParam = searchParams.get("format");

    const typeParse = ReportTypeEnum.safeParse(typeParam);
    if (!typeParse.success) {
      return NextResponse.json(
        { error: `Tipe laporan '${typeParam}' tidak valid.` },
        { status: 400 }
      );
    }

    const formatParse = ExportFormatEnum.safeParse(formatParam);
    if (!formatParse.success || formatParse.data === "print_html") {
      return NextResponse.json(
        { error: `Format ekspor '${formatParam}' tidak valid. Pilih 'pdf', 'docx', atau 'xlsx'.` },
        { status: 400 }
      );
    }

    const reportType = typeParse.data as ReportType;
    const format = formatParse.data as ExportFormat;

    const studentId = searchParams.get("studentId") || undefined;
    const groupId = searchParams.get("groupId") || undefined;
    const subjectId = searchParams.get("subjectId") || undefined;
    const planId = searchParams.get("planId") || undefined;
    const lessonPlanId = searchParams.get("lessonPlanId") || undefined;
    const worksheetId = searchParams.get("worksheetId") || undefined;
    const mapId = searchParams.get("mapId") || undefined;
    const semester = searchParams.get("semester") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    let reportData;
    switch (reportType) {
      case "atp_multigrade":
        reportData = await fetchAtpReportData({ planId, groupId, semester });
        break;
      case "irisan_materi":
        reportData = await fetchMaterialIntersectionReportData({ mapId, groupId, subjectId });
        break;
      case "modul_ajar":
        reportData = await fetchModulAjarReportData({ lessonPlanId });
        break;
      case "lkpd":
        reportData = await fetchLkpdReportData({ worksheetId });
        break;
      case "jurnal_mengajar":
        reportData = await fetchTeachingJournalReportData({ groupId, startDate, endDate });
        break;
      case "rekap_asesmen":
        reportData = await fetchAssessmentRecapReportData({ groupId, subjectId });
        break;
      case "kemajuan_siswa":
        if (!studentId) {
          return NextResponse.json(
            { error: "Parameter 'studentId' wajib disertakan untuk laporan kemajuan belajar siswa." },
            { status: 400 }
          );
        }
        reportData = await fetchStudentProgressReportData(studentId, currentUser);
        break;
      case "ketercapaian_tp":
        reportData = await fetchTpCoverageReportData({ groupId, subjectId });
        break;
      case "daftar_tindak_lanjut":
        reportData = await fetchFollowUpQueueReportData({ groupId });
        break;
      case "ringkasan_kepala_sekolah":
        reportData = await fetchPrincipalExecutiveSummaryData({ semester });
        break;
    }

    const filterParameters: Record<string, unknown> = {
      studentId,
      groupId,
      subjectId,
      planId,
      lessonPlanId,
      worksheetId,
      mapId,
      semester,
    };

    const result = await generateAndTrackReport(
      reportData,
      format,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      filterParameters
    );

    const uint8Array = new Uint8Array(result.buffer);

    return new Response(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": result.fileSizeBytes.toString(),
        "X-Report-Version": result.version.toString(),
        "X-Report-Checksum": result.checksum,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const status = errorMsg.includes("Akses ditolak") ? 403 : 500;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}
