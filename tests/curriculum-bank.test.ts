import { describe, it, expect } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  extractDocumentContent,
  generateDuplicateHash,
} from "@/lib/curriculum/extractor";
import {
  recordCurriculumVersion,
  compareSnapshots,
} from "@/lib/curriculum/versioning";
import {
  curriculumSourceSchema,
  capaianPembelajaranSchema,
  tujuanPembelajaranSchema,
  atpPlanSchema,
} from "@/lib/validations/curriculum";

describe("Pengujian Modul Bank Kurikulum Multigrade", () => {
  it("harus mengekstraksi konten dokumen teks dan menandai pemeriksaan manual jika meragukan", async () => {
    // 1. Ekstraksi dokumen teks manual normal
    const normalText = "Capaian Pembelajaran Bahasa Indonesia Fase B mencakup elemen menyimak dan membaca.";
    const resultNormal = await extractDocumentContent(
      Buffer.from(normalText),
      "manual",
      "sumber.txt"
    );
    expect(resultNormal.text).toBe(normalText);
    expect(resultNormal.needsManualReview).toBe(false);

    // 2. Ekstraksi file palsu atau rusak
    const invalidBuffer = Buffer.from("Corrupt content %PDF-garbage");
    const resultDubious = await extractDocumentContent(
      invalidBuffer,
      "pdf",
      "corrupt.pdf"
    );
    expect(resultDubious.needsManualReview).toBe(true);
    expect(resultDubious.reviewReason).toBeDefined();
  });

  it("harus menghasilkan duplicate hash deterministik untuk mendeteksi CP duplikat", () => {
    const textA = "Peserta didik mampu bersikap menjadi pendengar yang penuh perhatian.";
    const textB = "  peserta didik mampu bersikap menjadi pendengar yang penuh perhatian.  "; // dengan spasi dan variasi huruf

    const hash1 = generateDuplicateHash("bahasa-indonesia", "Fase A", "Menyimak", textA);
    const hash2 = generateDuplicateHash("bahasa-indonesia", "Fase A", "Menyimak", textB);

    expect(hash1).toBe(hash2);

    const hashDiff = generateDuplicateHash("matematika", "Fase A", "Menyimak", textA);
    expect(hash1).not.toBe(hashDiff);
  });

  it("harus memvalidasi rumusan CP resmi BSKAP 032/H/KR/2024 dan memisahkannya dari interpretasi AI", async () => {
    const cps = await db.select().from(schema.capaianPembelajaran);
    expect(cps.length).toBeGreaterThanOrEqual(6);

    const matB = cps.find((c) => c.subjectId === "matematika" && c.phase === "Fase B");
    expect(matB).toBeDefined();
    expect(matB?.originalSourceText).toContain("Pada akhir fase B, peserta didik menunjukkan pemahaman dan intuisi bilangan");
    expect(matB?.sourcePage).toBe("Hal. 143");

    // Rumusan asli tidak boleh terkontaminasi catatan AI
    expect(matB?.aiInterpretation).toBeNull();
  });

  it("harus memverifikasi hubungan TP dengan CP dan fase yang bersesuaian", async () => {
    const tps = await db.select().from(schema.tujuanPembelajaran);
    expect(tps.length).toBeGreaterThanOrEqual(2);

    const tpMat = tps.find((t) => t.code === "TP-MAT-B.3-01");
    expect(tpMat).toBeDefined();
    expect(tpMat?.subjectId).toBe("matematika");
    expect(tpMat?.phase).toBe("Fase B");
    expect(tpMat?.targetGrade).toBe(3);
    expect(tpMat?.cpId).toBeDefined();
  });

  it("harus memverifikasi Alur Tujuan Pembelajaran (ATP) dan butir urutan jam pelajaran", async () => {
    const atps = await db.select().from(schema.atpPlans);
    expect(atps.length).toBeGreaterThanOrEqual(1);

    const atpPlan = atps[0];
    const items = await db
      .select()
      .from(schema.atpItems)
      .where(eq(schema.atpItems.atpPlanId, atpPlan.id));

    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items[0].sequenceOrder).toBe(1);
    expect(items[1].sequenceOrder).toBe(2);
    expect(items[0].allocatedHours).toBeGreaterThan(0);
    expect(items[0].multigradeNotes).toBeDefined();
  });

  it("harus melacak riwayat versi dan mendeteksi komparasi perubahan snapshot", () => {
    const prevSnapshot = {
      code: "TP-MAT-01",
      competency: "Membaca bilangan",
      verificationStatus: "draft",
    };

    const nextSnapshot = {
      code: "TP-MAT-01",
      competency: "Membaca dan menulis bilangan cacah",
      verificationStatus: "approved",
    };

    const diffs = compareSnapshots(prevSnapshot, nextSnapshot);
    expect(diffs.length).toBe(2);

    const statusDiff = diffs.find((d) => d.field === "verificationStatus");
    expect(statusDiff).toBeDefined();
    expect(statusDiff?.previousValue).toBe("draft");
    expect(statusDiff?.currentValue).toBe("approved");
  });

  it("harus menolak schema CP jika data wajib tidak terpenuhi", () => {
    const invalidCp = {
      subjectId: "",
      phase: "Fase D", // Bukan SD
      element: "",
      sourceDocumentId: "invalid-uuid",
      sourcePage: "",
      originalSourceText: "pendek",
    };

    const parseResult = capaianPembelajaranSchema.safeParse(invalidCp);
    expect(parseResult.success).toBe(false);
  });
});
