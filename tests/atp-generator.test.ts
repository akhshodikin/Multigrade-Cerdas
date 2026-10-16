import { describe, it, expect, beforeAll, vi } from "vitest";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth session to support teacher and headmaster roles
let mockUserRole: "admin" | "headmaster" | "teacher" = "teacher";
let mockUserId = "22222222-2222-2222-2222-222222222222";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(async () => ({
    id: mockUserId,
    name: "Guru Pengampu SDN Sedaeng II",
    email: "guru.a@sedaeng2.sch.id",
    role: mockUserRole,
    assignedGroupId: "group-a",
    nip: "198501012010011001",
    phone: "08123456789",
  })),
  requireAuth: vi.fn(async (allowedRoles?: string[]) => {
    if (allowedRoles && !allowedRoles.includes(mockUserRole)) {
      throw new Error(`Akses ditolak: role '${mockUserRole}' tidak memiliki izin.`);
    }
    return {
      id: mockUserId,
      name: mockUserRole === "headmaster" ? "Bambang Sutrisno, M.Pd" : "Guru Pengampu SDN Sedaeng II",
      email: mockUserRole === "headmaster" ? "kepsek@sedaeng2.sch.id" : "guru.a@sedaeng2.sch.id",
      role: mockUserRole,
      assignedGroupId: "group-a",
      nip: "198501012010011001",
      phone: "08123456789",
    };
  }),
}));

import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  generateMultigradeAtp,
  buildPromesCalendarWeeks,
} from "../src/lib/curriculum/atp-generator";
import {
  previewAtpGenerationAction,
  saveGeneratedAtpPlanAction,
  updateAtpPlanItemsAction,
  getAtpPlanFullDetailsAction,
} from "../src/app/actions/atp-generator";
import {
  submitAtpForReviewAction,
  approveAtpWithReviewAction,
  rejectAtpAction,
  activateAtpForTeachingAction,
} from "../src/app/actions/validation";

