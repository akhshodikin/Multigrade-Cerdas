import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  generateDifferentiatedLkpdPair,
  generateComplementaryMediaSet,
  checkLkpdCurriculumIntegrity,
} from "@/lib/lkpd-media/generator";
import { getIllustrationSvg, SVG_ILLUSTRATIONS } from "@/lib/lkpd-media/svg-illustrations";

describe("Pengujian Modul LKPD dan Media Pembelajaran Multigrade", () => {
  let sampleGroupA: typeof schema.multigradeGroups.$inferSelect;
  let sampleSubjectMat: typeof schema.subjects.$inferSelect;
  let lowerGradeTp: typeof schema.tujuanPembelajaran.$inferSelect;
  let higherGradeTp: typeof schema.tujuanPembelajaran.$inferSelect;
  let createdLowerLkpdId: string;
  let createdHigherLkpdId: string;

  beforeAll(async () => {
    // Ambil data referensi riil dari DB
    const group = await db.query.multigradeGroups.findFirst({
      where: eq(schema.multigradeGroups.id, "group-a"),
    });
    const subject = await db.query.subjects.findFirst({
      where: eq(schema.subjects.id, "matematika"),
    });

    if (!group || !subject) {
      throw new Error("Data seed awal belum lengkap.");
    }

    sampleGroupA = group;
    sampleSubjectMat = subject;

    // Ambil TP yang sesuai untuk Fase A Matematika
    const tps = await db.query.tujuanPembelajaran.findMany({
      where: eq(schema.tujuanPembelajaran.subjectId, "matematika"),
    });

    const tp1 = tps.find((t) => t.targetGrade === 1) || tps[0];
    const tp2 = tps.find((t) => t.targetGrade === 2) || tps[1] || tps[0];

    lowerGradeTp = tp1;
    higherGradeTp = tp2;
  });

  // 1. Generator LKPD berpasangan untuk kelas rangkap
  it("harus menghasilkan sepasang LKPD berbeda untuk Kelas 1 dan Kelas 2 dalam satu tema bersama", async () => {
    const result = await generateDifferentiatedLkpdPair({
      groupId: sampleGroupA.id,
      subjectId: sampleSubjectMat.id,
      themeOrTopic: "Operasi Hitung Sayuran Kebun Sedaeng",
      lowerGradeTpId: lowerGradeTp.id,
      higherGradeTpId: higherGradeTp.id,
      timeAllocationMinutes: 35,
      preferredColorMode: "color",
      localTosariContext: true,
    });

    expect(result.lowerGradeLkpd).toBeDefined();
    expect(result.higherGradeLkpd).toBeDefined();

    // Verifikasi jenjang kelas
    expect(result.lowerGradeLkpd.grade).toBe(1);
    expect(result.higherGradeLkpd.grade).toBe(2);

    // Keduanya memiliki ID unik di database
    expect(result.lowerGradeLkpd.id).not.toBe(result.higherGradeLkpd.id);
    expect(result.lowerGradeLkpd.status).toBe("draft");
    expect(result.higherGradeLkpd.status).toBe("draft");

    createdLowerLkpdId = result.lowerGradeLkpd.id;
    createdHigherLkpdId = result.higherGradeLkpd.id;
  });

  // 2. Perbedaan tugas antarjenjang (Graduated Differentiation Invariant)
  it("harus membedakan secara nyata tugas dan format jawaban antara Kelas 1 dan Kelas 2", async () => {
    const lower = await db.query.lkpdWorksheets.findFirst({
      where: eq(schema.lkpdWorksheets.id, createdLowerLkpdId),
    });
    const higher = await db.query.lkpdWorksheets.findFirst({
      where: eq(schema.lkpdWorksheets.id, createdHigherLkpdId),
    });

    expect(lower).toBeDefined();
    expect(higher).toBeDefined();

    // Kelas 1 harus memiliki jenis soal menggambar / mencocokkan visual
    const lowerQuestionTypes = (lower!.answerSections as any[]).map((q) => q.questionType);
    expect(lowerQuestionTypes).toContain("drawing_area");
    expect(lowerQuestionTypes).toContain("matching");

    // Kelas 2 harus memiliki jenis soal analisis / isian uraian / jawaban singkat
    const higherQuestionTypes = (higher!.answerSections as any[]).map((q) => q.questionType);
    expect(higherQuestionTypes).toContain("short_answer");
    expect(higherQuestionTypes).toContain("essay");

    // Total butir soal kelas atas harus mencakup tantangan penalaran
    expect(higherQuestionTypes.length).toBeGreaterThanOrEqual(4);
  });

  // 3. Invarian Petunjuk Sesuai Usia
  it("harus menyajikan petunjuk pengerjaan ramah anak sesuai tingkat perkembangan usia", async () => {
    const lower = await db.query.lkpdWorksheets.findFirst({
      where: eq(schema.lkpdWorksheets.id, createdLowerLkpdId),
    });
    const higher = await db.query.lkpdWorksheets.findFirst({
      where: eq(schema.lkpdWorksheets.id, createdHigherLkpdId),
    });

    const lowerInstructions = (lower!.ageAppropriateInstructions as string[]).join(" ");
    const higherInstructions = (higher!.ageAppropriateInstructions as string[]).join(" ");

    // Kelas 1 memuat arahan bimbingan lisan guru
    expect(lowerInstructions.toLowerCase()).toContain("dengarkan");

    // Kelas 2 memuat arahan membaca mandiri
    expect(higherInstructions.toLowerCase()).toContain("bacalah");
  });

  // 4. Konsistensi TP & Penolakan TP Fiktif (Anti-Halusinasi)
  it("harus menolak pembuatan LKPD jika ID Tujuan Pembelajaran tidak ditemukan dalam database resmi", async () => {
    const fakeTpId = "00000000-0000-0000-0000-000000000000";

    await expect(
      generateDifferentiatedLkpdPair({
        groupId: sampleGroupA.id,
        subjectId: sampleSubjectMat.id,
        themeOrTopic: "Topik Uji Penolakan",
        lowerGradeTpId: fakeTpId,
        higherGradeTpId: higherGradeTp.id,
      })
    ).rejects.toThrow(/tidak ditemukan dalam Bank Kurikulum resmi/);
  });

  // 5. Dukungan Versi Cetak Berwarna & Hitam Putih (B&W Eco-Print)
  it("harus mendukung rendering ilustrasi SVG dalam mode Berwarna dan Hitam Putih Ramah Tinta", () => {
    const colorSvg = getIllustrationSvg("kentang_tosari", "color", 100);
    const bwEcoSvg = getIllustrationSvg("kentang_tosari", "bw_eco", 100);

    expect(colorSvg).toContain("<svg");
    expect(bwEcoSvg).toContain("<svg");

    // Mode warna menggunakan warna kuning kentang (#fde047)
    expect(colorSvg).toContain("#fde047");

    // Mode B&W Eco menggunakan putih / fill hemat tinta (#ffffff)
    expect(bwEcoSvg).toContain("#ffffff");
  });

  // 6. Fallback Ilustrasi Aman saat Offline / Layanan Gambar Eksternal Gagal
  it("harus memberikan ilustrasi fallback lokal yang aman jika kunci ilustrasi tidak ditemukan", () => {
    const fallbackSvg = getIllustrationSvg("kunci_tidak_ada_12345", "color");
    expect(fallbackSvg).toBeDefined();
    expect(fallbackSvg).toContain("<svg");
    // Fallback default menggunakan kebun_sayur_tosari
    expect(fallbackSvg).toContain("viewBox");
  });

  // 7. Kumpulan Media: Bahan Bacaan Bertingkat
  it("harus menghasilkan bahan bacaan bertingkat dengan pembedaan jumlah kata dan kosakata kontekstual", async () => {
    const mediaSet = await generateComplementaryMediaSet({
      groupId: sampleGroupA.id,
      subjectId: sampleSubjectMat.id,
      themeOrTopic: "Petani Sayur Tosari",
    });

    expect(mediaSet.bacaanMedia).toBeDefined();
    const readingItem = mediaSet.bacaanMedia[0];
    const passages = (readingItem.contentData as any).passages;

    expect(passages).toHaveLength(2);
    const level1 = passages[0];
    const level2 = passages[1];

    // Kelas rendah memiliki jumlah kata lebih sedikit daripada kelas tinggi
    expect(level1.wordCount).toBeLessThan(level2.wordCount);
    expect(level1.vocabulary).toBeDefined();
    expect(level2.comprehensionQuestions).toBeDefined();
  });

  // 8. Kumpulan Media: Presentasi Pembelajaran 5 Slide
  it("harus menyusun tayangan kelas presentasi 5 slide pemantik untuk bimbingan kelas rangkap", async () => {
    const mediaSet = await generateComplementaryMediaSet({
      groupId: sampleGroupA.id,
      subjectId: sampleSubjectMat.id,
      themeOrTopic: "Menjelajah Kebun Tosari",
    });

    expect(mediaSet.slideMedia).toBeDefined();
    const slideItem = mediaSet.slideMedia[0];
    const slides = (slideItem.contentData as any).slides;

    expect(slides).toHaveLength(5);
    expect(slides[0].title).toContain("Selamat Pagi");
    expect(slides[0].teacherScript).toBeDefined();
  });

  // 9. Kumpulan Media: Kartu Gambar & Aktivitas
  it("harus menghasilkan set kartu gambar yang memuat kata untuk kelas 1 dan kalimat untuk kelas 2", async () => {
    const mediaSet = await generateComplementaryMediaSet({
      groupId: sampleGroupA.id,
      subjectId: sampleSubjectMat.id,
      themeOrTopic: "Kosakata Pertanian Tosari",
    });

    expect(mediaSet.kartuMedia).toBeDefined();
    const cardsItem = mediaSet.kartuMedia[0];
    const cards = (cardsItem.contentData as any).cards;

    expect(cards.length).toBeGreaterThanOrEqual(4);
    const firstCard = cards[0];
    expect(firstCard.wordGrade1).toBeDefined();
    expect(firstCard.sentenceGrade2).toBeDefined();
  });

  // 10. Audit Integritas Kurikulum LKPD
  it("harus memvalidasi ketertelusuran TP dan mendeteksi keselarasan jenjang kelas", async () => {
    const report = await checkLkpdCurriculumIntegrity(createdLowerLkpdId);

    expect(report.lkpdId).toBe(createdLowerLkpdId);
    expect(report.grade).toBe(1);
    expect(report.isConsistent).toBe(true);
    expect(report.issues.filter((i) => i.severity === "kritis")).toHaveLength(0);
  });

  // 11. Refleksi Siswa & Rubrik Penilaian Guru
  it("harus menyediakan instrumen refleksi siswa dengan emotikon dan rubrik 4 tingkat ketercapaian", async () => {
    const lower = await db.query.lkpdWorksheets.findFirst({
      where: eq(schema.lkpdWorksheets.id, createdLowerLkpdId),
    });

    expect(lower).toBeDefined();
    const reflection = lower!.studentReflection as any;
    expect(reflection.emoticonOptions.length).toBeGreaterThanOrEqual(3);

    const rubric = lower!.teacherRubric as any[];
    expect(rubric.length).toBeGreaterThanOrEqual(2);
    expect(rubric[0]).toHaveProperty("perluBimbingan");
    expect(rubric[0]).toHaveProperty("sangatBaik");
  });

  // 12. Duplikasi dan Perubahan Versi LKPD
  it("harus mampu menduplikasi LKPD dengan penanda salinan dan status draf awal", async () => {
    const original = await db.query.lkpdWorksheets.findFirst({
      where: eq(schema.lkpdWorksheets.id, createdLowerLkpdId),
    });

    const [duplicated] = await db
      .insert(schema.lkpdWorksheets)
      .values({
        ...original!,
        id: undefined,
        title: `${original!.title} (Salinan)`,
        status: "draft",
        version: 1,
        clonedFromId: original!.id,
      })
      .returning();

    expect(duplicated.id).not.toBe(original!.id);
    expect(duplicated.title).toContain("(Salinan)");
    expect(duplicated.clonedFromId).toBe(original!.id);
    expect(duplicated.status).toBe("draft");
  });
});
