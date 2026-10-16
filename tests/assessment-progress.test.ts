import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  createAssessmentSession,
  recordStudentResults,
  getStudentProgressProfile,
  getTpAssessmentRecap,
  getMultigradeGroupRecap,
  generateAiSuggestedFollowUp,
} from "@/lib/assessment/engine";

describe("Pengujian Modul Asesmen & Kemajuan Belajar Siswa Multigrade", () => {
  let sampleGroupA: typeof schema.multigradeGroups.$inferSelect;
  let sampleSubjectMat: typeof schema.subjects.$inferSelect;
  let sampleTp: typeof schema.tujuanPembelajaran.$inferSelect;
  let sampleStudents: (typeof schema.students.$inferSelect)[];
  let teacherUser: typeof schema.users.$inferSelect;
  let createdAssessmentId: string;

  beforeAll(async () => {
    const group = await db.query.multigradeGroups.findFirst({
      where: eq(schema.multigradeGroups.id, "group-a"),
    });
    const subject = await db.query.subjects.findFirst({
      where: eq(schema.subjects.id, "matematika"),
    });
    const teacher = await db.query.users.findFirst({
      where: eq(schema.users.role, "teacher"),
    });

    if (!group || !subject || !teacher) {
      throw new Error("Data seed awal belum lengkap.");
    }

    sampleGroupA = group;
    sampleSubjectMat = subject;
    teacherUser = teacher;

    const tps = await db.query.tujuanPembelajaran.findMany({
      where: eq(schema.tujuanPembelajaran.subjectId, "matematika"),
    });
    sampleTp = tps[0];

    // Ambil siswa kelas 1 (minimal 3 siswa)
    sampleStudents = await db.query.students.findMany({
      where: eq(schema.students.classId, 1),
      limit: 4,
    });

    if (sampleStudents.length < 2) {
      throw new Error("Daftar siswa kelas 1 kurang dari 2.");
    }
  });

  // 1. Pembuatan Sesi Asesmen Diagnostik, Formatif, dan Sumatif
  it("harus membuat sesi asesmen formatif baru dengan keterkaitan TP dan instrumen", async () => {
    const assessment = await createAssessmentSession(
      {
        title: "Asesmen Formatif: Observasi Berhitung Benda Konkret Sayur Tosari",
        assessmentType: "formatif",
        classId: 1,
        groupId: sampleGroupA.id,
        phase: sampleGroupA.phase,
        subjectId: sampleSubjectMat.id,
        tpId: sampleTp.id,
        tpCode: sampleTp.code,
        academicYear: "2024/2025",
        semester: "Ganjil",
        instrumentType: "rubrik_observasi",
        rubricSchema: [
          {
            criteria: "Kemampuan membilang dan mengelompokkan benda konkret",
            perluBimbingan: "Belum mampu membilang tanpa bantuan langsung",
            cukup: "Mampu membilang dengan sedikit arahan",
            baik: "Mampu membilang dan mengelompokkan dengan tepat",
            sangatBaik: "Sangat cepat, akurat, dan mampu bernalar",
            maxScore: 100,
          },
        ],
      },
      teacherUser.id
    );

    expect(assessment).toBeDefined();
    expect(assessment.title).toContain("Observasi Berhitung");
    expect(assessment.assessmentType).toBe("formatif");
    expect(assessment.instrumentType).toBe("rubrik_observasi");
    expect(assessment.tpId).toBe(sampleTp.id);
    expect(assessment.classId).toBe(1);

    createdAssessmentId = assessment.id;
  });

  // 2. Pencatatan Bukti Belajar & Level Ketercapaian
  it("harus mencatat hasil observasi, bukti belajar konkret, dan tindak lanjut siswa", async () => {
    const student1 = sampleStudents[0];
    const student2 = sampleStudents[1];

    const results = await recordStudentResults(
      createdAssessmentId,
      [
        {
          studentId: student1.id,
          score: 55,
          masteryLevel: "perlu_bimbingan",
          learningEvidence: "Ragu-ragu saat membilang 8 kentang, tertukar antara angka 6 dan 9.",
          teacherNotes: "Perlu pendampingan tutor sebaya pada rotasi berikutnya.",
          followUpType: "remedial_terbimbing",
          followUpCompleted: false,
          assessmentDate: "2024-10-16",
        },
        {
          studentId: student2.id,
          score: 95,
          masteryLevel: "sangat_baik",
          learningEvidence: "Mampu mengelompokkan 15 wortel dengan cepat dan menjelaskan polanya.",
          teacherNotes: "Sangat mandiri dan siap menjadi tutor sebaya.",
          followUpType: "pengayaan_eksploratif",
          followUpCompleted: true,
          assessmentDate: "2024-10-16",
        },
      ],
      teacherUser.id,
      teacherUser.name
    );

    expect(results).toHaveLength(2);
    expect(results[0].masteryLevel).toBe("perlu_bimbingan");
    expect(results[0].learningEvidence).toContain("Ragu-ragu");
    expect(results[0].assessorName).toBe(teacherUser.name);

    expect(results[1].masteryLevel).toBe("sangat_baik");
    expect(results[1].followUpCompleted).toBe(true);
  });

  // 3. Pembaruan Nilai & Idempotensi Data
  it("harus memperbarui hasil penilaian siswa yang sudah ada tanpa menduplikasi baris", async () => {
    const student1 = sampleStudents[0];

    // Siswa 1 telah mengikuti remedial dan meningkat ke level 'cukup'
    const updated = await recordStudentResults(
      createdAssessmentId,
      [
        {
          studentId: student1.id,
          score: 75,
          masteryLevel: "cukup",
          learningEvidence: "Setelah remedial menggunakan kartu gambar, siswa mampu membilang 10 objek dengan benar.",
          followUpType: "remedial_terbimbing",
          followUpCompleted: true,
          assessmentDate: "2024-10-17",
        },
      ],
      teacherUser.id,
      teacherUser.name
    );

    expect(updated).toHaveLength(1);
    expect(updated[0].score).toBe(75);
    expect(updated[0].masteryLevel).toBe("cukup");
    expect(updated[0].followUpCompleted).toBe(true);

    // Pastikan di database hanya ada 1 baris untuk student1 pada assessment ini
    const countInDb = await db.query.studentAssessmentResults.findMany({
      where: and(
        eq(schema.studentAssessmentResults.assessmentId, createdAssessmentId),
        eq(schema.studentAssessmentResults.studentId, student1.id)
      ),
    });
    expect(countInDb).toHaveLength(1);
  });

  // 4. Logika Saran Tindak Lanjut Berbasis Bukti
  it("harus menghasilkan saran diferensiasi yang tepat berdasarkan bukti belajar", () => {
    const remedialAdvice = generateAiSuggestedFollowUp(
      "perlu_bimbingan",
      "Siswa masih bingung membedakan simbol operasi hitung",
      1,
      "Matematika"
    );
    expect(remedialAdvice.followUpType).toBe("remedial_terbimbing");
    expect(remedialAdvice.suggestionText.toLowerCase()).toContain("konkret");

    const enrichmentAdvice = generateAiSuggestedFollowUp(
      "sangat_baik",
      "Penyelesaian soal cerita sangat cepat dan akurat",
      2,
      "Matematika"
    );
    expect(enrichmentAdvice.followUpType).toBe("pengayaan_eksploratif");
    expect(enrichmentAdvice.suggestionText.toLowerCase()).toContain("tutor sebaya");
  });

  // 5. Invarian Pedagogis: Aturan Non-Numerik CP Fase
  it("harus memuat klausul resmi bahwa satu nilai numerik tidak boleh menjadi satu-satunya dasar penentu ketercapaian CP fase", async () => {
    const student1 = sampleStudents[0];
    const profile = await getStudentProgressProfile(student1.id);

    expect(profile.pedagogicalDisclaimer).toBeDefined();
    expect(profile.pedagogicalDisclaimer).toContain("tidak boleh disimpulkan hanya dari satu angka rata-rata");
  });

  // 6. Profil Perkembangan Individual Siswa & Antrean Remedial
  it("harus memuat profil individual siswa dengan rekapitulasi bukti belajar per TP", async () => {
    const student1 = sampleStudents[0];
    const profile = await getStudentProgressProfile(student1.id);

    expect(profile.student.id).toBe(student1.id);
    expect(profile.tpProgressItems.length).toBeGreaterThan(0);
    expect(profile.masterySummary.overallCompletionRate).toBeGreaterThanOrEqual(0);
  });

  // 7. Rekap Capaian per Tujuan Pembelajaran (TP)
  it("harus menghitung rekapitulasi ketercapaian kelas untuk satu TP", async () => {
    const tpRecap = await getTpAssessmentRecap(sampleTp.id);

    expect(tpRecap.tpId).toBe(sampleTp.id);
    expect(tpRecap.totalStudentsAssessed).toBeGreaterThan(0);
    expect(tpRecap.masteryRatePercentage).toBeGreaterThanOrEqual(0);
    expect(tpRecap.studentDetails.length).toBeGreaterThan(0);
    expect(tpRecap.pedagogicalRecommendation).toBeDefined();
  });

  // 8. Rekap Kelompok Multigrade
  it("harus menyajikan rekap ketercapaian lintas-kelas dalam satu kelompok multigrade", async () => {
    const groupRecap = await getMultigradeGroupRecap(sampleGroupA.id);

    expect(groupRecap.groupId).toBe(sampleGroupA.id);
    expect(groupRecap.grades).toEqual([1, 2]);
    expect(groupRecap.totalStudents).toBeGreaterThan(0);
    expect(groupRecap.subjectStats.length).toBeGreaterThan(0);
  });
});
