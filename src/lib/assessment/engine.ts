import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  CreateAssessmentSessionInput,
  StudentResultItemInput,
  StudentProgressProfile,
  TpAssessmentRecap,
  MultigradeGroupRecap,
  MasteryLevel,
  FollowUpType,
} from "./types";
import { generateAiSuggestedFollowUp } from "./recommendations";

export { generateAiSuggestedFollowUp };

/**
 * Membuat Sesi Asesmen Baru (Diagnostik, Formatif, Sumatif, atau Observasi)
 */
export async function createAssessmentSession(
  input: CreateAssessmentSessionInput,
  creatorId?: string
) {
  const subject = await db.query.subjects.findFirst({
    where: eq(schema.subjects.id, input.subjectId),
  });
  if (!subject) throw new Error(`Mata pelajaran '${input.subjectId}' tidak ditemukan.`);

  const targetClass = await db.query.classes.findFirst({
    where: eq(schema.classes.id, input.classId),
  });
  if (!targetClass) throw new Error(`Kelas ${input.classId} tidak ditemukan.`);

  // Ambil kode TP jika ada
  let tpCode = input.tpCode;
  if (input.tpId && !tpCode) {
    const tp = await db.query.tujuanPembelajaran.findFirst({
      where: eq(schema.tujuanPembelajaran.id, input.tpId),
    });
    if (tp) tpCode = tp.code;
  }

  const [assessment] = await db
    .insert(schema.assessments)
    .values({
      title: input.title,
      lessonPlanId: input.lessonPlanId,
      subjectId: input.subjectId,
      classId: input.classId,
      groupId: input.groupId || targetClass.groupId,
      phase: input.phase || targetClass.phase,
      assessmentType: input.assessmentType,
      tpId: input.tpId,
      tpCode,
      academicYear: input.academicYear,
      semester: input.semester,
      instrumentType: input.instrumentType,
      rubricSchema: input.rubricSchema,
      createdById: creatorId,
    })
    .returning();

  return assessment;
}

/**
 * Mencatat atau Memperbarui Hasil Asesmen Siswa (Beserta Bukti Belajar & Tindak Lanjut)
 */
export async function recordStudentResults(
  assessmentId: string,
  results: StudentResultItemInput[],
  assessorId?: string,
  assessorName?: string
) {
  const assessment = await db.query.assessments.findFirst({
    where: eq(schema.assessments.id, assessmentId),
  });
  if (!assessment) throw new Error("Sesi asesmen tidak ditemukan.");

  const subject = await db.query.subjects.findFirst({
    where: eq(schema.subjects.id, assessment.subjectId),
  });

  const savedResults: Array<typeof schema.studentAssessmentResults.$inferSelect> = [];

  for (const item of results) {
    const student = await db.query.students.findFirst({
      where: eq(schema.students.id, item.studentId),
    });
    if (!student) continue;

    // Generate saran tindak lanjut jika guru belum mengisi
    let followUpType = item.followUpType;
    let followUpNotes = item.followUpNotes;
    let aiSuggestedFollowUp = item.aiSuggestedFollowUp;

    if (!aiSuggestedFollowUp) {
      const aiRec = generateAiSuggestedFollowUp(
        item.masteryLevel,
        item.learningEvidence,
        student.classId,
        subject?.name || "Mata Pelajaran"
      );
      aiSuggestedFollowUp = aiRec.suggestionText;
      if (followUpType === "tidak_perlu" && aiRec.followUpType !== "tidak_perlu") {
        followUpType = aiRec.followUpType;
      }
      if (!followUpNotes) {
        followUpNotes = aiRec.suggestionText;
      }
    }

    // Cek apakah sudah pernah dinilai pada asesmen yang sama
    const existing = await db.query.studentAssessmentResults.findFirst({
      where: and(
        eq(schema.studentAssessmentResults.assessmentId, assessmentId),
        eq(schema.studentAssessmentResults.studentId, item.studentId)
      ),
    });

    if (existing) {
      const [updated] = await db
        .update(schema.studentAssessmentResults)
        .set({
          classId: student.classId,
          subjectId: assessment.subjectId,
          tpId: assessment.tpId,
          score: item.score,
          masteryLevel: item.masteryLevel,
          learningEvidence: item.learningEvidence,
          teacherNotes: item.teacherNotes,
          evidenceMediaUrl: item.evidenceMediaUrl,
          assessorId,
          assessorName: assessorName || existing.assessorName,
          followUpType,
          followUpNotes,
          aiSuggestedFollowUp,
          followUpCompleted: item.followUpCompleted ?? existing.followUpCompleted,
          assessmentDate: item.assessmentDate,
          updatedAt: new Date(),
        })
        .where(eq(schema.studentAssessmentResults.id, existing.id))
        .returning();

      savedResults.push(updated);
    } else {
      const [inserted] = await db
        .insert(schema.studentAssessmentResults)
        .values({
          assessmentId,
          studentId: item.studentId,
          classId: student.classId,
          subjectId: assessment.subjectId,
          tpId: assessment.tpId,
          score: item.score,
          masteryLevel: item.masteryLevel,
          learningEvidence: item.learningEvidence,
          teacherNotes: item.teacherNotes,
          evidenceMediaUrl: item.evidenceMediaUrl,
          assessorId,
          assessorName,
          followUpType,
          followUpNotes,
          aiSuggestedFollowUp,
          followUpCompleted: item.followUpCompleted ?? false,
          assessmentDate: item.assessmentDate,
        })
        .returning();

      savedResults.push(inserted);
    }
  }

  return savedResults;
}

