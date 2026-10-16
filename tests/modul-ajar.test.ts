import { describe, it, expect, beforeAll, vi } from "vitest";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth session to support teacher and headmaster roles
let mockUserRole: "admin" | "headmaster" | "teacher" = "teacher";
let mockUserId = "33333333-3333-3333-3333-333333333333";

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
      name: mockUserRole === "headmaster" ? "Akhmad Shodikin, M.Pd" : "Guru Pengampu SDN Sedaeng II",
      email: mockUserRole === "headmaster" ? "kepsek@sedaeng2.sch.id" : "guru.a@sedaeng2.sch.id",
      role: mockUserRole,
      assignedGroupId: "group-a",
      nip: mockUserRole === "headmaster" ? "198503182009031009" : "198501012010011001",
      phone: "08123456789",
    };
  }),
}));

import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  generateModulAjarDraft,
  checkModulCurriculumIntegrity,
} from "../src/lib/modul-ajar/generator";
import {
  previewModulAjarAction,
  saveModulAjarAction,
  updateModulAjarAction,
  duplicateModulAjarAction,
  submitModulForReviewAction,
  approveModulAjarAction,
  publishModulAjarAction,
  rejectModulAjarAction,
  getModulAjarFullDetailsAction,
  verifyModulCurriculumConsistencyAction,
} from "../src/app/actions/modul-ajar";

