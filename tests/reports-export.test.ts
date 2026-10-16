import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import {
  getOfficialSchoolHeader,
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
} from "../src/lib/reports/data-fetchers";
import { generateReportPdf } from "../src/lib/reports/generators/pdf-generator";
import { generateReportDocx } from "../src/lib/reports/generators/docx-generator";
import { generateReportXlsx } from "../src/lib/reports/generators/xlsx-generator";
import { generateAndTrackReport } from "../src/lib/reports/version-tracker";
import * as XLSX from "xlsx";

describe("Pengujian Modul Laporan dan Ekspor Multigrade Cerdas AI", () => {
  let sampleStudentA: typeof schema.students.$inferSelect;
  let sampleStudentB: typeof schema.students.$inferSelect;
  let teacherUserA: typeof schema.users.$inferSelect;
  let teacherUserB: typeof schema.users.$inferSelect;
  let headmasterUser: typeof schema.users.$inferSelect;

  beforeAll(async () => {
    // Ambil data referensi dari database untuk pengujian nyata
    const students = await db.query.students.findMany({ limit: 10 });
    sampleStudentA = students.find((s) => s.groupId === "group-a") || students[0];
    sampleStudentB = students.find((s) => s.groupId === "group-b") || students[1];

    const users = await db.query.users.findMany();
    teacherUserA = users.find((u) => u.assignedGroupId === "group-a") || {
      id: "teacher-a-id",
      name: "Rina Wulandari, S.Pd.",
      role: "teacher",
      assignedGroupId: "group-a",
    } as any;

    teacherUserB = users.find((u) => u.assignedGroupId === "group-b") || {
      id: "teacher-b-id",
      name: "Joko Prasetyo, S.Pd.",
      role: "teacher",
      assignedGroupId: "group-b",
    } as any;

    headmasterUser = users.find((u) => u.role === "headmaster") || {
      id: "headmaster-id",
      name: "Bambang Sutrisno, S.Pd., M.Pd.",
      role: "headmaster",
      assignedGroupId: null,
    } as any;
  });

  // 1. Identitas Resmi Sekolah SDN Kandangan I Tosari
  it("harus menggunakan identitas resmi SDN Kandangan I Tosari dari database", async () => {
    const school = await getOfficialSchoolHeader();
    expect(school.name).toContain("SDN Kandangan I Tosari");
    expect(school.npsn).toBe("20519069");
    expect(school.address).toContain("Kandangan");
    expect(school.address).toContain("Tosari");
    expect(school.headmasterName).toBeDefined();
    expect(school.activeAcademicYear).toBeDefined();
  });

  // 2. Konsistensi Data: 10 Jenis Laporan
  it("harus mengambil data nyata untuk ke-10 jenis laporan tanpa data contoh fiktif", async () => {
    // 1. ATP Multigrade
    const atpData = await fetchAtpReportData({ groupId: "group-a" });
    expect(atpData.reportType).toBe("atp_multigrade");
    expect(atpData.school.name).toContain("SDN Kandangan I Tosari");
    expect(atpData.items.length).toBeGreaterThan(0);
    expect(atpData.signature.headmasterName).toBeDefined();

    // 2. Pemetaan Irisan TP
    const mapData = await fetchMaterialIntersectionReportData({ groupId: "group-a" });
    expect(mapData.reportType).toBe("irisan_materi");
    expect(mapData.theme).toBeDefined();
    expect(mapData.rotationSteps.length).toBeGreaterThan(0);

    // 3. Modul Ajar
    const modulData = await fetchModulAjarReportData({});
    expect(modulData.reportType).toBe("modul_ajar");
    expect(modulData.rotationSteps.length).toBeGreaterThan(0);

    // 4. LKPD
    const lkpdData = await fetchLkpdReportData({});
    expect(lkpdData.reportType).toBe("lkpd");
    expect(lkpdData.targetGrade).toBeDefined();
    expect(lkpdData.questions.length).toBeGreaterThan(0);

    // 5. Jurnal Mengajar
    const journalData = await fetchTeachingJournalReportData({ groupId: "group-a" });
    expect(journalData.reportType).toBe("jurnal_mengajar");
    expect(journalData.journals.length).toBeGreaterThan(0);
    expect(journalData.journals[0].attendance.present).toBeGreaterThan(0);

    // 6. Rekap Asesmen
    const recapData = await fetchAssessmentRecapReportData({});
    expect(recapData.reportType).toBe("rekap_asesmen");
    expect(Array.isArray(recapData.sessions)).toBe(true);

    // 7. Kemajuan Belajar Siswa (Authorized Teacher)
    const studentData = await fetchStudentProgressReportData(sampleStudentA.id, {
      id: teacherUserA.id,
      role: "teacher",
      assignedGroupId: "group-a",
    });
    expect(studentData.reportType).toBe("kemajuan_siswa");
    expect(studentData.student.studentCode).toBe(sampleStudentA.studentCode);
    expect(studentData.nonNumericalMasteryDisclaimer).toContain("tidak boleh disimpulkan");

    // 8. Rekap Ketercapaian TP
    const tpCoverageData = await fetchTpCoverageReportData({});
    expect(tpCoverageData.reportType).toBe("ketercapaian_tp");
    expect(tpCoverageData.tpStats.length).toBeGreaterThan(0);

    // 9. Daftar Tindak Lanjut
    const followUpData = await fetchFollowUpQueueReportData({});
    expect(followUpData.reportType).toBe("daftar_tindak_lanjut");
    expect(Array.isArray(followUpData.remedialQueue)).toBe(true);
    expect(Array.isArray(followUpData.enrichmentQueue)).toBe(true);

    // 10. Ringkasan Kepala Sekolah
    const principalSummary = await fetchPrincipalExecutiveSummaryData();
    expect(principalSummary.reportType).toBe("ringkasan_kepala_sekolah");
    expect(principalSummary.kpiStats.totalStudents).toBe(27);
    expect(principalSummary.kpiStats.overallAttendanceRatePct).toBeGreaterThan(0);
    expect(principalSummary.groupPerformance.length).toBe(3);
  });

  // 3. Validasi Format Berkas: PDF, DOCX, XLSX
  it("harus menghasilkan berkas biner PDF, DOCX, dan XLSX yang valid", async () => {
    const atpData = await fetchAtpReportData({ groupId: "group-a" });

    // 1. Uji Buffer PDF (Magic bytes %PDF)
    const pdfBuf = await generateReportPdf(atpData);
    expect(pdfBuf).toBeInstanceOf(Buffer);
    expect(pdfBuf.length).toBeGreaterThan(1000);
    expect(pdfBuf.subarray(0, 4).toString("utf-8")).toBe("%PDF");

    // 2. Uji Buffer DOCX (Magic bytes PK\x03\x04 / ZIP container)
    const docxBuf = await generateReportDocx(atpData);
    expect(docxBuf).toBeInstanceOf(Buffer);
    expect(docxBuf.length).toBeGreaterThan(1000);
    expect(docxBuf.subarray(0, 4).toString("hex")).toBe("504b0304");

    // 3. Uji Buffer XLSX (Dapat dibaca oleh SheetJS)
    const xlsxBuf = await generateReportXlsx(atpData);
    expect(xlsxBuf).toBeInstanceOf(Buffer);
    expect(xlsxBuf.length).toBeGreaterThan(1000);
    expect(xlsxBuf.subarray(0, 4).toString("hex")).toBe("504b0304");

    const parsedWb = XLSX.read(xlsxBuf, { type: "buffer" });
    expect(parsedWb.SheetNames).toContain("Laporan Multigrade");
    expect(parsedWb.Sheets["Laporan Multigrade"]).toBeDefined();
  });

  // 4. Karakter Unicode Khusus (Simbol, Aksen, Math, Kutipan Tosari)
  it("harus menangani karakter Unicode dan teks lokal tanpa crash atau korup", async () => {
    const baseData = await fetchAtpReportData({ groupId: "group-a" });

    // Tambahkan karakter Unicode beragam
    const unicodeData = {
      ...baseData,
      title: 'Laporan ATP & Evaluasi “Kearifan Lokal Bromo” — Wilayah Tengger (± 2.000 mdpl) • Σ(JP) = 72',
      items: [
        {
          sequenceOrder: 1,
          tpCode: "TP-MAT-1.1★",
          tpDescription: "Membilang komoditas sayur: kentang (Granola), kubis, dan daun bawang (ꦗꦮ).",
          targetGrade: 1,
          allocatedHours: 4,
          semester: "Ganjil",
          multigradeNotes: "Strategi diferensiasi: Siswa Kelas 1 ↔ Kelas 2 saling bertukar peran (100% tuntas).",
        },
      ],
    };

    const pdfBuf = await generateReportPdf(unicodeData);
    expect(pdfBuf.length).toBeGreaterThan(500);

    const docxBuf = await generateReportDocx(unicodeData);
    expect(docxBuf.length).toBeGreaterThan(500);

    const xlsxBuf = await generateReportXlsx(unicodeData);
    expect(xlsxBuf.length).toBeGreaterThan(500);
  });

  // 5. Tabel Panjang & Halaman Terpotong (Multi-page Pagination)
  it("harus mampu memformat tabel panjang 60 baris dengan halaman otomatis dan tanda tangan tetap rapi", async () => {
    const baseData = await fetchAtpReportData({ groupId: "group-a" });

    // Simulasikan 60 baris item tabel panjang
    const longItems = Array.from({ length: 60 }, (_, idx) => ({
      sequenceOrder: idx + 1,
      tpCode: `TP-SIM-${idx + 1}`,
      tpDescription: `Tujuan Pembelajaran simulasi ke-${idx + 1} untuk pengujian batas halaman terpotong.`,
      targetGrade: (idx % 2) + 1,
      allocatedHours: 2,
      semester: "Ganjil",
      multigradeNotes: `Catatan bimbingan langsung rotasi ke-${idx + 1}.`,
    }));

    const longData = {
      ...baseData,
      items: longItems,
    };

    const pdfBuf = await generateReportPdf(longData);
    expect(pdfBuf.length).toBeGreaterThan(5000);

    const docxBuf = await generateReportDocx(longData);
    expect(docxBuf.length).toBeGreaterThan(8000);
  });

  // 6. Kontrol Akses Tanpa Izin (RBAC Protection pada Laporan Siswa Individual)
  it("harus memblokir akses guru yang mencoba melihat laporan kemajuan siswa dari kelompok lain", async () => {
    // Guru Kelompok A mencoba melihat laporan siswa Kelompok B (dilarang)
    await expect(
      fetchStudentProgressReportData(sampleStudentB.id, {
        id: teacherUserA.id,
        role: "teacher",
        assignedGroupId: "group-a",
      })
    ).rejects.toThrow("Akses ditolak: Anda tidak memiliki wewenang");

    // Guru Kelompok B melihat siswa Kelompok B (diizinkan)
    const allowedTeacherResult = await fetchStudentProgressReportData(sampleStudentB.id, {
      id: teacherUserB.id,
      role: "teacher",
      assignedGroupId: "group-b",
    });
    expect(allowedTeacherResult.student.studentCode).toBe(sampleStudentB.studentCode);

    // Kepala Sekolah dapat melihat seluruh siswa (diizinkan)
    const allowedHeadmasterResult = await fetchStudentProgressReportData(sampleStudentB.id, {
      id: headmasterUser.id,
      role: "headmaster",
      assignedGroupId: null,
    });
    expect(allowedHeadmasterResult.student.studentCode).toBe(sampleStudentB.studentCode);
  });

  // 7. Pelacakan Versi Dokumen & Penanganan Kegagalan
  it("harus mencatat riwayat versi dokumen dan menolak status selesai jika pembuatan berkas gagal", async () => {
    const atpData = await fetchAtpReportData({ groupId: "group-a" });

    // Uji generate sukses
    const trackedSuccess = await generateAndTrackReport(
      atpData,
      "pdf",
      { id: headmasterUser.id, name: headmasterUser.name, role: headmasterUser.role },
      { groupId: "group-a" }
    );

    expect(trackedSuccess.version).toBeGreaterThan(0);
    expect(trackedSuccess.checksum).toBeDefined();
    expect(trackedSuccess.fileSizeBytes).toBeGreaterThan(1000);
    expect(trackedSuccess.filename).toContain("atp_multigrade");

    // Periksa bahwa tersimpan di tabel report_export_history
    const savedRecord = await db.query.reportExportHistory.findFirst({
      where: eq(schema.reportExportHistory.id, trackedSuccess.historyId),
    });
    expect(savedRecord).toBeDefined();
    expect(savedRecord?.status).toBe("success");
    expect(savedRecord?.fileSizeBytes).toBe(trackedSuccess.fileSizeBytes);

    // Uji penolakan kegagalan: format tidak valid
    await expect(
      generateAndTrackReport(atpData, "invalid_format" as any, {
        id: headmasterUser.id,
        name: headmasterUser.name,
        role: headmasterUser.role,
      })
    ).rejects.toThrow("tidak didukung");

    // Periksa bahwa riwayat mencatat status 'failed'
    const failedRecord = await db.query.reportExportHistory.findFirst({
      where: eq(schema.reportExportHistory.status, "failed"),
      orderBy: [schema.reportExportHistory.createdAt],
    });
    expect(failedRecord).toBeDefined();
    expect(failedRecord?.status).toBe("failed");
  });
});