/**
 * Mengambil Profil Kemajuan Belajar Individual Siswa
 */
export async function getStudentProgressProfile(
  studentId: string
): Promise<StudentProgressProfile> {
  const student = await db.query.students.findFirst({
    where: eq(schema.students.id, studentId),
  });
  if (!student) throw new Error("Siswa tidak ditemukan.");

  const school = await db.query.schoolProfile.findFirst();
  const academicYear = school?.activeAcademicYear || "2024/2025";
  const semester = school?.activeSemester || "Ganjil";

  // Ambil semua hasil asesmen siswa ini
  const rawResults = await db
    .select({
      resultId: schema.studentAssessmentResults.id,
      score: schema.studentAssessmentResults.score,
      masteryLevel: schema.studentAssessmentResults.masteryLevel,
      learningEvidence: schema.studentAssessmentResults.learningEvidence,
      followUpType: schema.studentAssessmentResults.followUpType,
      followUpNotes: schema.studentAssessmentResults.followUpNotes,
      aiSuggestedFollowUp: schema.studentAssessmentResults.aiSuggestedFollowUp,
      followUpCompleted: schema.studentAssessmentResults.followUpCompleted,
      assessmentDate: schema.studentAssessmentResults.assessmentDate,
      assessedAt: schema.studentAssessmentResults.assessedAt,
      assessmentId: schema.assessments.id,
      assessmentTitle: schema.assessments.title,
      assessmentType: schema.assessments.assessmentType,
      subjectId: schema.assessments.subjectId,
      subjectName: schema.subjects.name,
      tpId: schema.assessments.tpId,
      tpCode: schema.assessments.tpCode,
    })
    .from(schema.studentAssessmentResults)
    .innerJoin(schema.assessments, eq(schema.studentAssessmentResults.assessmentId, schema.assessments.id))
    .leftJoin(schema.subjects, eq(schema.assessments.subjectId, schema.subjects.id))
    .where(eq(schema.studentAssessmentResults.studentId, studentId))
    .orderBy(desc(schema.studentAssessmentResults.assessedAt));

  let perluBimbinganCount = 0;
  let cukupCount = 0;
  let baikCount = 0;
  let sangatBaikCount = 0;

  const remedialQueue: StudentProgressProfile["remedialQueue"] = [];
  const enrichmentOpportunities: StudentProgressProfile["enrichmentOpportunities"] = [];

  // Peta progres per TP
  const tpMap = new Map<string, StudentProgressProfile["tpProgressItems"][0]>();

  for (const r of rawResults) {
    const level = (r.masteryLevel || "cukup") as MasteryLevel;

    if (level === "perlu_bimbingan") perluBimbinganCount++;
    else if (level === "cukup") cukupCount++;
    else if (level === "baik") baikCount++;
    else if (level === "sangat_baik") sangatBaikCount++;

    const isMastered = level === "cukup" || level === "baik" || level === "sangat_baik";
    const tpKey = r.tpId || r.tpCode || r.assessmentTitle;

    if (!tpMap.has(tpKey)) {
      tpMap.set(tpKey, {
        tpId: r.tpId || "",
        tpCode: r.tpCode || "TP-UMUM",
        competency: r.assessmentTitle,
        contentScope: r.subjectName || r.subjectId,
        subjectId: r.subjectId,
        subjectName: r.subjectName || r.subjectId,
        latestMasteryLevel: level,
        latestScore: r.score,
        latestEvidence: r.learningEvidence || "Pengamatan aktivitas pembelajaran",
        latestAssessmentDate: r.assessmentDate || r.assessedAt.toISOString().split("T")[0],
        assessmentType: r.assessmentType as any,
        followUpType: r.followUpType as FollowUpType,
        followUpCompleted: r.followUpCompleted,
        isMastered,
      });

      if (level === "perlu_bimbingan" && !r.followUpCompleted) {
        remedialQueue.push({
          tpCode: r.tpCode || "TP-UMUM",
          subjectName: r.subjectName || r.subjectId,
          evidence: r.learningEvidence || "Perlu bimbingan lebih lanjut",
          recommendedStrategy: r.followUpNotes || r.aiSuggestedFollowUp || "Pendampingan tutor sebaya",
        });
      } else if (level === "sangat_baik") {
        enrichmentOpportunities.push({
          tpCode: r.tpCode || "TP-UMUM",
          subjectName: r.subjectName || r.subjectId,
          evidence: r.learningEvidence || "Pencapaian sangat memuaskan",
          challengeSuggestion: r.aiSuggestedFollowUp || "Tantangan studi kasus kontekstual Tosari",
        });
      }
    }
  }

  const totalAssessed = rawResults.length;
  const masteredCount = cukupCount + baikCount + sangatBaikCount;
  const overallCompletionRate = totalAssessed > 0 ? Math.round((masteredCount / totalAssessed) * 100) : 0;

  return {
    student: {
      id: student.id,
      studentCode: student.studentCode,
      displayName: student.displayName,
      fullName: student.fullName,
      classId: student.classId,
      groupId: student.groupId,
      gender: student.gender,
      notes: student.notes,
    },
    academicYear,
    semester,
    totalAssessmentsRecorded: totalAssessed,
    masterySummary: {
      perluBimbinganCount,
      cukupCount,
      baikCount,
      sangatBaikCount,
      overallCompletionRate,
    },
    tpProgressItems: Array.from(tpMap.values()),
    remedialQueue,
    enrichmentOpportunities,
    pedagogicalDisclaimer:
      "Penguasaan Capaian Pembelajaran (CP) Fase tidak boleh disimpulkan hanya dari satu angka rata-rata, melainkan berdasarkan akumulasi bukti belajar kualitatif per TP yang dipelajari.",
  };
}