describe("Pengujian Generator Modul Ajar Multigrade Cerdas AI SDN Sedaeng II Tosari", () => {
  let subjectId: string;
  let cpId: string;
  let tpGrade1Id: string;
  let tpGrade2Id: string;
  let draftTpId: string;
  let createdLessonPlanId: string;

  beforeAll(async () => {
    // 1. Ambil atau buat Mapel Matematika
    const existingSub = await db.query.subjects.findFirst({
      where: eq(schema.subjects.id, "matematika"),
    });
    if (existingSub) {
      subjectId = existingSub.id;
    } else {
      const [newSub] = await db
        .insert(schema.subjects)
        .values({
          id: "matematika",
          name: "Matematika",
          category: "wajib",
          targetPhases: "Fase A, Fase B, Fase C",
        })
        .returning();
      subjectId = newSub.id;
    }

    // 2. Ambil user guru untuk pengujian
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

    // 4. Pastikan CP Fase A ada
    const [newCp] = await db
      .insert(schema.capaianPembelajaran)
      .values({
        subjectId,
        phase: "Fase A",
        element: "Pengukuran dan Bilangan",
        originalSourceText:
          "Peserta didik mampu membandingkan panjang dan berat benda konkret secara langsung.",
        duplicateHash: `test_modul_cp_${Date.now()}`,
        verificationStatus: "approved",
      })
      .returning();
    cpId = newCp.id;

    // 5. Buat TP Terverifikasi Kelas 1
    const [tp1] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId,
        subjectId,
        phase: "Fase A",
        targetGrade: 1,
        code: "TP-MODUL-KLS1",
        competency: "Mengenal konsep panjang dan pendek melalui benda konkret",
        contentScope: "Perbandingan Panjang Benda Nyata",
        description: "Peserta didik dapat membandingkan panjang daun dan ranting pohon cemara Tosari.",
        verificationStatus: "approved",
      })
      .returning();
    tpGrade1Id = tp1.id;

    // 6. Buat TP Terverifikasi Kelas 2
    const [tp2] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId,
        subjectId,
        phase: "Fase A",
        targetGrade: 2,
        code: "TP-MODUL-KLS2",
        competency: "Mengukur panjang benda menggunakan satuan tidak baku teratur",
        contentScope: "Pengukuran Panjang Satuan Jengkal dan Klip",
        description: "Peserta didik dapat mengukur panjang buku dan meja kelas dengan jengkal tangan secara tepat.",
        verificationStatus: "approved",
      })
      .returning();
    tpGrade2Id = tp2.id;

    // 7. Buat TP Draf (belum disahkan) untuk uji integritas
    const [tpDraft] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId,
        subjectId,
        phase: "Fase A",
        targetGrade: 2,
        code: "TP-MODUL-DRAFT",
        competency: "Mengestimasi jarak antar titik di ruang kelas",
        contentScope: "Estimasi Jarak",
        description: "Draf TP belum diverifikasi.",
        verificationStatus: "draft",
      })
      .returning();
    draftTpId = tpDraft.id;
  });

  it("1. Harus menghasilkan Modul Ajar dengan identitas lengkap, referensi CP/TP, dan tujuan belajar berjenjang", async () => {
    const draft = await generateModulAjarDraft(
      {
        groupId: "group-a",
        subjectId,
        durationMinutes: 70,
        allocatedHours: 2,
        lowerGradeTpIds: [tpGrade1Id],
        higherGradeTpIds: [tpGrade2Id],
        teacherNotes: "Siswa kelas 1 butuh objek nyata kentang dan daun cemara Tosari",
      },
      mockUserId
    );

    expect(draft.groupId).toBe("group-a");
    expect(draft.phase).toBe("Fase A");
    expect(draft.lowerGrade).toBe(1);
    expect(draft.higherGrade).toBe(2);
    expect(draft.durationMinutes).toBe(70);

    // Invarian Pedagogis: Tujuan Pembelajaran Tiap Kelas Tidak Digabung
    expect(draft.learningObjectives.length).toBe(2);
    const objGrade1 = draft.learningObjectives.find((lo) => lo.grade === 1);
    const objGrade2 = draft.learningObjectives.find((lo) => lo.grade === 2);

    expect(objGrade1).toBeDefined();
    expect(objGrade2).toBeDefined();
    expect(objGrade1?.tpCode).toBe("TP-MODUL-KLS1");
    expect(objGrade2?.tpCode).toBe("TP-MODUL-KLS2");
    expect(objGrade1?.competency).not.toBe(objGrade2?.competency);

    // Identitas Sekolah Resmi SDN Sedaeng II Tosari
    expect(draft.schoolInfo.name).toContain("SDN SEDAENG II");
    expect(draft.schoolInfo.npsn).toMatch(/^20519/);
    expect(draft.schoolInfo.address).toContain("Tosari");
  });

  it("2. Invarian Pola Rotasi Kelas Rangkap: 8 Langkah rotasi tidak mengharuskan guru membimbing dua kelompok sekaligus", async () => {
    const draft = await generateModulAjarDraft(
      {
        groupId: "group-a",
        subjectId,
        lowerGradeTpIds: [tpGrade1Id],
        higherGradeTpIds: [tpGrade2Id],
      },
      mockUserId
    );

    expect(draft.teachingSteps.length).toBe(8);

    // Langkah 1: Pembukaan Bersama
    expect(draft.teachingSteps[0].stepName).toContain("Pembukaan Bersama");
    expect(draft.teachingSteps[0].patternType).toBe("bersama");

    // Langkah 2: Pengantar / Demonstrasi Bersama
    expect(draft.teachingSteps[1].stepName).toContain("Pengantar");
    expect(draft.teachingSteps[1].patternType).toBe("bersama");

    // Langkah 3: Guru Bimbing Langsung Kelas 1, Kelas 2 Mandiri Terarah
    const step3 = draft.teachingSteps[2];
    expect(step3.patternType).toBe("bimbingan_kelompok_1");
    expect(step3.teacherRole.toLowerCase()).toContain("intensif");
    expect(step3.higherGradeActivity.toLowerCase()).toContain("mandiri");

    // Langkah 5: Rotasi Guru Berpindah Membimbing Kelas 2
    const step5 = draft.teachingSteps[4];
    expect(step5.patternType).toBe("bimbingan_kelompok_2");
    expect(step5.teacherRole.toLowerCase()).toContain("berpindah");

    // Langkah 7 & 8: Berbagi Hasil dan Asesmen Refleksi
    expect(draft.teachingSteps[6].patternType).toBe("berbagi_hasil");
    expect(draft.teachingSteps[7].patternType).toBe("asesmen_refleksi");
  });

  it("3. Aktivitas mandiri harus disesuaikan dengan usia siswa", async () => {
    const draft = await generateModulAjarDraft(
      {
        groupId: "group-a",
        subjectId,
        lowerGradeTpIds: [tpGrade1Id],
        higherGradeTpIds: [tpGrade2Id],
      },
      mockUserId
    );

    // Langkah 4 (Aktivitas mandiri kelas 1) berfokus pada gambar / benda konkret
    const step4 = draft.teachingSteps[3];
    expect(step4.lowerGradeActivity.toLowerCase()).toMatch(/gambar|kartu|pensil|benda/);

    // Diferensiasi Produk
    expect(draft.differentiation.product.lowerGrade.toLowerCase()).toMatch(/visual|lisan|kartu|gambar/);
    expect(draft.differentiation.product.higherGrade.toLowerCase()).toMatch(/paragraf|kalimat|tulis/);
  });

  it("4. Harus menghasilkan diferensiasi pembelajaran dan rubrik asesmen formatif 4 level", async () => {
    const draft = await generateModulAjarDraft(
      {
        groupId: "group-a",
        subjectId,
        lowerGradeTpIds: [tpGrade1Id],
        higherGradeTpIds: [tpGrade2Id],
      },
      mockUserId
    );

    // Asesmen Diagnostik
    expect(draft.assessments.diagnostic.technique).toBeDefined();
    expect(draft.assessments.diagnostic.questions.length).toBeGreaterThan(0);

    // Formatif & Rubrik
    expect(draft.assessments.formative.lowerGradeCriteria).toContain("Kelas 1");
    expect(draft.assessments.formative.higherGradeCriteria).toContain("Kelas 2");
    expect(draft.assessments.formative.observationRubric.length).toBeGreaterThanOrEqual(2);

    const rubric = draft.assessments.formative.observationRubric[0];
    expect(rubric.perluBimbingan).toBeDefined();
    expect(rubric.cukup).toBeDefined();
    expect(rubric.baik).toBeDefined();
    expect(rubric.sangatBaik).toBeDefined();
  });

  it("5. Alur Server Actions: Simpan Modul Ajar, Catatan Versi, dan Audit Log", async () => {
    mockUserRole = "teacher";

    // 1. Preview
    const previewRes = await previewModulAjarAction({
      groupId: "group-a",
      subjectId,
      durationMinutes: 70,
      allocatedHours: 2,
      topic: "Pengukuran Panjang Benda Lingkungan Tosari",
      lowerGradeTpIds: [tpGrade1Id],
      higherGradeTpIds: [tpGrade2Id],
    });
    expect(previewRes.success).toBe(true);
    if (!previewRes.success) return;

    // 2. Simpan Modul Ajar
    const saveRes = await saveModulAjarAction({
      title: "Modul Ajar Matematika Pengukuran Panjang Tosari",
      groupId: "group-a",
      subjectId,
      phase: "Fase A",
      grades: "1,2",
      academicYear: "2024/2025",
      semester: "Ganjil",
      durationMinutes: 70,
      allocatedHours: 2,
      topic: "Pengukuran Panjang Benda Lingkungan Tosari",
      essentialMaterial: previewRes.data.essentialMaterial,
      initialCompetency: previewRes.data.initialCompetency,
      learningObjectives: previewRes.data.learningObjectives,
      curriculumReferences: previewRes.data.curriculumReferences,
      mediaAndResources: previewRes.data.mediaAndResources,
      teachingSteps: previewRes.data.teachingSteps,
      differentiation: previewRes.data.differentiation,
      assessments: previewRes.data.assessments,
      reflections: previewRes.data.reflections,
      remedialAndEnrichment: previewRes.data.remedialAndEnrichment,
    });

    expect(saveRes.success).toBe(true);
    if (!saveRes.success) return;

    createdLessonPlanId = saveRes.data.lessonPlanId;
    expect(createdLessonPlanId).toBeDefined();

    // 3. Verifikasi Log Audit tersimpan
    const auditLogs = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.targetId, createdLessonPlanId));
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].action).toBe("CREATE_MODUL_AJAR");

    // 4. Verifikasi Versi Awal (Versi 1)
    const [savedPlan] = await db
      .select()
      .from(schema.multigradeLessonPlans)
      .where(eq(schema.multigradeLessonPlans.id, createdLessonPlanId));
    expect(savedPlan.version).toBe(1);
    expect(savedPlan.status).toBe("draft");
  });

  it("6. Uji Integritas & Ketelusuran Kurikulum: Memeriksa apakah TP dan CP tetap konsisten", async () => {
    // Jalankan pemeriksaan integritas pada modul yang baru disimpan
    const integrityReport = await checkModulCurriculumIntegrity(createdLessonPlanId);

    expect(integrityReport.isConsistent).toBe(true);
    expect(integrityReport.issues.length).toBe(0);
    expect(integrityReport.verifiedReferences.length).toBeGreaterThanOrEqual(2);

    // Periksa status referensi TP
    const tp1Ref = integrityReport.verifiedReferences.find((r) => r.id === tpGrade1Id);
    expect(tp1Ref?.status).toBe("valid");
    expect(tp1Ref?.code).toBe("TP-MODUL-KLS1");

    // Server Action Check
    const serverVerifyRes = await verifyModulCurriculumConsistencyAction(createdLessonPlanId);
    expect(serverVerifyRes.success).toBe(true);
  });

  it("7. Harus mendeteksi ketidakkonsistenan jika modul merujuk ke TP yang tidak ada atau berstatus draf", async () => {
    // Buat modul uji yang sengaja menyertakan draftTpId
    const draftModul = await generateModulAjarDraft(
      {
        groupId: "group-a",
        subjectId,
        lowerGradeTpIds: [tpGrade1Id],
        higherGradeTpIds: [draftTpId], // TP berstatus draf
      },
      mockUserId
    );

    const [testPlan] = await db
      .insert(schema.multigradeLessonPlans)
      .values({
        title: "Modul Uji Integritas Draf",
        groupId: "group-a",
        subjectId,
        topic: "Uji Konsistensi",
        learningObjectives: draftModul.learningObjectives,
        curriculumReferences: {
          tpIds: [tpGrade1Id, draftTpId, "00000000-0000-0000-0000-000000000000"], // 1 terhapus
        },
        teachingSteps: draftModul.teachingSteps,
        differentiation: draftModul.differentiation,
        assessments: draftModul.assessments,
        reflections: draftModul.reflections,
        remedialAndEnrichment: draftModul.remedialAndEnrichment,
        differentiatedStrategy: {},
      })
      .returning();

    const report = await checkModulCurriculumIntegrity(testPlan.id);
    expect(report.isConsistent).toBe(false);
    expect(report.issues.some((i) => i.includes("belum disahkan"))).toBe(true);
    expect(report.issues.some((i) => i.includes("tidak ditemukan"))).toBe(true);
  });

  it("8. Fitur Duplikasi Modul (Cloning): Mengkloning modul menjadi salinan draf baru", async () => {
    mockUserRole = "teacher";

    const dupRes = await duplicateModulAjarAction(createdLessonPlanId);
    expect(dupRes.success).toBe(true);
    if (!dupRes.success) return;

    const newId = dupRes.data.newLessonPlanId;
    const [duplicatedPlan] = await db
      .select()
      .from(schema.multigradeLessonPlans)
      .where(eq(schema.multigradeLessonPlans.id, newId));

    expect(duplicatedPlan).toBeDefined();
    expect(duplicatedPlan.clonedFromId).toBe(createdLessonPlanId);
    expect(duplicatedPlan.title).toContain("Salinan -");
    expect(duplicatedPlan.status).toBe("draft");
    expect(duplicatedPlan.version).toBe(1);
  });

  it("9. Penyuntingan Modul: Memperbarui langkah dan materi, menaikkan nomor versi", async () => {
    mockUserRole = "teacher";

    const updateRes = await updateModulAjarAction(createdLessonPlanId, {
      title: "Modul Ajar Matematika Pengukuran Panjang Tosari (Revisi Guru)",
      durationMinutes: 105,
      allocatedHours: 3,
      versionNotes: "Penyesuaian durasi menjadi 3 JP untuk pengayaan alam.",
    });

    expect(updateRes.success).toBe(true);
    if (!updateRes.success) return;
    expect(updateRes.data.version).toBe(2);

    const [updatedPlan] = await db
      .select()
      .from(schema.multigradeLessonPlans)
      .where(eq(schema.multigradeLessonPlans.id, createdLessonPlanId));

    expect(updatedPlan.version).toBe(2);
    expect(updatedPlan.durationMinutes).toBe(105);
    expect(updatedPlan.allocatedHours).toBe(3);
    expect(updatedPlan.versionNotes).toContain("Penyesuaian durasi");
  });

  it("10. Siklus Hidup Persetujuan: Guru ajukan -> Penolakan -> Ajukan ulang -> Persetujuan Kepala Sekolah -> Diterbitkan", async () => {
    // 1. Guru ajukan tinjauan
    mockUserRole = "teacher";
    const submitRes = await submitModulForReviewAction(createdLessonPlanId);
    expect(submitRes.success).toBe(true);

    let [plan] = await db
      .select()
      .from(schema.multigradeLessonPlans)
      .where(eq(schema.multigradeLessonPlans.id, createdLessonPlanId));
    expect(plan.status).toBe("in_review");

    // 2. Kepala Sekolah menolak dengan catatan perbaikan
    mockUserRole = "headmaster";
    const rejectRes = await rejectModulAjarAction(
      createdLessonPlanId,
      "Perlu penambahan alat konkret timbangan kentang untuk kelas 2."
    );
    expect(rejectRes.success).toBe(true);

    [plan] = await db
      .select()
      .from(schema.multigradeLessonPlans)
      .where(eq(schema.multigradeLessonPlans.id, createdLessonPlanId));
    expect(plan.status).toBe("draft");
    expect(plan.rejectionNotes).toContain("timbangan kentang");

    // 3. Guru ajukan ulang
    mockUserRole = "teacher";
    await submitModulForReviewAction(createdLessonPlanId);

    // 4. Kepala Sekolah menyetujui
    mockUserRole = "headmaster";
    const approveRes = await approveModulAjarAction(createdLessonPlanId, "Disetujui untuk kelas rangkap.");
    expect(approveRes.success).toBe(true);

    [plan] = await db
      .select()
      .from(schema.multigradeLessonPlans)
      .where(eq(schema.multigradeLessonPlans.id, createdLessonPlanId));
    expect(plan.status).toBe("approved");
    expect(plan.approvedById).toBeDefined();
    expect(plan.approvedAt).not.toBeNull();

    // 5. Terbitkan untuk pembelajaran aktif kelas
    mockUserRole = "teacher";
    const publishRes = await publishModulAjarAction(createdLessonPlanId);
    expect(publishRes.success).toBe(true);

    [plan] = await db
      .select()
      .from(schema.multigradeLessonPlans)
      .where(eq(schema.multigradeLessonPlans.id, createdLessonPlanId));
    expect(plan.status).toBe("published");
  });

  it("11. Guru tidak boleh menyetujui modul sendiri (Pembatasan Role RBAC)", async () => {
    mockUserRole = "teacher";

    // Guru mencoba menyetujui modul langsung
    const unauthorizedRes = await approveModulAjarAction(createdLessonPlanId);
    expect(unauthorizedRes.success).toBe(false);
    if (!unauthorizedRes.success) {
      expect(unauthorizedRes.error).toContain("Akses ditolak");
    }
  });

  it("12. Harus mengambil data komprehensif untuk workspace dan pratinjau cetak", async () => {
    const fullDetails = await getModulAjarFullDetailsAction(createdLessonPlanId);

    expect(fullDetails).not.toBeNull();
    expect(fullDetails?.plan.id).toBe(createdLessonPlanId);
    expect(fullDetails?.school).toBeDefined();
    expect(fullDetails?.grades.lowerGrade).toBe(1);
    expect(fullDetails?.grades.higherGrade).toBe(2);
    expect(fullDetails?.integrityReport).toBeDefined();
  });
});
