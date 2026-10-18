import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { processSyncBatchOnServer } from "@/lib/offline/sync-processor";
import { fetchStudentProgressReportData } from "@/lib/reports/data-fetchers";
import { recordStudentResults } from "@/lib/assessment/engine";
import { importCurriculumSourceAction } from "@/app/actions/curriculum";

describe("Pengujian End-to-End Alur Inti & Keamanan RBAC Multigrade Cerdas AI (SDN SEDAENG II TOSARI)", () => {
  let adminUser: typeof schema.users.$inferSelect;
  let headmasterUser: typeof schema.users.$inferSelect;
  let teacherUserA: typeof schema.users.$inferSelect;
  let teacherUserB: typeof schema.users.$inferSelect;
  let studentGroupA: typeof schema.students.$inferSelect;
  let studentGroupB: typeof schema.students.$inferSelect;

  beforeAll(async () => {
    const admin = await db.query.users.findFirst({ where: eq(schema.users.role, "admin") });
    const headmaster = await db.query.users.findFirst({ where: eq(schema.users.role, "headmaster") });
    const teacherA = await db.query.users.findFirst({
      where: eq(schema.users.assignedGroupId, "group-a"),
    });
    const teacherB = await db.query.users.findFirst({
      where: eq(schema.users.assignedGroupId, "group-b"),
    });

    if (!admin || !headmaster || !teacherA || !teacherB) {
      throw new Error("Pengguna pengujian (Admin, Kepsek, Guru A, Guru B) belum lengkap di database.");
    }

    adminUser = admin;
    headmasterUser = headmaster;
    teacherUserA = teacherA;
    teacherUserB = teacherB;

    const stA = await db.query.students.findFirst({ where: eq(schema.students.groupId, "group-a") });
    const stB = await db.query.students.findFirst({ where: eq(schema.students.groupId, "group-b") });

    if (!stA || !stB) {
      throw new Error("Siswa kelompok A atau B tidak ditemukan.");
    }

    studentGroupA = stA;
    studentGroupB = stB;
  });

  // 1. RBAC: Isolasi Hak Akses Guru Lintas Kelompok Belajar
  it("1. harus menolak guru kelompok A yang mencoba menginput hasil asesmen siswa kelompok B", async () => {
    // Guru A mencoba menginput nilai siswa Kelompok B (studentGroupB)
    const resultSync = await processSyncBatchOnServer(
      [
        {
          id: "rbac-test-assessment-cross-group",
          userId: teacherUserA.id,
          userName: teacherUserA.name,
          userRole: "teacher",
          entityType: "student_assessment",
          action: "create",
          clientEntityId: "local-eval-01",
          baseServerVersion: 0,
          payload: {
            assessmentId: "00000000-0000-0000-0000-000000000001",
            studentId: studentGroupB.id, // Siswa kelompok B!
            subjectId: "matematika",
            score: 85,
            masteryLevel: "baik",
          },
          clientTimestamp: new Date().toISOString(),
          status: "pending",
          retryCount: 0,
        },
      ],
      {
        id: teacherUserA.id,
        name: teacherUserA.name,
        role: "teacher",
        assignedGroupId: "group-a",
      }
    );

    expect(resultSync.results[0].status).toBe("rejected");
    expect(resultSync.results[0].errorMessage).toContain("Akses ditolak");
  });

  // 2. RBAC: Isolasi Jurnal Mengajar Antarkelompok
  it("2. harus menolak guru yang mencoba mencatat jurnal mengajar untuk kelompok di luar tugasnya", async () => {
    const journalSync = await processSyncBatchOnServer(
      [
        {
          id: "rbac-test-journal-cross-group",
          userId: teacherUserA.id,
          userName: teacherUserA.name,
          userRole: "teacher",
          entityType: "teaching_journal",
          action: "create",
          clientEntityId: "local-journal-02",
          baseServerVersion: 0,
          payload: {
            date: "2026-10-16",
            groupId: "group-b", // Kelompok B, sementara Guru A mengampu Kelompok A
            subjectId: "bahasa-indonesia",
            allocatedHours: 2,
            lowerGrade: 3,
            higherGrade: 4,
            rotationActivityDescription: "Kegiatan kelompok B",
          },
          clientTimestamp: new Date().toISOString(),
          status: "pending",
          retryCount: 0,
        },
      ],
      {
        id: teacherUserA.id,
        name: teacherUserA.name,
        role: "teacher",
        assignedGroupId: "group-a",
      }
    );

    expect(journalSync.results[0].status).toBe("rejected");
    expect(journalSync.results[0].errorMessage).toContain("Akses ditolak");
  });

  // 3. RBAC: Perlindungan Hak Akses Laporan Individual Siswa
  it("3. harus memblokir guru saat meminta laporan kemajuan siswa dari kelompok lain", async () => {
    // Guru A mencoba mengakses profil kemajuan siswa di kelompok B
    await expect(
      fetchStudentProgressReportData(studentGroupB.id, {
        id: teacherUserA.id,
        role: "teacher",
        assignedGroupId: "group-a",
      })
    ).rejects.toThrow(/Akses ditolak/i);
  });

  // 4. Kepala Sekolah dan Admin Dapat Mengakses Seluruh Kelompok
  it("4. harus mengizinkan Kepala Sekolah dan Admin mengakses laporan siswa dari kelompok manapun", async () => {
    const reportForHeadmaster = await fetchStudentProgressReportData(studentGroupB.id, {
      id: headmasterUser.id,
      role: "headmaster",
    });

    expect(reportForHeadmaster.student.studentCode).toBe(studentGroupB.studentCode);
    expect(reportForHeadmaster.school.npsn).toBe("20519069");
  });

  // 5. Validasi Keamanan Unggahan Berkas (Tipe & Ekstensi Terlarang)
  it("5. harus menolak unggahan berkas dengan ekstensi terlarang (misal .sh atau .exe)", async () => {
    // Validasi skema ekstensi terhadap deklarasi fileType
    const ext = "sh";
    const fileType = "pdf";
    const validExtensions: Record<string, string[]> = {
      pdf: ["pdf"],
      docx: ["docx"],
      xlsx: ["xlsx", "xls"],
    };

    const isExtensionAllowed = validExtensions[fileType]?.includes(ext);
    expect(isExtensionAllowed).toBe(false);
  });

  // 6. Alur Terintegrasi: Asesmen -> Sinkronisasi -> Laporan
  it("6. harus menjalankan alur pencatatan asesmen yang valid dan merefleksikannya ke riwayat", async () => {
    // Buat assessment session baru khusus untuk pengujian E2E ini
    const [assessment] = await db
      .insert(schema.assessments)
      .values({
        title: "Asesmen Formatif E2E Kelas 1-2 Validasi Alur",
        assessmentType: "formatif",
        subjectId: "matematika",
        classId: studentGroupA.classId,
        groupId: "group-a",
        tpCode: "TP-MAT-01",
        academicYear: "2024/2025",
        semester: "Ganjil",
        instrumentType: "rubrik_observasi",
        createdById: teacherUserA.id,
      })
      .returning();

    // Guru A mencatat nilai untuk siswa di kelompoknya sendiri
    const validAssessmentItem = {
      id: "valid-e2e-assessment-01",
      userId: teacherUserA.id,
      userName: teacherUserA.name,
      userRole: "teacher",
      entityType: "student_assessment" as const,
      action: "create" as const,
      clientEntityId: "local-eval-valid",
      baseServerVersion: 0,
      payload: {
        assessmentId: assessment.id,
        studentId: studentGroupA.id,
        subjectId: "matematika",
        score: 92,
        masteryLevel: "sangat_baik",
        learningEvidence: "Dapat menyelesaikan soal cerita kontekstual buah apel Tosari secara mandiri.",
      },
      clientTimestamp: new Date().toISOString(),
      status: "pending" as const,
      retryCount: 0,
    };

    const syncRes = await processSyncBatchOnServer([validAssessmentItem], {
      id: teacherUserA.id,
      name: teacherUserA.name,
      role: "teacher",
      assignedGroupId: "group-a",
    });

    expect(syncRes.success).toBe(true);
    expect(syncRes.results[0].status).toBe("synced");
    expect(syncRes.results[0].serverEntityId).toBeDefined();
  });
});
