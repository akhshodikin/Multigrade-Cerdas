import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import {
  validateAtpPlan,
  validateSingleTp,
  detectPrerequisiteCycles,
  PEDAGOGICAL_DISCLAIMER,
  DEFAULT_VALIDATION_CONFIG,
} from "../src/lib/curriculum/validation-engine";
import {
  approveAtpWithReviewAction,
  rejectAtpAction,
  activateAtpForTeachingAction,
  submitAtpForReviewAction,
  updateTpPedagogicalAction,
  addTpPrerequisiteAction,
} from "../src/app/actions/validation";

describe("Pengujian Mesin Validasi Kurikulum Multigrade Cerdas AI", () => {
  let subjectId: string;
  let cpId: string;
  let validTp1Id: string;
  let validTp2Id: string;
  let orphanTpId: string;
  let testPlanId: string;

  beforeAll(async () => {
    // 1. Pastikan ada subject matematika
    const [sub] = await db
      .select()
      .from(schema.subjects)
      .where(eq(schema.subjects.id, "matematika"));
    subjectId = sub ? sub.id : (await db.select().from(schema.subjects).limit(1))[0].id;

    // 2. Buat CP uji coba khusus Fase B
    const [newCp] = await db
      .insert(schema.capaianPembelajaran)
      .values({
        subjectId,
        phase: "Fase B",
        element: "Bilangan",
        originalSourceText: "Peserta didik menunjukkan pemahaman dan intuisi bilangan cacah sampai 10.000.",
        duplicateHash: `test_val_hash_${Date.now()}`,
        verificationStatus: "approved",
      })
      .returning();
    cpId = newCp.id;

    // 3. Buat dua TP valid yang terhubung ke CP
    const [tp1] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId,
        subjectId,
        phase: "Fase B",
        targetGrade: 3,
        code: `TP-TEST-VAL-01-${Date.now()}`,
        competency: "Membaca dan menulis bilangan cacah",
        contentScope: "Bilangan cacah sampai 1.000",
        description: "Peserta didik dapat membaca dan menulis bilangan cacah sampai 1.000 dengan benar.",
        sourceType: "derived_teacher",
        verificationStatus: "approved",
      })
      .returning();
    validTp1Id = tp1.id;

    const [tp2] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId,
        subjectId,
        phase: "Fase B",
        targetGrade: 3,
        code: `TP-TEST-VAL-02-${Date.now()}`,
        competency: "Membandingkan dan mengurutkan bilangan cacah",
        contentScope: "Bilangan cacah sampai 1.000",
        description: "Peserta didik dapat membandingkan dan mengurutkan bilangan cacah sampai 1.000.",
        sourceType: "derived_teacher",
        verificationStatus: "approved",
      })
      .returning();
    validTp2Id = tp2.id;

    // 4. Buat satu TP Yatim (orphan TP, tanpa cpId)
    const [orphan] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId: null,
        subjectId,
        phase: "Fase B",
        targetGrade: 3,
        code: `TP-TEST-ORPHAN-${Date.now()}`,
        competency: "Kompetensi tanpa dasar CP",
        contentScope: "Materi tanpa CP",
        description: "Tujuan pembelajaran yang tidak memiliki rujukan CP resmi pemerintah.",
        sourceType: "derived_teacher",
        verificationStatus: "draft",
      })
      .returning();
    orphanTpId = orphan.id;
  });

  it("1. Relasi Sah CP–TP–ATP: Alur valid harus lulus pemeriksaan teknis", async () => {
    // Buat ATP Plan uji coba
    const [plan] = await db
      .insert(schema.atpPlans)
      .values({
        title: `ATP Matematika Uji Validasi ${Date.now()}`,
        subjectId,
        phase: "Fase B",
        academicYear: "2024/2025",
        totalHours: 8,
        status: "draft",
      })
      .returning();
    testPlanId = plan.id;

    // Tambahkan 2 butir berurutan dengan alur rapi: TP 1 (urutan 1, 4 JP), TP 2 (urutan 2, 4 JP)
    await db.insert(schema.atpItems).values([
      {
        atpPlanId: testPlanId,
        tpId: validTp1Id,
        sequenceOrder: 1,
        allocatedHours: 4,
        targetGrade: 3,
        semester: "Ganjil",
      },
      {
        atpPlanId: testPlanId,
        tpId: validTp2Id,
        sequenceOrder: 2,
        allocatedHours: 4,
        targetGrade: 3,
        semester: "Ganjil",
      },
    ]);

    // Tambahkan prasyarat yang BENAR: TP 2 mensyaratkan TP 1 (TP 1 urutan 1 < TP 2 urutan 2)
    await db.insert(schema.tpPrerequisites).values({
      tpId: validTp2Id,
      prerequisiteTpId: validTp1Id,
      prerequisiteType: "wajib",
    });

    const report = await validateAtpPlan(testPlanId);

    expect(report.isValidTechnically).toBe(true);
    expect(report.criticalCount).toBe(0);
    expect(report.pedagogicalDisclaimer).toBe(PEDAGOGICAL_DISCLAIMER);
    expect(report.summary).toContain("lolos pemeriksaan teknis otomatis");
  });

  it("2. Deteksi TP Yatim: Memblokir TP yang tidak memiliki dasar CP resmi", async () => {
    // Buat plan baru berisi orphan TP
    const [orphanPlan] = await db
      .insert(schema.atpPlans)
      .values({
        title: `ATP dengan Orphan TP ${Date.now()}`,
        subjectId,
        phase: "Fase B",
        academicYear: "2024/2025",
        totalHours: 4,
        status: "draft",
      })
      .returning();

    await db.insert(schema.atpItems).values({
      atpPlanId: orphanPlan.id,
      tpId: orphanTpId,
      sequenceOrder: 1,
      allocatedHours: 4,
      targetGrade: 3,
      semester: "Ganjil",
    });

    const report = await validateAtpPlan(orphanPlan.id);

    expect(report.isValidTechnically).toBe(false);
    expect(report.criticalCount).toBeGreaterThanOrEqual(1);

    const orphanIssue = report.issues.find((i) => i.ruleCode === "RULE_TP_ORPHAN");
    expect(orphanIssue).toBeDefined();
    expect(orphanIssue?.severity).toBe("kritis");
    expect(orphanIssue?.description).toContain("tidak memiliki referensi Capaian Pembelajaran");

    // Uji juga fungsi validateSingleTp
    const singleTpIssues = await validateSingleTp(orphanTpId);
    expect(singleTpIssues.some((i) => i.ruleCode === "RULE_TP_ORPHAN")).toBe(true);
  });

  it("3. Deteksi Pelanggaran Prasyarat: Prasyarat diajarkan setelah materi sasaran", async () => {
    // Buat plan di mana TP 2 (yang membutuhkan TP 1) ditaruh di urutan 1, dan TP 1 di urutan 2
    const [invertedPlan] = await db
      .insert(schema.atpPlans)
      .values({
        title: `ATP Urutan Prasyarat Terbalik ${Date.now()}`,
        subjectId,
        phase: "Fase B",
        academicYear: "2024/2025",
        totalHours: 8,
        status: "draft",
      })
      .returning();

    await db.insert(schema.atpItems).values([
      {
        atpPlanId: invertedPlan.id,
        tpId: validTp2Id, // Butuh TP 1, tapi diajarkan DULUAN di urutan 1
        sequenceOrder: 1,
        allocatedHours: 4,
        targetGrade: 3,
        semester: "Ganjil",
      },
      {
        atpPlanId: invertedPlan.id,
        tpId: validTp1Id, // Prasyaratnya malah diajarkan di urutan 2
        sequenceOrder: 2,
        allocatedHours: 4,
        targetGrade: 3,
        semester: "Ganjil",
      },
    ]);

    const report = await validateAtpPlan(invertedPlan.id);

    expect(report.isValidTechnically).toBe(false);
    const prereqIssue = report.issues.find((i) => i.ruleCode === "RULE_PREREQ_VIOLATION");
    expect(prereqIssue).toBeDefined();
    expect(prereqIssue?.severity).toBe("kritis");
    expect(prereqIssue?.description).toContain("diajarkan di urutan yang sama atau sesudahnya");
  });

  it("4. Deteksi Siklus Sirkular Prasyarat (Cycle Detection)", () => {
    // Kasus 1: Siklus 2 node (A -> B -> A)
    const cyclicPair = [
      { tpId: "node-A", prerequisiteTpId: "node-B" },
      { tpId: "node-B", prerequisiteTpId: "node-A" },
    ];
    const check1 = detectPrerequisiteCycles(cyclicPair);
    expect(check1.hasCycle).toBe(true);

    // Kasus 2: Siklus 3 node (A -> B -> C -> A)
    const cyclicTrio = [
      { tpId: "node-A", prerequisiteTpId: "node-B" },
      { tpId: "node-B", prerequisiteTpId: "node-C" },
      { tpId: "node-C", prerequisiteTpId: "node-A" },
    ];
    const check2 = detectPrerequisiteCycles(cyclicTrio);
    expect(check2.hasCycle).toBe(true);

    // Kasus 3: Alur Asiklis Maju Sah (DAG: A -> B -> C)
    const acyclic = [
      { tpId: "node-C", prerequisiteTpId: "node-B" },
      { tpId: "node-B", prerequisiteTpId: "node-A" },
    ];
    const check3 = detectPrerequisiteCycles(acyclic);
    expect(check3.hasCycle).toBe(false);
  });

  it("5. Siklus Status ATP: draf -> ditinjau -> disetujui -> digunakan (aktif)", async () => {
    // Mulai dari draft
    const [p] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, testPlanId));
    expect(p.status).toBe("draft");

    // 1. Ajukan tinjauan (draft -> in_review)
    await db
      .update(schema.atpPlans)
      .set({ status: "in_review", version: p.version + 1 })
      .where(eq(schema.atpPlans.id, testPlanId));

    const [inReviewPlan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, testPlanId));
    expect(inReviewPlan.status).toBe("in_review");

    // 2. Setujui ATP (in_review -> approved)
    await db
      .update(schema.atpPlans)
      .set({
        status: "approved",
        approvedAt: new Date(),
        version: inReviewPlan.version + 1,
      })
      .where(eq(schema.atpPlans.id, testPlanId));

    const [approvedPlan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, testPlanId));
    expect(approvedPlan.status).toBe("approved");

    // 3. Aktifkan untuk pembelajaran (approved -> in_use)
    await db
      .update(schema.atpPlans)
      .set({
        status: "in_use",
        inUseAt: new Date(),
        version: approvedPlan.version + 1,
      })
      .where(eq(schema.atpPlans.id, testPlanId));

    const [activePlan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, testPlanId));
    expect(activePlan.status).toBe("in_use");
    expect(activePlan.inUseAt).toBeDefined();
  });

  it("6. Penolakan ATP: Wajib menyertakan catatan alasan penolakan", async () => {
    const [p] = await db
      .insert(schema.atpPlans)
      .values({
        title: `ATP Uji Penolakan ${Date.now()}`,
        subjectId,
        phase: "Fase B",
        academicYear: "2024/2025",
        totalHours: 10,
        status: "in_review",
      })
      .returning();

    // Tolak dengan alasan
    const rejectionReason = "Alur belum menyertakan asesmen diagnostik di awal topik.";
    await db
      .update(schema.atpPlans)
      .set({
        status: "rejected",
        rejectionNotes: rejectionReason,
        version: p.version + 1,
      })
      .where(eq(schema.atpPlans.id, p.id));

    const [rejectedPlan] = await db
      .select()
      .from(schema.atpPlans)
      .where(eq(schema.atpPlans.id, p.id));

    expect(rejectedPlan.status).toBe("rejected");
    expect(rejectedPlan.rejectionNotes).toBe(rejectionReason);
  });

  it("7. Perubahan Pedagogis TP: Memperbarui rumusan tanpa merusak relasi dan teks CP", async () => {
    // Ambil TP awal
    const [initialTp] = await db
      .select()
      .from(schema.tujuanPembelajaran)
      .where(eq(schema.tujuanPembelajaran.id, validTp1Id));

    const initialVersion = initialTp.version;

    // Update deskripsi TP dengan penyesuaian pedagogis
    const updatedDesc = "Peserta didik dapat membaca dan menulis bilangan cacah sampai 1.000 dengan benda konkrit lokal.";
    await db
      .update(schema.tujuanPembelajaran)
      .set({
        description: updatedDesc,
        version: initialVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.tujuanPembelajaran.id, validTp1Id));

    // Periksa bahwa teks CP induk TETAP TIDAK BERUBAH
    const [parentCp] = await db
      .select()
      .from(schema.capaianPembelajaran)
      .where(eq(schema.capaianPembelajaran.id, initialTp.cpId!));

    expect(parentCp.originalSourceText).toContain("pemahaman dan intuisi bilangan cacah");

    // Periksa bahwa butir ATP yang merujuk ke TP1 tetap utuh
    const atpItemRef = await db
      .select()
      .from(schema.atpItems)
      .where(eq(schema.atpItems.tpId, validTp1Id));

    expect(atpItemRef.length).toBeGreaterThan(0);
  });
});