describe("Pengujian Generator ATP Multigrade SDN Sedaeng II Tosari", () => {
  let subjectId: string;
  let cpAId: string;
  let tp1Id: string;
  let tp2Id: string;
  let tp3Id: string;
  let draftTpId: string;

  beforeAll(async () => {
    // 1. Ambil atau buat mata pelajaran
    const existingSub = await db.query.subjects.findFirst({
      where: eq(schema.subjects.id, "matematika"),
    });
    if (existingSub) {
      subjectId = existingSub.id;
    } else {
      const [newSub] = await db.insert(schema.subjects).values({
        id: "matematika",
        name: "Matematika",
        category: "wajib",
        targetPhases: "Fase A, Fase B, Fase C",
      }).returning();
      subjectId = newSub.id;
    }

    // 2. Ambil user guru dan kepala sekolah untuk otorisasi
    const [teacher] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "teacher"));
    if (teacher) {
      mockUserId = teacher.id;
    }

    // 3. Pastikan Kelompok A (Kelas 1 & 2) ada
    const existingGroupA = await db.query.multigradeGroups.findFirst({
      where: eq(schema.multigradeGroups.id, "group-a"),
    });
    if (!existingGroupA) {
      await db.insert(schema.multigradeGroups).values({
        id: "group-a",
        name: "Kelompok A",
        phase: "Fase A",
        grades: "1,2",
      });
    }

    // 4. Pastikan Capaian Pembelajaran (CP) Fase A ada
    const [newCp] = await db
      .insert(schema.capaianPembelajaran)
      .values({
        subjectId,
        phase: "Fase A",
        element: "Bilangan",
        originalSourceText: "Peserta didik mampu memahami operasi bilangan cacah sederhana.",
        duplicateHash: `test_atp_cp_hash_${Date.now()}`,
        verificationStatus: "approved",
      })
      .returning();
    cpAId = newCp.id;

    // 5. Buat TP Kelas 1 (Terverifikasi)
    const existingTp1 = await db.query.tujuanPembelajaran.findFirst({
      where: eq(schema.tujuanPembelajaran.code, "TP-ATP-KLS1"),
    });
    if (existingTp1) {
      tp1Id = existingTp1.id;
    } else {
      const [tp] = await db
        .insert(schema.tujuanPembelajaran)
        .values({
          cpId: cpAId,
          subjectId,
          phase: "Fase A",
          targetGrade: 1,
          code: "TP-ATP-KLS1",
          competency: "Mengenal bunyi huruf dan suku kata",
          contentScope: "Fonem dan Suku Kata Terbuka",
          description: "Peserta didik dapat mengeja bunyi huruf dan merangkainya menjadi suku kata sederhana.",
          verificationStatus: "approved",
        })
        .returning();
      tp1Id = tp.id;
    }

    // 6. Buat TP Kelas 2 (Terverifikasi)
    const existingTp2 = await db.query.tujuanPembelajaran.findFirst({
      where: eq(schema.tujuanPembelajaran.code, "TP-ATP-KLS2"),
    });
    if (existingTp2) {
      tp2Id = existingTp2.id;
    } else {
      const [tp] = await db
        .insert(schema.tujuanPembelajaran)
        .values({
          cpId: cpAId,
          subjectId,
          phase: "Fase A",
          targetGrade: 2,
          code: "TP-ATP-KLS2",
          competency: "Membaca kata dengan fasih dan intonasi tepat",
          contentScope: "Kelancaran Membaca Kalimat Sederhana",
          description: "Peserta didik dapat membaca cerita pendek naratif dengan lafal dan intonasi yang wajar.",
          verificationStatus: "approved",
        })
        .returning();
      tp2Id = tp.id;
    }

    // 7. Buat TP Kelas 1 Lanjutan (Terverifikasi)
    const existingTp3 = await db.query.tujuanPembelajaran.findFirst({
      where: eq(schema.tujuanPembelajaran.code, "TP-ATP-KLS1-LANJUT"),
    });
    if (existingTp3) {
      tp3Id = existingTp3.id;
    } else {
      const [tp] = await db
        .insert(schema.tujuanPembelajaran)
        .values({
          cpId: cpAId,
          subjectId,
          phase: "Fase A",
          targetGrade: 1,
          code: "TP-ATP-KLS1-LANJUT",
          competency: "Merangkai kata sederhana menjadi kalimat dasar",
          contentScope: "Kalimat Dasar Subjek-Predikat",
          description: "Peserta didik mampu merangkai 2-3 kata menjadi kalimat bermakna.",
          verificationStatus: "approved",
        })
        .returning();
      tp3Id = tp.id;
    }

    // 8. Buat TP Berstatus Draf (Untuk menguji deteksi peringatan TP belum terverifikasi)
    const existingDraft = await db.query.tujuanPembelajaran.findFirst({
      where: eq(schema.tujuanPembelajaran.code, "TP-ATP-DRAFT-TEST"),
    });
    if (existingDraft) {
      draftTpId = existingDraft.id;
    } else {
      const [tp] = await db
        .insert(schema.tujuanPembelajaran)
        .values({
          cpId: cpAId,
          subjectId,
          phase: "Fase A",
          targetGrade: 2,
          code: "TP-ATP-DRAFT-TEST",
          competency: "Menulis kalimat deskripsi lingkungan sekitar",
          contentScope: "Deskripsi Sederhana Lingkungan Tosari",
          description: "Draf TP belum disahkan oleh Kepala Sekolah.",
          verificationStatus: "draft",
        })
        .returning();
      draftTpId = tp.id;
    }

    // 9. Tetapkan Relasi Prasyarat: TP-ATP-KLS1-LANJUT membutuhkan TP-ATP-KLS1
    const existingPrereq = await db.query.tpPrerequisites.findFirst({
      where: eq(schema.tpPrerequisites.tpId, tp3Id),
    });
    if (!existingPrereq) {
      await db.insert(schema.tpPrerequisites).values({
        tpId: tp3Id,
        prerequisiteTpId: tp1Id,
        notes: "Siswa harus menguasai suku kata sebelum menyusun kalimat.",
      });
    }
  });

  it("1. Harus menghasilkan Pekan Efektif Kalender Promes (18 pekan per semester dengan tonggak STS/SAS)", () => {
    const weeksGanjil = buildPromesCalendarWeeks("Ganjil");
    expect(weeksGanjil.length).toBe(18);

    // Pekan ke-9 adalah STS
    const week9 = weeksGanjil.find((w) => w.globalWeekNumber === 9);
    expect(week9?.isAssessmentWeek).toBe(true);
    expect(week9?.label).toBe("STS");

    // Pekan ke-18 adalah SAS
    const week18 = weeksGanjil.find((w) => w.globalWeekNumber === 18);
    expect(week18?.isAssessmentWeek).toBe(true);
    expect(week18?.label).toBe("SAS");

    const weeksGenap = buildPromesCalendarWeeks("Genap");
    expect(weeksGenap.length).toBe(18);
    expect(weeksGenap[0].month).toBe("Januari");
  });

  it("2. Invarian Pedagogis: Tidak boleh menyamakan ATP dua kelas dalam satu fase yang sama", async () => {
    const result = await generateMultigradeAtp({
      groupId: "group-a",
      subjectId,
      academicYear: "2024/2025",
      semester: "Semua",
    });

    expect(result.group.id).toBe("group-a");
    expect(result.phase).toBe("Fase A");
    expect(result.grades).toEqual([1, 2]);

    // Track Kelas 1 dan Track Kelas 2 harus terpisah dan mandiri
    expect(result.lowerGradeTrack.length).toBeGreaterThan(0);
    expect(result.higherGradeTrack.length).toBeGreaterThan(0);

    // Seluruh butir di lowerGradeTrack harus bertarget kelas 1
    result.lowerGradeTrack.forEach((item) => {
      expect(item.targetGrade).toBe(1);
    });

    // Seluruh butir di higherGradeTrack harus bertarget kelas 2
    result.higherGradeTrack.forEach((item) => {
      expect(item.targetGrade).toBe(2);
    });

    // Kode TP antara kelas 1 dan kelas 2 tidak boleh identik
    const lowerTpCodes = new Set(result.lowerGradeTrack.map((i) => i.tpCode));
    const higherTpCodes = new Set(result.higherGradeTrack.map((i) => i.tpCode));
    for (const code of lowerTpCodes) {
      expect(higherTpCodes.has(code)).toBe(false);
    }
  });

  it("3. Harus mendeteksi peringatan jika ada TP berstatus Draf dalam cakupan alur", async () => {
    const result = await generateMultigradeAtp({
      groupId: "group-a",
      subjectId,
      academicYear: "2024/2025",
    });

    expect(result.hasUnverifiedTpsWarning).toBe(true);
    expect(result.unverifiedTpsCount).toBeGreaterThanOrEqual(1);
  });

  it("4. Harus menghasilkan Peta Cakupan TP (Coverage Map) dan mendeteksi TP yang belum terjadwal", async () => {
    const result = await generateMultigradeAtp({
      groupId: "group-a",
      subjectId,
      academicYear: "2024/2025",
    });

    expect(result.coverageSummary.totalTps).toBeGreaterThanOrEqual(3);
    expect(result.coverageDetails.lowerGradeTps.length).toBeGreaterThan(0);
    expect(result.coverageDetails.higherGradeTps.length).toBeGreaterThan(0);

    // Verifikasi keberadaan TP kelas 1 dan 2 dalam cakupan
    const foundTp1 = result.coverageDetails.lowerGradeTps.find((t) => t.id === tp1Id);
    expect(foundTp1).toBeDefined();
    expect(foundTp1?.targetGrade).toBe(1);

    const foundTp2 = result.coverageDetails.higherGradeTps.find((t) => t.id === tp2Id);
    expect(foundTp2).toBeDefined();
    expect(foundTp2?.targetGrade).toBe(2);
  });

  it("5. Harus mengaudit anggaran alokasi waktu (Time Budget Audit) terhadap standar jam SD", async () => {
    const result = await generateMultigradeAtp({
      groupId: "group-a",
      subjectId,
      academicYear: "2024/2025",
      semester: "Semua",
    });

    // Matematika target standar = 144 JP
    expect(result.standardTargetHours).toBe(144);
    expect(["sesuai", "kurang", "berlebih"]).toContain(result.timeBudgetStatus);
    expect(typeof result.timeBudgetDifference).toBe("number");
  });

  it("6. Harus menyusun matriks Program Tahunan (Prota) dan Program Semester (Promes)", async () => {
    const result = await generateMultigradeAtp({
      groupId: "group-a",
      subjectId,
      academicYear: "2024/2025",
      semester: "Semua",
    });

    // Prota
    expect(result.protaEntries.length).toBe(result.generatedItems.length);
    result.protaEntries.forEach((pe, idx) => {
      expect(pe.no).toBe(idx + 1);
      expect(["Ganjil", "Genap"]).toContain(pe.semester);
      expect(pe.allocatedHours).toBeGreaterThan(0);
      expect(pe.tpCode).toBeDefined();
    });

    // Promes
    expect(result.promesEntries.length).toBe(result.generatedItems.length);
    result.promesEntries.forEach((pe) => {
      expect(pe.allocatedHours).toBeGreaterThan(0);
      expect(Object.keys(pe.weeklyDistribution).length).toBeGreaterThan(0);
    });
  });

  it("7. Harus mendukung penyusunan ATP Tunggal (Single Grade Mode e.g. Kelas 1)", async () => {
    const result = await generateMultigradeAtp({
      groupId: "group-a",
      subjectId,
      academicYear: "2024/2025",
      targetGrade: 1, // Single class
    });

    expect(result.isSingleGrade).toBe(true);
    expect(result.targetGrade).toBe(1);
    result.generatedItems.forEach((item) => {
      expect(item.targetGrade).toBe(1);
    });
  });

  it("8. Alur Server Actions: Simpan Rencana ATP, Riwayat Versi, Audit Log, dan Ambil Data Lengkap", async () => {
    mockUserRole = "teacher";

    // 1. Preview via Server Action
    const previewRes = await previewAtpGenerationAction({
      groupId: "group-a",
      subjectId,
      academicYear: "2024/2025",
    });
    expect(previewRes.success).toBe(true);
    if (!previewRes.success) return;

    // 2. Simpan Rencana ATP
    const saveRes = await saveGeneratedAtpPlanAction({
      title: "Rencana ATP Uji Cerdas SDN Sedaeng II",
      groupId: "group-a",
      subjectId,
      phase: "Fase A",
      academicYear: "2024/2025",
      semester: "Semua",
      totalHours: 72,
      effectiveWeeks: 36,
      items: [
        {
          tpId: tp1Id,
          sequenceOrder: 1,
          allocatedHours: 6,
          targetGrade: 1,
          semester: "Ganjil",
          startWeek: 1,
          endWeek: 2,
          monthName: "Juli",
          multigradeStrategy: "terpadu_sebagian",
          multigradeNotes: "Aktivitas menyanyi fonem bersama.",
        },
        {
          tpId: tp2Id,
          sequenceOrder: 2,
          allocatedHours: 8,
          targetGrade: 2,
          semester: "Ganjil",
          startWeek: 1,
          endWeek: 2,
          monthName: "Juli",
          multigradeStrategy: "terpadu_sebagian",
          multigradeNotes: "Membaca teks cerita lokal Tosari.",
        },
      ],
    });

    expect(saveRes.success).toBe(true);
    if (!saveRes.success) return;
    const planId = saveRes.data.planId;
    expect(planId).toBeDefined();

    // 3. Verifikasi Log Audit tersimpan
    const auditLogs = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.targetId, planId));
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].action).toBe("GENERATE_MULTIGRADE_ATP");

    // 4. Verifikasi Catatan Versi (Version 1)
    const versionsV1 = await db
      .select()
      .from(schema.curriculumVersions)
      .where(eq(schema.curriculumVersions.entityId, planId));
    expect(versionsV1.length).toBe(1);
    expect(versionsV1[0].versionNumber).toBe(1);

    // 5. Guru melakukan pembaruan manual (Reorder / Edit JP)
    const updateRes = await updateAtpPlanItemsAction(planId, {
      title: "Rencana ATP Uji Cerdas Versi Revisi",
      items: [
        {
          tpId: tp2Id,
          sequenceOrder: 1,
          allocatedHours: 10,
          targetGrade: 2,
          semester: "Ganjil",
          startWeek: 1,
          endWeek: 3,
          monthName: "Juli",
        },
        {
          tpId: tp1Id,
          sequenceOrder: 2,
          allocatedHours: 6,
          targetGrade: 1,
          semester: "Ganjil",
          startWeek: 2,
          endWeek: 4,
          monthName: "Juli",
        },
      ],
    });
    expect(updateRes.success).toBe(true);

    // 6. Verifikasi versi naik menjadi Versi 2
    const [updatedPlan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, planId));
    expect(updatedPlan.version).toBe(2);
    expect(updatedPlan.totalHours).toBe(16); // 10 + 6

    const versionsV2 = await db
      .select()
      .from(schema.curriculumVersions)
      .where(eq(schema.curriculumVersions.entityId, planId));
    expect(versionsV2.length).toBe(2);

    // 7. Ambil Full Details (untuk Detail Workspace dan Cetak Dokumen)
    const details = await getAtpPlanFullDetailsAction(planId);
    expect(details).not.toBeNull();
    expect(details?.plan.id).toBe(planId);
    expect(details?.items.length).toBe(2);
    expect(details?.protaEntries.length).toBe(2);
    expect(details?.promesEntries.length).toBe(2);
    expect(details?.promesWeeksGanjil.length).toBe(18);

    // 8. Siklus Persetujuan: Guru ajukan tinjauan -> Kepala Sekolah Setujui -> Aktifkan
    mockUserRole = "teacher";
    const submitRes = await submitAtpForReviewAction(planId);
    expect(submitRes.success).toBe(true);

    // Penolakan oleh Kepala Sekolah
    mockUserRole = "headmaster";
    const rejectRes = await rejectAtpAction(planId, "Perlu penyesuaian alokasi jam JP pekan 2.");
    expect(rejectRes.success).toBe(true);

    const [rejectedPlan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, planId));
    expect(rejectedPlan.status).toBe("rejected");
    expect(rejectedPlan.rejectionNotes).toContain("alokasi jam JP");

    // Ajukan ulang dan setujui
    mockUserRole = "teacher";
    await submitAtpForReviewAction(planId);

    mockUserRole = "headmaster";
    const approveRes = await approveAtpWithReviewAction(planId, "Telah diperbaiki dan disetujui.");
    expect(approveRes.success).toBe(true);

    const [approvedPlan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, planId));
    expect(approvedPlan.status).toBe("approved");

    // Terapkan untuk pembelajaran aktif
    const activateRes = await activateAtpForTeachingAction(planId);
    expect(activateRes.success).toBe(true);

    const [activePlan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, planId));
    expect(activePlan.status).toBe("in_use");
  });
});