/**
 * Rekap Capaian Seluruh Siswa untuk Satu Tujuan Pembelajaran (TP)
 */
export async function getTpAssessmentRecap(tpId: string): Promise<TpAssessmentRecap> {
  const tp = await db
    .select({
      id: schema.tujuanPembelajaran.id,
      code: schema.tujuanPembelajaran.code,
      competency: schema.tujuanPembelajaran.competency,
      contentScope: schema.tujuanPembelajaran.contentScope,
      phase: schema.tujuanPembelajaran.phase,
      targetGrade: schema.tujuanPembelajaran.targetGrade,
      subjectId: schema.tujuanPembelajaran.subjectId,
      subjectName: schema.subjects.name,
    })
    .from(schema.tujuanPembelajaran)
    .leftJoin(schema.subjects, eq(schema.tujuanPembelajaran.subjectId, schema.subjects.id))
    .where(eq(schema.tujuanPembelajaran.id, tpId))
    .then((res) => res[0]);

  if (!tp) throw new Error("Tujuan Pembelajaran tidak ditemukan.");

  // Ambil semua hasil asesmen yang terhubung dengan TP ini
  const results = await db
    .select({
      resultId: schema.studentAssessmentResults.id,
      studentId: schema.studentAssessmentResults.studentId,
      studentCode: schema.students.studentCode,
      displayName: schema.students.displayName,
      classId: schema.students.classId,
      score: schema.studentAssessmentResults.score,
      masteryLevel: schema.studentAssessmentResults.masteryLevel,
      learningEvidence: schema.studentAssessmentResults.learningEvidence,
      followUpType: schema.studentAssessmentResults.followUpType,
      followUpCompleted: schema.studentAssessmentResults.followUpCompleted,
      assessedAt: schema.studentAssessmentResults.assessedAt,
      assessorName: schema.studentAssessmentResults.assessorName,
    })
    .from(schema.studentAssessmentResults)
    .innerJoin(schema.assessments, eq(schema.studentAssessmentResults.assessmentId, schema.assessments.id))
    .innerJoin(schema.students, eq(schema.studentAssessmentResults.studentId, schema.students.id))
    .where(eq(schema.assessments.tpId, tpId))
    .orderBy(schema.students.studentCode);

  const levelCounts = {
    perluBimbingan: 0,
    cukup: 0,
    baik: 0,
    sangatBaik: 0,
  };

  const studentDetails = results.map((r) => {
    const level = (r.masteryLevel || "cukup") as MasteryLevel;
    if (level === "perlu_bimbingan") levelCounts.perluBimbingan++;
    else if (level === "cukup") levelCounts.cukup++;
    else if (level === "baik") levelCounts.baik++;
    else if (level === "sangat_baik") levelCounts.sangatBaik++;

    return {
      studentId: r.studentId,
      studentCode: r.studentCode,
      displayName: r.displayName,
      classId: r.classId,
      score: r.score,
      masteryLevel: level,
      learningEvidence: r.learningEvidence || "-",
      followUpType: r.followUpType as FollowUpType,
      followUpCompleted: r.followUpCompleted,
      assessedAt: r.assessedAt.toISOString().split("T")[0],
      assessorName: r.assessorName,
    };
  });

  const total = results.length;
  const tuntas = levelCounts.cukup + levelCounts.baik + levelCounts.sangatBaik;
  const masteryRatePercentage = total > 0 ? Math.round((tuntas / total) * 100) : 0;

  let recommendation = `Tingkat ketuntasan kelas mencapai ${masteryRatePercentage}%. `;
  if (levelCounts.perluBimbingan > 0) {
    recommendation += `Terdapat ${levelCounts.perluBimbingan} siswa yang memerlukan intervensi remedial kelompok kecil sebelum asesmen sumatif.`;
  } else {
    recommendation += `Seluruh siswa yang dinilai telah menguasai indikator TP ini dengan memuaskan.`;
  }

  return {
    tpId: tp.id,
    tpCode: tp.code,
    competency: tp.competency,
    contentScope: tp.contentScope,
    subjectId: tp.subjectId,
    subjectName: tp.subjectName || tp.subjectId,
    targetGrade: tp.targetGrade,
    phase: tp.phase,
    totalStudentsAssessed: total,
    levelCounts,
    masteryRatePercentage,
    studentDetails,
    pedagogicalRecommendation: recommendation,
  };
}

