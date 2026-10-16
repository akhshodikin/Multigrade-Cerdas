import { describe, it, expect, beforeAll, vi } from "vitest";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth session to return teacher/headmaster user
let mockUserRole: "admin" | "headmaster" | "teacher" = "teacher";
let mockUserId = "11111111-1111-1111-1111-111111111111";

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
import { getAiProvider, getAvailableProviders } from "../src/lib/ai/provider-factory";
import { MockLocalProvider } from "../src/lib/ai/providers/mock-local-provider";
import {
  IntersectionMappingRequest,
  IntersectionMappingResultSchema,
  SourceTpInput,
} from "../src/lib/ai/types";
import {
  generateMaterialIntersectionAction,
  createManualIntersectionAction,
  updateMaterialIntersectionAction,
  reviewMaterialIntersectionAction,
  approveMaterialIntersectionAction,
  rejectMaterialIntersectionAction,
  getMaterialIntersectionByIdAction,
} from "../src/app/actions/material-intersection";

describe("Pengujian Pemetaan Irisan Materi Multigrade Cerdas AI", () => {
  let subjectId: string;
  let cpAId: string;
  let cpBId: string;
  let tpGrade1Similar: string;
  let tpGrade2Similar: string;
  let tpGrade1Distinct: string;
  let tpGrade2Distinct: string;
  let teacherUserId: string;
  let headmasterUserId: string;

  beforeAll(async () => {
    // 1. Ambil atau buat mata pelajaran matematika
    const [sub] = await db
      .select()
      .from(schema.subjects)
      .where(eq(schema.subjects.id, "matematika"));
    subjectId = sub ? sub.id : (await db.select().from(schema.subjects).limit(1))[0].id;

    // 2. Ambil user guru dan kepala sekolah untuk otorisasi
    const [teacher] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "teacher"));
    const [headmaster] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "headmaster"));

    teacherUserId = teacher.id;
    headmasterUserId = headmaster.id;
    mockUserId = teacherUserId;
    mockUserRole = "teacher";

    // 3. Buat Capaian Pembelajaran (CP) Fase A untuk pengujian
    const [newCpA] = await db
      .insert(schema.capaianPembelajaran)
      .values({
        subjectId,
        phase: "Fase A",
        element: "Bilangan",
        originalSourceText:
          "Peserta didik menunjukkan pemahaman dan intuisi bilangan pada bilangan cacah sampai 100.",
        duplicateHash: `test_map_cp_a_${Date.now()}`,
        verificationStatus: "approved",
      })
      .returning();
    cpAId = newCpA.id;

    const [newCpB] = await db
      .insert(schema.capaianPembelajaran)
      .values({
        subjectId,
        phase: "Fase A",
        element: "Pengukuran dan Geometri",
        originalSourceText:
          "Peserta didik dapat mengidentifikasi berbagai bangun datar dan bangun ruang tiga dimensi.",
        duplicateHash: `test_map_cp_b_${Date.now()}`,
        verificationStatus: "approved",
      })
      .returning();
    cpBId = newCpB.id;

    // 4. Buat TP Serupa (Overlapping concept: Bilangan dan Operasi Hitung)
    const [tp1Sim] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId: cpAId,
        subjectId,
        phase: "Fase A",
        targetGrade: 1,
        code: `TP-TEST-SIM-G1-${Date.now()}`,
        competency: "Menghitung dan mengelompokkan bilangan cacah 1 sampai 20",
        contentScope: "Bilangan dan kuantitas konkret",
        description:
          "Peserta didik dapat membilang dan mengelompokkan bilangan cacah sampai 20 menggunakan benda konkret di sekitar Tosari.",
        verificationStatus: "approved",
      })
      .returning();
    tpGrade1Similar = tp1Sim.id;

    const [tp2Sim] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId: cpAId,
        subjectId,
        phase: "Fase A",
        targetGrade: 2,
        code: `TP-TEST-SIM-G2-${Date.now()}`,
        competency: "Melakukan penjumlahan dan pengurangan bilangan cacah sampai 50",
        contentScope: "Operasi hitung bilangan cacah",
        description:
          "Peserta didik dapat menyelesaikan soal cerita penjumlahan dan pengurangan bilangan cacah hingga 50.",
        verificationStatus: "approved",
      })
      .returning();
    tpGrade2Similar = tp2Sim.id;

    // 5. Buat TP Tidak Cocok Digabung / Berbeda Jauh (Distinct concepts)
    const [tp1Dist] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId: cpAId,
        subjectId,
        phase: "Fase A",
        targetGrade: 1,
        code: `TP-TEST-DIST-G1-${Date.now()}`,
        competency: "Mengenal bunyi fonem dan huruf vokal dasar",
        contentScope: "Bunyi huruf dan membaca permulaan",
        description:
          "Peserta didik dapat melafalkan bunyi huruf vokal dan konsonan dasar dalam kata sederhana.",
        verificationStatus: "approved",
      })
      .returning();
    tpGrade1Distinct = tp1Dist.id;

    const [tp2Dist] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId: cpBId,
        subjectId,
        phase: "Fase A",
        targetGrade: 2,
        code: `TP-TEST-DIST-G2-${Date.now()}`,
        competency: "Mengukur volume bangun ruang kubus dan balok tiga dimensi",
        contentScope: "Volume bangun ruang tiga dimensi",
        description:
          "Peserta didik dapat membandingkan kapasitas dan volume kubus serta balok secara eksperimental.",
        verificationStatus: "approved",
      })
      .returning();
    tpGrade2Distinct = tp2Dist.id;
  });

  // TEST 1: Provider Factory
  describe("1. AI Provider Factory & Interchangeability", () => {
    it("harus menyediakan daftar engine AI (Gemini dan Mock Local)", () => {
      const providers = getAvailableProviders();
      expect(providers).toHaveLength(2);
      expect(providers.map((p) => p.id)).toContain("gemini");
      expect(providers.map((p) => p.id)).toContain("mock_local");

      const mockProvider = providers.find((p) => p.id === "mock_local");
      expect(mockProvider?.isAvailable).toBe(true);
      expect(mockProvider?.isCloud).toBe(false);
    });

    it("harus mengembalikan MockLocalProvider saat diminta atau saat offline", () => {
      const provider = getAiProvider("mock_local");
      expect(provider).toBeInstanceOf(MockLocalProvider);
      expect(provider.id).toBe("mock_local");
    });
  });

  // TEST 2: Heuristic Analysis for Overlapping TPs -> Merged / Partially Integrated
  describe("2. Analisis TP Serupa (Konsep Beririsan)", () => {
    it("harus merekomendasikan strategi terpadu (sebagian/penuh) dan menyusun kegiatan rotasi kelas rangkap", async () => {
      const provider = new MockLocalProvider();

      const request: IntersectionMappingRequest = {
        groupId: "group-a",
        groupName: "Kelompok A",
        phase: "Fase A",
        classes: [1, 2],
        subjectId,
        subjectName: "Matematika",
        academicYear: "2024/2025",
        semester: "Ganjil",
        durationMinutes: 70,
        studentContext: "Siswa banyak berinteraksi dengan komoditas kentang dan kubis di Tosari",
        sourceTpsLowerGrade: [
          {
            id: tpGrade1Similar,
            code: "TP-G1-BIL",
            competency: "Menghitung dan mengelompokkan bilangan cacah 1 sampai 20",
            contentScope: "Bilangan dan kuantitas",
            description: "Membilang dan mengelompokkan bilangan cacah sampai 20 menggunakan benda konkret.",
            targetGrade: 1,
          },
        ],
        sourceTpsHigherGrade: [
          {
            id: tpGrade2Similar,
            code: "TP-G2-OP",
            competency: "Melakukan penjumlahan dan pengurangan bilangan cacah sampai 50",
            contentScope: "Operasi hitung penjumlahan",
            description: "Menyelesaikan penjumlahan dan pengurangan bilangan cacah.",
            targetGrade: 2,
          },
        ],
        prerequisites: [],
      };

      const result = await provider.generateIntersectionMapping(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      // Validasi skema Zod lengkap
      const validated = IntersectionMappingResultSchema.safeParse(data);
      expect(validated.success).toBe(true);

      // Verifikasi strategi terpadu
      expect(["terpadu_sebagian", "terpadu_penuh"]).toContain(data.mappingStrategy);
      expect(data.mergedTps.length).toBeGreaterThan(0);
      expect(data.mergedTps[0].lowerGradeTpId).toBe(tpGrade1Similar);
      expect(data.mergedTps[0].higherGradeTpId).toBe(tpGrade2Similar);

      // Verifikasi alur kegiatan 4 fase
      expect(data.recommendedActivities.sharedOpeningActivity).toBeTruthy();
      expect(data.recommendedActivities.lowerGradeActivity).toBeTruthy();
      expect(data.recommendedActivities.higherGradeActivity).toBeTruthy();
      expect(data.recommendedActivities.sharedClosingActivity).toBeTruthy();

      // Verifikasi diferensiasi
      expect(data.differentiatedOutcomes.lowerGrade.content).toBeTruthy();
      expect(data.differentiatedOutcomes.higherGrade.content).toBeTruthy();

      // Verifikasi disclaimer keyakinan
      expect(data.confidence.disclaimer).toContain("SDN Sedaeng II");
    });
  });

  // TEST 3: Pedagogical Rule: Distinct / Incompatible TPs MUST NOT BE MERGED -> Separate Parallel
  describe("3. Analisis TP Tidak Cocok Digabung (Wajib Terpisah Paralel)", () => {
    it("TIDAK boleh memaksakan penggabungan dan wajib merekomendasikan terpisah_paralel", async () => {
      const provider = new MockLocalProvider();

      const request: IntersectionMappingRequest = {
        groupId: "group-a",
        groupName: "Kelompok A",
        phase: "Fase A",
        classes: [1, 2],
        subjectId,
        subjectName: "Matematika",
        academicYear: "2024/2025",
        semester: "Ganjil",
        durationMinutes: 70,
        sourceTpsLowerGrade: [
          {
            id: tpGrade1Distinct,
            code: "TP-G1-FONEM",
            competency: "Mengenal bunyi fonem dan huruf vokal",
            contentScope: "Bunyi huruf alfabet vokal",
            description: "Mengenal fonem vokal dasar.",
            targetGrade: 1,
          },
        ],
        sourceTpsHigherGrade: [
          {
            id: tpGrade2Distinct,
            code: "TP-G2-VOL",
            competency: "Mengukur volume bangun ruang kubus dan balok tiga dimensi",
            contentScope: "Volume tiga dimensi bangun ruang",
            description: "Mengukur volume bangun kubus.",
            targetGrade: 2,
          },
        ],
        prerequisites: [],
      };

      const result = await provider.generateIntersectionMapping(request);

      expect(result.success).toBe(true);
      const data = result.data!;

      // ATURAN PEDAGOGIS KUNCI: Tidak boleh dipaksakan lebur!
      expect(data.mappingStrategy).toBe("terpisah_paralel");
      expect(data.mergedTps.length).toBe(0); // Kosong, tidak ada TP yang digabung
      expect(data.separateTps.length).toBe(2); // Kedua TP diarahkan terpisah

      const lowerSeparate = data.separateTps.find((s) => s.tpId === tpGrade1Distinct);
      const higherSeparate = data.separateTps.find((s) => s.tpId === tpGrade2Distinct);
      expect(lowerSeparate).toBeDefined();
      expect(higherSeparate).toBeDefined();
      expect(lowerSeparate?.suggestedSoloActivity).toBeTruthy();
      expect(higherSeparate?.suggestedSoloActivity).toBeTruthy();

      // Side by side comparison menunjukkan tidak beririsan
      expect(data.sourceTpsSideBySide[0].relationship).toBe("tidak_beririsan");
    });
  });

  // TEST 4: Anti-Hallucination & PII Protection
  describe("4. Pengamanan Anti-Halusinasi & Privasi Data Siswa (Zero PII)", () => {
    it("harus menolak permintaan jika input konteks siswa memuat NIK, no HP, atau email pribadi", async () => {
      const piiInput = {
        groupId: "group-a",
        subjectId,
        selectedLowerTpIds: [tpGrade1Similar],
        selectedHigherTpIds: [tpGrade2Similar],
        studentConditions: "Siswa Budi Santoso NIK 3501234567890001 no hp 081234567890 butuh bimbingan",
      };

      // Buat session mock dengan role guru
      const res = await generateMaterialIntersectionAction(piiInput);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain("data pribadi");
      }
    });

    it("harus menolak jika TP ID yang dipilih tidak ditemukan di database resmi", async () => {
      const invalidTpInput = {
        groupId: "group-a",
        subjectId,
        selectedLowerTpIds: ["00000000-0000-0000-0000-000000000999"],
        selectedHigherTpIds: [tpGrade2Similar],
        studentConditions: "Kondisi umum pertanian Tosari",
      };

      const res = await generateMaterialIntersectionAction(invalidTpInput);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain("tidak ditemukan di database resmi");
      }
    });
  });

  // TEST 5: Full Server Action Lifecycle (Generate, Persist, Update, Review, Approve, Reject)
  describe("5. Siklus Lengkap Manajemen Irisan Materi (Server Actions & Audit)", () => {
    let createdMapId: string;

    it("harus sukses melakukan generate via server action dan mencatat log penggunaan AI", async () => {
      const validActionInput = {
        groupId: "group-a",
        subjectId,
        academicYear: "2024/2025",
        semester: "Ganjil" as const,
        durationMinutes: 70,
        studentConditions: "Siswa kelas 1 menyukai benda nyata, siswa kelas 2 sudah lancar berhitung.",
        selectedLowerTpIds: [tpGrade1Similar],
        selectedHigherTpIds: [tpGrade2Similar],
        providerId: "mock_local" as const,
      };

      const res = await generateMaterialIntersectionAction(validActionInput);
      expect(res.success).toBe(true);
      if (res.success) {
        createdMapId = res.data.mapId;
        expect(createdMapId).toBeTruthy();
        expect(res.data.result.sharedTheme).toBeTruthy();
      }

      // Verifikasi persistensi di database
      const [savedDb] = await db
        .select()
        .from(schema.multigradeMaterialMaps)
        .where(eq(schema.multigradeMaterialMaps.id, createdMapId));

      expect(savedDb).toBeDefined();
      expect(savedDb.status).toBe("draft");
      expect(savedDb.version).toBe(1);
      expect(savedDb.aiProvider).toBe("mock_local");

      // Verifikasi pencatatan log penggunaan AI
      const logs = await db
        .select()
        .from(schema.aiUsageLogs)
        .where(eq(schema.aiUsageLogs.feature, "pemetaan_irisan_materi"));
      expect(logs.length).toBeGreaterThan(0);
    });

    it("harus dapat mengambil detail pemetaan lengkap beserta relasi kelompok dan mapel", async () => {
      const detail = await getMaterialIntersectionByIdAction(createdMapId);
      expect(detail).toBeDefined();
      expect(detail?.id).toBe(createdMapId);
      expect(detail?.group?.name).toBe("Kelompok A");
      expect(detail?.subject?.name).toBe("Matematika");
      expect(detail?.structuredOutput.recommendedActivities).toBeDefined();
    });

    it("guru dapat memperbarui tema, strategi, dan catatan pedagogis (version bertambah)", async () => {
      const updateRes = await updateMaterialIntersectionAction(createdMapId, {
        sharedTheme: "Tema Baru: Operasi Bilangan Hasil Pertanian Sedaeng Tosari",
        teacherNotes: "Gunakan kentang sebagai manipulatif konkret untuk kelas 1.",
      });

      expect(updateRes.success).toBe(true);

      const [updatedDb] = await db
        .select()
        .from(schema.multigradeMaterialMaps)
        .where(eq(schema.multigradeMaterialMaps.id, createdMapId));

      expect(updatedDb.sharedTheme).toBe(
        "Tema Baru: Operasi Bilangan Hasil Pertanian Sedaeng Tosari"
      );
      expect(updatedDb.teacherNotes).toBe(
        "Gunakan kentang sebagai manipulatif konkret untuk kelas 1."
      );
      expect(updatedDb.version).toBe(2);
    });

    it("guru dapat menandai status menjadi Ditinjau (reviewed)", async () => {
      const reviewRes = await reviewMaterialIntersectionAction(
        createdMapId,
        "Siap ditinjau oleh Kepala Sekolah."
      );
      expect(reviewRes.success).toBe(true);

      const [reviewedDb] = await db
        .select()
        .from(schema.multigradeMaterialMaps)
        .where(eq(schema.multigradeMaterialMaps.id, createdMapId));

      expect(reviewedDb.status).toBe("reviewed");
    });

    it("kepala sekolah dapat menyetujui pemetaan irisan materi", async () => {
      mockUserId = headmasterUserId;
      mockUserRole = "headmaster";

      const approveRes = await approveMaterialIntersectionAction(
        createdMapId,
        "Disetujui untuk panduan kelas rangkap semester ganjil."
      );
      expect(approveRes.success).toBe(true);

      const [approvedDb] = await db
        .select()
        .from(schema.multigradeMaterialMaps)
        .where(eq(schema.multigradeMaterialMaps.id, createdMapId));

      expect(approvedDb.status).toBe("approved");
      expect(approvedDb.approvedAt).toBeDefined();
    });

    it("kepala sekolah dapat menolak / meminta revisi pemetaan materi", async () => {
      mockUserId = headmasterUserId;
      mockUserRole = "headmaster";

      const rejectRes = await rejectMaterialIntersectionAction(
        createdMapId,
        "Perlu penyesuaian waktu bimbingan guru kelas 1."
      );
      expect(rejectRes.success).toBe(true);

      const [rejectedDb] = await db
        .select()
        .from(schema.multigradeMaterialMaps)
        .where(eq(schema.multigradeMaterialMaps.id, createdMapId));

      expect(rejectedDb.status).toBe("rejected");
      expect(rejectedDb.rejectionReason).toBe(
        "Perlu penyesuaian waktu bimbingan guru kelas 1."
      );
    });

    it("dapat membuat pemetaan secara manual tanpa AI", async () => {
      const manualRes = await createManualIntersectionAction({
        groupId: "group-a",
        subjectId,
        academicYear: "2024/2025",
        semester: "Ganjil",
        durationMinutes: 70,
        sharedTheme: "Pemetaan Manual Guru: Bilangan Tradisional Tosari",
        mappingStrategy: "terpadu_sebagian",
        structuredOutput: {
          sharedTheme: "Pemetaan Manual Guru: Bilangan Tradisional Tosari",
          mappingStrategy: "terpadu_sebagian",
          strategyRationale: "Disusun manual oleh guru SDN Sedaeng II.",
          sourceTpsSideBySide: [
            {
              lowerGradeTp: {
                id: tpGrade1Similar,
                code: "TP-G1",
                grade: 1,
                competency: "Membilang 1-20",
                description: "Membilang konkret.",
              },
              higherGradeTp: {
                id: tpGrade2Similar,
                code: "TP-G2",
                grade: 2,
                competency: "Penjumlahan",
                description: "Penjumlahan cacah.",
              },
              relationship: "irisan_kuat",
              relationshipNote: "Irisan konsep bilangan.",
            },
          ],
          mergedTps: [
            {
              title: "Konsep Bilangan",
              lowerGradeTpId: tpGrade1Similar,
              higherGradeTpId: tpGrade2Similar,
              sharedCoreConcept: "Bilangan Cacah",
              rationale: "Konsep dasar sama.",
            },
          ],
          separateTps: [],
          prerequisitesAnalysis: [],
          recommendedActivities: {
            sharedOpeningActivity: "Apersepsi bersama.",
            lowerGradeActivity: "Bimbingan konkret.",
            higherGradeActivity: "Latihan mandiri.",
            sharedClosingActivity: "Refleksi bersama.",
          },
          differentiatedOutcomes: {
            lowerGrade: { content: "Materi G1", process: "Bimbingan", product: "Hasil G1" },
            higherGrade: { content: "Materi G2", process: "Mandiri", product: "Hasil G2" },
          },
          assessmentRecommendations: {
            lowerGradeAssessment: "Observasi G1",
            higherGradeAssessment: "Rubrik G2",
            sharedObservationCriteria: ["Disiplin", "Keaktifan"],
          },
          mappingBasis: {
            pedagogicalNotes: "Disusun manual oleh guru.",
            referencedTpIds: [tpGrade1Similar, tpGrade2Similar],
            referencedCpElements: ["Bilangan"],
          },
          confidence: {
            level: "tinggi",
            score: 100,
            disclaimer: "Pemetaan manual divalidasi langsung oleh guru pengampu.",
          },
        },
      });

      expect(manualRes.success).toBe(true);
      if (manualRes.success) {
        const [manualDb] = await db
          .select()
          .from(schema.multigradeMaterialMaps)
          .where(eq(schema.multigradeMaterialMaps.id, manualRes.data.mapId));
        expect(manualDb).toBeDefined();
        expect(manualDb.aiProvider).toBe("manual");
        expect(manualDb.aiModel).toBe("guru-manual");
      }
    });
  });
});