/**
 * Rekap Capaian & Tindak Lanjut untuk Kelompok Multigrade (Kelompok A, B, atau C)
 */
export async function getMultigradeGroupRecap(
  groupId: string
): Promise<MultigradeGroupRecap> {
  const group = await db.query.multigradeGroups.findFirst({
    where: eq(schema.multigradeGroups.id, groupId),
  });
  if (!group) throw new Error("Kelompok belajar tidak ditemukan.");

  const grades = group.grades.split(",").map((g) => parseInt(g.trim(), 10));

  // Ambil seluruh siswa dalam kelompok ini
  const groupStudents = await db.query.students.findMany({
    where: eq(schema.students.groupId, groupId),
  });

  // Ambil mapel relevan
  const allSubjects = await db.query.subjects.findMany();

  // Ambil seluruh hasil asesmen untuk kelompok ini
  const groupAssessments = await db.query.assessments.findMany({
    where: eq(schema.assessments.groupId, groupId),
  });
  const assessmentIds = groupAssessments.map((a) => a.id);

  let allResults: any[] = [];
  if (assessmentIds.length > 0) {
    allResults = await db
      .select({
        resultId: schema.studentAssessmentResults.id,
        studentId: schema.studentAssessmentResults.studentId,
        score: schema.studentAssessmentResults.score,
        masteryLevel: schema.studentAssessmentResults.masteryLevel,
        learningEvidence: schema.studentAssessmentResults.learningEvidence,
        followUpType: schema.studentAssessmentResults.followUpType,
        followUpNotes: schema.studentAssessmentResults.followUpNotes,
        aiSuggestedFollowUp: schema.studentAssessmentResults.aiSuggestedFollowUp,
        followUpCompleted: schema.studentAssessmentResults.followUpCompleted,
        subjectId: schema.assessments.subjectId,
        tpCode: schema.assessments.tpCode,
        classId: schema.assessments.classId,
      })
      .from(schema.studentAssessmentResults)
      .innerJoin(schema.assessments, eq(schema.studentAssessmentResults.assessmentId, schema.assessments.id))
      .where(inArray(schema.studentAssessmentResults.assessmentId, assessmentIds));
  }

  // Ringkasan per mapel
  const subjectStats = allSubjects.map((sub) => {
    const subResults = allResults.filter((r) => r.subjectId === sub.id);
    const uniqueTps = new Set(subResults.map((r) => r.tpCode).filter(Boolean));
    const tuntas = subResults.filter(
      (r) => r.masteryLevel === "cukup" || r.masteryLevel === "baik" || r.masteryLevel === "sangat_baik"
    ).length;
    const pct = subResults.length > 0 ? Math.round((tuntas / subResults.length) * 100) : 100;

    return {
      subjectId: sub.id,
      subjectName: sub.name,
      totalAssessments: subResults.length,
      assessedTpCount: uniqueTps.size,
      masteryPercentage: pct,
    };
  });

  // Antrean Remedial & Pengayaan
  const activeRemedialStudents: MultigradeGroupRecap["activeRemedialStudents"] = [];
  const activeEnrichmentStudents: MultigradeGroupRecap["activeEnrichmentStudents"] = [];

  for (const r of allResults) {
    const st = groupStudents.find((s) => s.id === r.studentId);
    if (!st) continue;
    const sub = allSubjects.find((s) => s.id === r.subjectId);

    if (r.masteryLevel === "perlu_bimbingan" && !r.followUpCompleted) {
      activeRemedialStudents.push({
        studentCode: st.studentCode,
        displayName: st.displayName,
        classId: st.classId,
        subjectName: sub?.name || r.subjectId,
        tpCode: r.tpCode || "TP-UMUM",
        evidence: r.learningEvidence || "Memerlukan penguatan",
        actionPlan: r.followUpNotes || r.aiSuggestedFollowUp || "Pendampingan khusus kelas rangkap",
      });
    } else if (r.masteryLevel === "sangat_baik") {
      activeEnrichmentStudents.push({
        studentCode: st.studentCode,
        displayName: st.displayName,
        classId: st.classId,
        subjectName: sub?.name || r.subjectId,
        tpCode: r.tpCode || "TP-UMUM",
        achievement: r.learningEvidence || "Pencapaian sempurna",
        challengePlan: r.aiSuggestedFollowUp || "Tugas eksploratif kontekstual",
      });
    }
  }

  return {
    groupId,
    groupName: group.name,
    phase: group.phase,
    grades,
    totalStudents: groupStudents.length,
    subjectStats,
    activeRemedialStudents,
    activeEnrichmentStudents,
  };
}
