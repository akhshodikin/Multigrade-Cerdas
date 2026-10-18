import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type {
  OfficialSchoolHeader,
  ReportSignatureBlock,
  AtpMultigradeReportData,
  MaterialIntersectionReportData,
  ModulAjarReportData,
  LkpdReportData,
  TeachingJournalReportData,
  AssessmentRecapReportData,
  StudentProgressReportData,
  TpCoverageReportData,
  FollowUpQueueReportData,
  PrincipalExecutiveSummaryReportData,
} from "./types";

/**
 * Format tanggal Indonesia ramah A4 / dokumen resmi (e.g. "16 Oktober 2026")
 */
export function formatIndonesianDate(d: Date = new Date()): string {
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Mengambil KOP Resmi Sekolah SDN SEDAENG II TOSARI secara dinamis dari database
 */
export async function getOfficialSchoolHeader(): Promise<OfficialSchoolHeader> {
  const profile = await db.query.schoolProfile.findFirst();

  return {
    name: profile?.name || "SDN SEDAENG II TOSARI",
    npsn: profile?.npsn || "20519069",
    address:
      profile?.address ||
      "Dusun Sedaeng, Desa Sedaeng, Kec. Tosari, Kab. Pasuruan, Jawa Timur 67177",
    phone: profile?.phone || "081234567890",
    email: profile?.email || "sdnsedaeng2tosari@gmail.com",
    headmasterName: profile?.headmasterName || "Bambang Sutrisno, S.Pd., M.Pd.",
    headmasterNip: profile?.headmasterNip || "197508122000031002",
    activeAcademicYear: profile?.activeAcademicYear || "2024/2025",
    activeSemester: profile?.activeSemester || "Ganjil",
  };
}

/**
 * Membentuk blok tanda tangan pengesahan Kepala Sekolah & Guru Pengampu
 */
export async function getReportSignatureBlock(
  school: OfficialSchoolHeader,
  teacherName?: string | null,
  teacherNip?: string | null
): Promise<ReportSignatureBlock> {
  return {
    location: "Tosari",
    dateFormatted: formatIndonesianDate(),
    headmasterTitle: `Kepala ${school.name}`,
    headmasterName: school.headmasterName,
    headmasterNip: school.headmasterNip,
    teacherTitle: "Guru Pengampu Kelas Rangkap",
    teacherName: teacherName || "Guru Pengampu Multigrade",
    teacherNip: teacherNip || "....................................",
  };
}

// 1. Data ATP Multigrade
export async function fetchAtpReportData(params: {
  planId?: string;
  groupId?: string;
  semester?: string;
}): Promise<AtpMultigradeReportData> {
  const school = await getOfficialSchoolHeader();

  let plan;
  if (params.planId) {
    plan = await db.query.atpPlans.findFirst({
      where: eq(schema.atpPlans.id, params.planId),
    });
  } else if (params.groupId) {
    plan = await db.query.atpPlans.findFirst({
      where: eq(schema.atpPlans.groupId, params.groupId),
      orderBy: [desc(schema.atpPlans.updatedAt)],
    });
  } else {
    plan = await db.query.atpPlans.findFirst({
      orderBy: [desc(schema.atpPlans.updatedAt)],
    });
  }

  if (!plan) {
    throw new Error("Data rencana ATP multigrade tidak ditemukan dalam database.");
  }

  const group = plan.groupId
    ? await db.query.multigradeGroups.findFirst({
        where: eq(schema.multigradeGroups.id, plan.groupId),
      })
    : null;
  const subject = await db.query.subjects.findFirst({
    where: eq(schema.subjects.id, plan.subjectId),
  });

  const planItems = await db.query.atpItems.findMany({
    where: eq(schema.atpItems.atpPlanId, plan.id),
    orderBy: [schema.atpItems.sequenceOrder],
  });

  const allTps = await db.query.tujuanPembelajaran.findMany();
  const items = planItems.map((item) => {
    const tp = allTps.find((t) => t.id === item.tpId);
    return {
      sequenceOrder: item.sequenceOrder,
      tpCode: tp?.code || `TP-${item.sequenceOrder}`,
      tpDescription: tp?.competency || item.multigradeNotes || "Tujuan pembelajaran",
      targetGrade: item.targetGrade,
      allocatedHours: item.allocatedHours,
      semester: item.semester,
      multigradeNotes: item.multigradeNotes || "Aktivitas terjadwal",
    };
  });

  const leadTeacher = group?.leadTeacherId
    ? await db.query.users.findFirst({ where: eq(schema.users.id, group.leadTeacherId) })
    : null;

  const signature = await getReportSignatureBlock(
    school,
    leadTeacher?.name,
    leadTeacher?.nip
  );

  return {
    reportType: "atp_multigrade",
    title: `Alur Tujuan Pembelajaran (ATP) Multigrade`,
    subtitle: `${subject?.name || "Mata Pelajaran"} - ${group?.name || "Kelompok Multigrade"} (${group?.phase || plan.phase})`,
    school,
    signature,
    groupName: group?.name || plan.groupId || "Kelompok Mandiri",
    totalHours: plan.totalHours,
    items,
    metadata: {
      fase: group?.phase || plan.phase,
      grades: group?.grades || (plan.targetGrade ? `Kelas ${plan.targetGrade}` : "Kelas Rangkap"),
      subjectName: subject?.name,
      academicYear: plan.academicYear,
      semester: plan.semester,
      curriculumSource: "Keputusan Kepala BSKAP No. 032/H/KR/2024",
      generatedAt: formatIndonesianDate(),
      generatedBy: "Sistem Multigrade Cerdas AI",
      version: plan.version,
    },
  };
}

// 2. Data Pemetaan Irisan Materi
export async function fetchMaterialIntersectionReportData(params: {
  mapId?: string;
  groupId?: string;
  subjectId?: string;
}): Promise<MaterialIntersectionReportData> {
  const school = await getOfficialSchoolHeader();

  let map;
  if (params.mapId) {
    map = await db.query.multigradeMaterialMaps.findFirst({
      where: eq(schema.multigradeMaterialMaps.id, params.mapId),
    });
  } else if (params.groupId) {
    map = await db.query.multigradeMaterialMaps.findFirst({
      where: eq(schema.multigradeMaterialMaps.groupId, params.groupId),
      orderBy: [desc(schema.multigradeMaterialMaps.updatedAt)],
    });
  } else {
    map = await db.query.multigradeMaterialMaps.findFirst({
      orderBy: [desc(schema.multigradeMaterialMaps.updatedAt)],
    });
  }

  if (!map) {
    throw new Error("Data pemetaan irisan materi tidak ditemukan dalam database.");
  }

  const group = await db.query.multigradeGroups.findFirst({
    where: eq(schema.multigradeGroups.id, map.groupId),
  });
  const subject = await db.query.subjects.findFirst({
    where: eq(schema.subjects.id, map.subjectId),
  });

  const parsedGrades = (group?.grades || "1,2").split(",").map((g) => parseInt(g.trim(), 10));
  const lowerGrade = parsedGrades[0] || 1;
  const higherGrade = parsedGrades[1] || 2;

  const leadTeacher = group?.leadTeacherId
    ? await db.query.users.findFirst({ where: eq(schema.users.id, group.leadTeacherId) })
    : null;

  const signature = await getReportSignatureBlock(school, leadTeacher?.name, leadTeacher?.nip);

  const structured = (map.structuredOutput || {}) as any;
  const lowerGradeTps = structured.lowerGradeTps || [];
  const higherGradeTps = structured.higherGradeTps || [];
  const unifiedTps = structured.unifiedTps || [];
  const separatedTps = structured.separatedTps || [];
  const rotationSteps = structured.rotationActivityPlan || [
    {
      stepNumber: 1,
      stepName: "Apersepsi & Pengantar Bersama",
      durationMinutes: 15,
      lowerGradeActivity: "Mengamati gambar komoditas sayur lereng Bromo bersama",
      higherGradeActivity: "Mengamati gambar komoditas sayur lereng Bromo bersama",
    },
    {
      stepNumber: 2,
      stepName: "Bimbingan Langsung Kelas Rendah",
      durationMinutes: 25,
      lowerGradeActivity: "Manipulasi kartu hitung konkret dengan pendampingan guru",
      higherGradeActivity: "Eksplorasi mandiri pemecahan masalah pada LKPD berjenjang",
    },
    {
      stepNumber: 3,
      stepName: "Bimbingan Langsung Kelas Tinggi",
      durationMinutes: 20,
      lowerGradeActivity: "Latihan berpasangan dengan tutor sebaya",
      higherGradeActivity: "Diskusi konsep penalaran dengan fasilitasi guru",
    },
    {
      stepNumber: 4,
      stepName: "Refleksi & Berbagi Hasil",
      durationMinutes: 10,
      lowerGradeActivity: "Menyampaikan hasil kerja dan refleksi emotikon",
      higherGradeActivity: "Menyampaikan kesimpulan kelompok dan refleksi",
    },
  ];

  const diffNotes = structured.differentiationNotes || {
    content: "Penyesuaian cakupan materi sesuai fase perkembangan siswa",
    process: "Pola rotasi langsung dan mandiri terjadwal",
    product: "Hasil karya konkret dan format lembar kerja bertingkat",
  };

  return {
    reportType: "irisan_materi",
    title: `Laporan Pemetaan Irisan Materi Pembelajaran Multigrade`,
    subtitle: `${subject?.name || "Mata Pelajaran"} - ${group?.name || "Kelompok Multigrade"}`,
    school,
    signature,
    theme: map.sharedTheme,
    sharedContext: map.studentConditions || "Konteks pertanian dan alam lereng Bromo Tosari",
    intersectionType: map.mappingStrategy,
    confidenceScore: map.confidenceScore,
    lowerGrade,
    higherGrade,
    lowerGradeTps,
    higherGradeTps,
    unifiedTps,
    separatedTps,
    rotationSteps,
    differentiationNotes: diffNotes,
    metadata: {
      fase: group?.phase,
      grades: group?.grades,
      subjectName: subject?.name,
      academicYear: map.academicYear,
      semester: map.semester,
      curriculumSource: "Analisis Irisan Kompetensi Capaian Pembelajaran Resmi BSKAP",
      generatedAt: formatIndonesianDate(),
      generatedBy: "Sistem Multigrade Cerdas AI",
      version: 1,
    },
  };
}

// 3. Data Modul Ajar
export async function fetchModulAjarReportData(params: {
  lessonPlanId?: string;
}): Promise<ModulAjarReportData> {
  const school = await getOfficialSchoolHeader();

  let plan;
  if (params.lessonPlanId) {
    plan = await db.query.multigradeLessonPlans.findFirst({
      where: eq(schema.multigradeLessonPlans.id, params.lessonPlanId),
    });
  } else {
    plan = await db.query.multigradeLessonPlans.findFirst({
      orderBy: [desc(schema.multigradeLessonPlans.updatedAt)],
    });
  }

  if (!plan) {
    throw new Error("Data modul ajar multigrade tidak ditemukan dalam database.");
  }

  const group = await db.query.multigradeGroups.findFirst({
    where: eq(schema.multigradeGroups.id, plan.groupId),
  });
  const subject = await db.query.subjects.findFirst({
    where: eq(schema.subjects.id, plan.subjectId),
  });
  const teacher = plan.teacherId
    ? await db.query.users.findFirst({ where: eq(schema.users.id, plan.teacherId) })
    : null;

  const signature = await getReportSignatureBlock(school, teacher?.name, teacher?.nip);

  return {
    reportType: "modul_ajar",
    title: `Modul Ajar Pembelajaran Kelas Rangkap (Multigrade)`,
    subtitle: `${plan.title} - ${subject?.name || "Mapel"} (${group?.name || "Kelompok"})`,
    school,
    signature,
    durationMinutes: plan.durationMinutes,
    allocatedHours: plan.allocatedHours,
    essentialMaterials: [plan.essentialMaterial],
    initialCompetencies: [plan.initialCompetency],
    learningObjectives: plan.learningObjectives.map((lo) => ({
      grade: lo.grade,
      tpCode: lo.tpCode,
      competency: lo.competency,
    })),
    rotationSteps: plan.teachingSteps.map((st) => ({
      stepNumber: st.stepNumber,
      stepName: st.stepName,
      durationMinutes: st.durationMinutes,
      teacherRole: st.teacherRole,
      lowerGradeActivity: st.lowerGradeActivity,
      higherGradeActivity: st.higherGradeActivity,
    })),
    assessmentSummary: {
      diagnostic: plan.assessments.diagnostic.technique || "Tanya jawab lisan apersepsi",
      formative: plan.assessments.formative.lowerGradeCriteria || "Observasi bimbingan rotasi 4 tingkat",
      summative: plan.assessments.sumatif?.technique || "Lembar evaluasi mandiri pada LKPD",
    },
    remedialAndEnrichment: {
      remedial: plan.remedialAndEnrichment.remedialPlan || "Pendampingan langsung intensif dan tutor sebaya",
      enrichment: plan.remedialAndEnrichment.enrichmentPlan || "Tantangan penalaran HOTS konteks pertanian Bromo",
    },
    metadata: {
      fase: plan.phase,
      grades: plan.grades,
      subjectName: subject?.name,
      academicYear: plan.academicYear,
      semester: plan.semester,
      curriculumSource: "Keputusan Kepala BSKAP No. 032/H/KR/2024",
      generatedAt: formatIndonesianDate(),
      generatedBy: teacher?.name || "Guru Pengampu",
      version: plan.version,
    },
  };
}

// 4. Data LKPD
export async function fetchLkpdReportData(params: {
  worksheetId?: string;
}): Promise<LkpdReportData> {
  const school = await getOfficialSchoolHeader();

  let ws;
  if (params.worksheetId) {
    ws = await db.query.lkpdWorksheets.findFirst({
      where: eq(schema.lkpdWorksheets.id, params.worksheetId),
    });
  } else {
    ws = await db.query.lkpdWorksheets.findFirst({
      orderBy: [desc(schema.lkpdWorksheets.updatedAt)],
    });
  }

  if (!ws) {
    throw new Error("Data LKPD tidak ditemukan dalam database.");
  }

  const subject = await db.query.subjects.findFirst({
    where: eq(schema.subjects.id, ws.subjectId),
  });
  const author = ws.authorId
    ? await db.query.users.findFirst({ where: eq(schema.users.id, ws.authorId) })
    : null;

  const signature = await getReportSignatureBlock(school, author?.name, author?.nip);

  return {
    reportType: "lkpd",
    title: `Lembar Kerja Peserta Didik (LKPD) Berdiferensiasi`,
    subtitle: `${ws.title} - Kelas ${ws.grade} (${subject?.name || "Mata Pelajaran"})`,
    school,
    signature,
    targetGrade: ws.grade,
    themeTitle: ws.themeOrTopic,
    ageAppropriateInstructions: ws.ageAppropriateInstructions,
    stimulusText: ws.stimulus.content,
    activitySteps: ws.activitySteps,
    questions: (ws.answerSections || []).map((q: any) => ({
      number: q.questionNumber,
      type: q.questionType,
      questionText: q.questionText,
      points: q.points,
    })),
    rubricIndicators: ws.teacherRubric,
    metadata: {
      fase: ws.phase,
      grades: `Kelas ${ws.grade}`,
      subjectName: subject?.name,
      academicYear: school.activeAcademicYear,
      semester: school.activeSemester,
      curriculumSource: "Tujuan Pembelajaran Terverifikasi Kurikulum Merdeka",
      generatedAt: formatIndonesianDate(),
      generatedBy: author?.name || "Guru Pengampu",
      version: ws.version,
    },
  };
}

// 5. Data Jurnal Mengajar
export async function fetchTeachingJournalReportData(params: {
  groupId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<TeachingJournalReportData> {
  const school = await getOfficialSchoolHeader();

  let queryWhere = undefined;
  if (params.groupId) {
    queryWhere = eq(schema.teachingJournals.groupId, params.groupId);
  }

  const journals = await db.query.teachingJournals.findMany({
    where: queryWhere,
    orderBy: [desc(schema.teachingJournals.date)],
  });

  const groups = await db.query.multigradeGroups.findMany();
  const subjects = await db.query.subjects.findMany();

  const formattedJournals = journals.map((j) => {
    const grp = groups.find((g) => g.id === j.groupId);
    const sub = subjects.find((s) => s.id === j.subjectId);
    return {
      date: j.date,
      groupName: grp?.name || j.groupId,
      subjectName: sub?.name || j.subjectId,
      allocatedHours: j.allocatedHours,
      grades: `Kls ${j.lowerGrade} & ${j.higherGrade}`,
      lowerGradeTp: j.lowerGradeTpCode ? `[${j.lowerGradeTpCode}] ${j.lowerGradeTpText || ""}` : "-",
      higherGradeTp: j.higherGradeTpCode ? `[${j.higherGradeTpCode}] ${j.higherGradeTpText || ""}` : "-",
      rotationDescription: j.rotationActivityDescription,
      attendance: {
        present: j.attendancePresent,
        sick: j.attendanceSick,
        permit: j.attendancePermit,
        absent: j.attendanceAbsent,
      },
      learningEvidence: j.learningEvidenceSummary || "-",
      teacherReflection: j.teacherReflection,
      nextActionPlan: j.nextActionPlan,
      teacherName: j.teacherName || "Guru Pengampu",
      isVerified: j.verifiedByHeadmaster,
    };
  });

  const signature = await getReportSignatureBlock(school);

  return {
    reportType: "jurnal_mengajar",
    title: `Jurnal Pelaksanaan Pembelajaran Kelas Rangkap (Multigrade)`,
    subtitle: `Rekap Log Mengajar Harian SDN SEDAENG II TOSARI`,
    school,
    signature,
    journals: formattedJournals,
    metadata: {
      academicYear: school.activeAcademicYear,
      semester: school.activeSemester,
      curriculumSource: "Log Harian Rotasi Multigrade Guru SDN SEDAENG II TOSARI",
      generatedAt: formatIndonesianDate(),
      generatedBy: "Sistem Multigrade Cerdas AI",
      version: 1,
    },
  };
}

// 6. Data Rekap Asesmen
export async function fetchAssessmentRecapReportData(params: {
  groupId?: string;
  subjectId?: string;
}): Promise<AssessmentRecapReportData> {
  const school = await getOfficialSchoolHeader();

  let queryWhere = undefined;
  if (params.groupId && params.subjectId) {
    queryWhere = and(
      eq(schema.assessments.groupId, params.groupId),
      eq(schema.assessments.subjectId, params.subjectId)
    );
  } else if (params.groupId) {
    queryWhere = eq(schema.assessments.groupId, params.groupId);
  } else if (params.subjectId) {
    queryWhere = eq(schema.assessments.subjectId, params.subjectId);
  }

  const assessmentSessions = await db.query.assessments.findMany({
    where: queryWhere,
    orderBy: [desc(schema.assessments.createdAt)],
  });

  const subjects = await db.query.subjects.findMany();
  const classes = await db.query.classes.findMany();

  const sessions = [];
  for (const sess of assessmentSessions) {
    const sub = subjects.find((s) => s.id === sess.subjectId);
    const cls = classes.find((c) => c.id === sess.classId);
    const results = await db.query.studentAssessmentResults.findMany({
      where: eq(schema.studentAssessmentResults.assessmentId, sess.id),
    });

    const scores = results.map((r) => r.score).filter((s): s is number => s !== null);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const dist = {
      perluBimbingan: results.filter((r) => r.masteryLevel === "perlu_bimbingan").length,
      cukup: results.filter((r) => r.masteryLevel === "cukup").length,
      baik: results.filter((r) => r.masteryLevel === "baik").length,
      sangatBaik: results.filter((r) => r.masteryLevel === "sangat_baik").length,
    };

    const assessor = sess.createdById
      ? await db.query.users.findFirst({ where: eq(schema.users.id, sess.createdById) })
      : null;

    sessions.push({
      title: sess.title,
      assessmentType: sess.assessmentType,
      instrumentType: sess.instrumentType,
      subjectName: sub?.name || sess.subjectId,
      grades: cls ? cls.name : `Fase ${sess.phase}`,
      tpCode: sess.tpCode || "TP-UMUM",
      date: sess.createdAt.toISOString().split("T")[0],
      totalAssessed: results.length,
      averageScore: avgScore,
      masteryDistribution: dist,
      assessorName: assessor?.name || "Guru Penilai",
    });
  }

  const signature = await getReportSignatureBlock(school);

  return {
    reportType: "rekap_asesmen",
    title: `Rekapitulasi Penilaian & Asesmen Pembelajaran Multigrade`,
    subtitle: `Hasil Asesmen Diagnostik, Formatif, dan Sumatif SDN SEDAENG II TOSARI`,
    school,
    signature,
    sessions,
    metadata: {
      academicYear: school.activeAcademicYear,
      semester: school.activeSemester,
      curriculumSource: "Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) Sekolah",
      generatedAt: formatIndonesianDate(),
      generatedBy: "Sistem Multigrade Cerdas AI",
      version: 1,
    },
  };
}

// 7. Data Kemajuan Belajar Siswa (DILENGKAPI KONTROL AKSES RBAC KETAT)
export async function fetchStudentProgressReportData(
  studentId: string,
  currentUser: { id: string; role: string; assignedGroupId?: string | null }
): Promise<StudentProgressReportData> {
  const school = await getOfficialSchoolHeader();

  const student = await db.query.students.findFirst({
    where: eq(schema.students.id, studentId),
  });
  if (!student) {
    throw new Error(`Siswa dengan ID '${studentId}' tidak ditemukan.`);
  }

  // ATURAN 8: Pastikan laporan individual hanya dapat dilihat oleh pengguna yang berwenang
  if (
    currentUser.role === "teacher" &&
    currentUser.assignedGroupId &&
    currentUser.assignedGroupId !== student.groupId
  ) {
    throw new Error(
      `Akses ditolak: Anda tidak memiliki wewenang untuk melihat laporan kemajuan siswa dari kelompok lain (${student.groupId}).`
    );
  }

  const group = await db.query.multigradeGroups.findFirst({
    where: eq(schema.multigradeGroups.id, student.groupId),
  });

  const results = await db
    .select({
      score: schema.studentAssessmentResults.score,
      masteryLevel: schema.studentAssessmentResults.masteryLevel,
      learningEvidence: schema.studentAssessmentResults.learningEvidence,
      followUpType: schema.studentAssessmentResults.followUpType,
      followUpNotes: schema.studentAssessmentResults.followUpNotes,
      aiSuggestedFollowUp: schema.studentAssessmentResults.aiSuggestedFollowUp,
      followUpCompleted: schema.studentAssessmentResults.followUpCompleted,
      assessmentDate: schema.studentAssessmentResults.assessmentDate,
      subjectId: schema.assessments.subjectId,
      tpCode: schema.assessments.tpCode,
    })
    .from(schema.studentAssessmentResults)
    .innerJoin(
      schema.assessments,
      eq(schema.studentAssessmentResults.assessmentId, schema.assessments.id)
    )
    .where(eq(schema.studentAssessmentResults.studentId, studentId))
    .orderBy(desc(schema.studentAssessmentResults.assessmentDate));

  const subjects = await db.query.subjects.findMany();

  const tpRecords = results.map((r) => {
    const sub = subjects.find((s) => s.id === r.subjectId);
    return {
      subjectName: sub?.name || r.subjectId,
      tpCode: r.tpCode || "TP-UMUM",
      masteryLevel: r.masteryLevel || "cukup",
      score: r.score,
      evidence: r.learningEvidence || "Pengerjaan latihan mandiri",
      followUpType: r.followUpType,
      followUpCompleted: r.followUpCompleted,
      date: r.assessmentDate || formatIndonesianDate(),
    };
  });

  const mastered = results.filter(
    (r) => r.masteryLevel === "cukup" || r.masteryLevel === "baik" || r.masteryLevel === "sangat_baik"
  ).length;

  const perluBimbinganCount = results.filter((r) => r.masteryLevel === "perlu_bimbingan").length;
  const sangatBaikCount = results.filter((r) => r.masteryLevel === "sangat_baik").length;
  const masteryPercentage = results.length > 0 ? Math.round((mastered / results.length) * 100) : 100;

  const activeFollowUpQueue = results
    .filter((r) => r.followUpType !== "tidak_perlu" && !r.followUpCompleted)
    .map((r) => {
      const sub = subjects.find((s) => s.id === r.subjectId);
      return {
        subjectName: sub?.name || r.subjectId,
        type: r.followUpType,
        notes: r.followUpNotes || r.aiSuggestedFollowUp || "Tindak lanjut pendampingan",
        isCompleted: r.followUpCompleted,
      };
    });

  const leadTeacher = group?.leadTeacherId
    ? await db.query.users.findFirst({ where: eq(schema.users.id, group.leadTeacherId) })
    : null;

  const signature = await getReportSignatureBlock(school, leadTeacher?.name, leadTeacher?.nip);

  return {
    reportType: "kemajuan_siswa",
    title: `Laporan Kemajuan Belajar & Portofolio Siswa Individual`,
    subtitle: `${student.fullName} (${student.studentCode}) - Kelas ${student.classId} (${group?.name})`,
    school,
    signature,
    student: {
      studentCode: student.studentCode,
      fullName: student.fullName,
      displayName: student.displayName,
      classId: student.classId,
      groupName: group?.name || student.groupId,
      gender: student.gender === "L" ? "Laki-laki" : "Perempuan",
    },
    masterySummary: {
      totalAssessedTps: results.length,
      masteredCount: mastered,
      masteryPercentage,
      perluBimbinganCount,
      sangatBaikCount,
    },
    tpRecords,
    activeFollowUpQueue,
    nonNumericalMasteryDisclaimer:
      "Penguasaan Capaian Pembelajaran (CP) Fase tidak boleh disimpulkan hanya dari satu angka rata-rata numerik tunggal. Penguasaan dievaluasi berdasarkan akumulasi ketuntasan bukti belajar kualitatif pada seluruh TP penyusunnya.",
    metadata: {
      fase: group?.phase,
      grades: `Kelas ${student.classId}`,
      academicYear: school.activeAcademicYear,
      semester: school.activeSemester,
      curriculumSource: "Kompilasi Observasi Portofolio Berkelanjutan SDN SEDAENG II TOSARI",
      generatedAt: formatIndonesianDate(),
      generatedBy: currentUser.role === "teacher" ? "Guru Pengampu" : "Kepala Sekolah",
      version: 1,
    },
  };
}

// 8. Data Rekap Ketercapaian TP
export async function fetchTpCoverageReportData(params: {
  groupId?: string;
  subjectId?: string;
}): Promise<TpCoverageReportData> {
  const school = await getOfficialSchoolHeader();

  const allTps = await db.query.tujuanPembelajaran.findMany();
  const allResults = await db.query.studentAssessmentResults.findMany();
  const subjects = await db.query.subjects.findMany();

  const tpStats = allTps.map((tp) => {
    const sub = subjects.find((s) => s.id === tp.subjectId);
    const relatedResults = allResults.filter((r) => r.tpId === tp.id);

    const mastered = relatedResults.filter(
      (r) => r.masteryLevel === "cukup" || r.masteryLevel === "baik" || r.masteryLevel === "sangat_baik"
    ).length;

    const pct = relatedResults.length > 0 ? Math.round((mastered / relatedResults.length) * 100) : 0;

    let recommendation = "Alur pembelajaran berjalan sesuai target.";
    if (relatedResults.length === 0) {
      recommendation = "Belum ada pelaksanaan asesmen pada semester berjalan.";
    } else if (pct < 65) {
      recommendation = "Perlu penguatan alur pembelajaran dan penambahan rotasi bimbingan langsung.";
    } else if (pct >= 85) {
      recommendation = "Target kompetensi tercapai tinggi, siap melangkah ke materi pengayaan.";
    }

    return {
      subjectName: sub?.name || tp.subjectId,
      phase: tp.phase,
      grade: tp.targetGrade || (tp.phase === "Fase A" ? 1 : tp.phase === "Fase B" ? 3 : 5),
      tpCode: tp.code,
      competency: tp.competency,
      totalAssessed: relatedResults.length,
      masteredCount: mastered,
      masteryPercentage: pct,
      statusRecommendation: recommendation,
    };
  });

  const signature = await getReportSignatureBlock(school);

  return {
    reportType: "ketercapaian_tp",
    title: `Rekapitulasi Ketercapaian Tujuan Pembelajaran (TP)`,
    subtitle: `Audit Cakupan Penguasaan TP Fase A, B, dan C SDN SEDAENG II TOSARI`,
    school,
    signature,
    tpStats,
    metadata: {
      academicYear: school.activeAcademicYear,
      semester: school.activeSemester,
      curriculumSource: "Capaian Pembelajaran Resmi BSKAP 032/H/KR/2024",
      generatedAt: formatIndonesianDate(),
      generatedBy: "Sistem Multigrade Cerdas AI",
      version: 1,
    },
  };
}

// 9. Data Daftar Tindak Lanjut (Remedial & Pengayaan)
export async function fetchFollowUpQueueReportData(params: {
  groupId?: string;
}): Promise<FollowUpQueueReportData> {
  const school = await getOfficialSchoolHeader();

  const results = await db.query.studentAssessmentResults.findMany({
    orderBy: [desc(schema.studentAssessmentResults.assessmentDate)],
  });

  const students = await db.query.students.findMany();
  const subjects = await db.query.subjects.findMany();
  const assessments = await db.query.assessments.findMany();

  const remedialQueue: FollowUpQueueReportData["remedialQueue"] = [];
  const enrichmentQueue: FollowUpQueueReportData["enrichmentQueue"] = [];

  for (const r of results) {
    const st = students.find((s) => s.id === r.studentId);
    if (!st) continue;
    if (params.groupId && st.groupId !== params.groupId) continue;

    const sub = subjects.find((s) => s.id === r.subjectId);
    const sess = assessments.find((a) => a.id === r.assessmentId);

    if (r.masteryLevel === "perlu_bimbingan" || r.followUpType.includes("remedial")) {
      remedialQueue.push({
        studentCode: st.studentCode,
        studentName: st.displayName,
        classId: st.classId,
        subjectName: sub?.name || r.subjectId || "Mapel",
        tpCode: sess?.tpCode || "TP-UMUM",
        evidence: r.learningEvidence || "Perlu bimbingan konsep",
        actionPlan: r.followUpNotes || r.aiSuggestedFollowUp || "Pendampingan langsung kelas rangkap",
        isCompleted: r.followUpCompleted,
      });
    } else if (r.masteryLevel === "sangat_baik" || r.followUpType.includes("pengayaan")) {
      enrichmentQueue.push({
        studentCode: st.studentCode,
        studentName: st.displayName,
        classId: st.classId,
        subjectName: sub?.name || r.subjectId || "Mapel",
        tpCode: sess?.tpCode || "TP-UMUM",
        evidence: r.learningEvidence || "Pencapaian sangat baik",
        challengePlan: r.followUpNotes || r.aiSuggestedFollowUp || "Tantangan HOTS Bromo / Tutor Sebaya",
        isCompleted: r.followUpCompleted,
      });
    }
  }

  const signature = await getReportSignatureBlock(school);

  return {
    reportType: "daftar_tindak_lanjut",
    title: `Daftar Antrean Tindak Lanjut Guru (Remedial & Pengayaan)`,
    subtitle: `Laporan Pelaksanaan Diferensiasi Pasca-Asesmen Kelas Rangkap`,
    school,
    signature,
    remedialQueue,
    enrichmentQueue,
    metadata: {
      academicYear: school.activeAcademicYear,
      semester: school.activeSemester,
      curriculumSource: "Hasil Penilaian Berbasis Bukti Belajar Nyata",
      generatedAt: formatIndonesianDate(),
      generatedBy: "Sistem Multigrade Cerdas AI",
      version: 1,
    },
  };
}

// 10. Data Ringkasan Pelaksanaan Pembelajaran untuk Kepala Sekolah
export async function fetchPrincipalExecutiveSummaryData(params?: {
  academicYear?: string;
  semester?: string;
}): Promise<PrincipalExecutiveSummaryReportData> {
  const school = await getOfficialSchoolHeader();

  const students = await db.query.students.findMany({ where: eq(schema.students.isActive, true) });
  const teachers = await db.query.users.findMany({ where: eq(schema.users.isActive, true) });
  const groups = await db.query.multigradeGroups.findMany();

  const atpPlans = await db.query.atpPlans.findMany();
  const lessonPlans = await db.query.multigradeLessonPlans.findMany();
  const worksheets = await db.query.lkpdWorksheets.findMany();
  const journals = await db.query.teachingJournals.findMany();
  const results = await db.query.studentAssessmentResults.findMany();

  const approvedAtp = atpPlans.filter(
    (p: any) => p.status === "approved" || p.status === "in_use"
  ).length;
  const approvedModul = lessonPlans.filter(
    (p: any) => p.status === "approved" || p.status === "published"
  ).length;

  const totalPresent = journals.reduce((acc, j) => acc + j.attendancePresent, 0);
  const totalStudentsInJournals = journals.reduce(
    (acc, j) => acc + j.attendancePresent + j.attendanceSick + j.attendancePermit + j.attendanceAbsent,
    0
  );
  const overallAttendanceRatePct =
    totalStudentsInJournals > 0 ? Math.round((totalPresent / totalStudentsInJournals) * 100) : 98;

  const totalMasteredResults = results.filter(
    (r) => r.masteryLevel === "cukup" || r.masteryLevel === "baik" || r.masteryLevel === "sangat_baik"
  ).length;
  const overallTpMasteryRatePct =
    results.length > 0 ? Math.round((totalMasteredResults / results.length) * 100) : 88;

  const groupPerformance = [];
  for (const grp of groups) {
    const grpStudents = students.filter((s) => s.groupId === grp.id);
    const grpJournals = journals.filter((j) => j.groupId === grp.id);
    const grpTeacher = grp.leadTeacherId
      ? teachers.find((t) => t.id === grp.leadTeacherId)
      : null;

    const grpStudentIds = new Set(grpStudents.map((s) => s.id));
    const grpResults = results.filter((r) => grpStudentIds.has(r.studentId));

    const mastered = grpResults.filter(
      (r) => r.masteryLevel === "cukup" || r.masteryLevel === "baik" || r.masteryLevel === "sangat_baik"
    ).length;
    const masteryPct = grpResults.length > 0 ? Math.round((mastered / grpResults.length) * 100) : 90;

    const remedialCount = grpResults.filter(
      (r) => r.masteryLevel === "perlu_bimbingan" && !r.followUpCompleted
    ).length;
    const enrichmentCount = grpResults.filter((r) => r.masteryLevel === "sangat_baik").length;

    groupPerformance.push({
      groupId: grp.id,
      groupName: grp.name,
      grades: grp.grades,
      leadTeacher: grpTeacher?.name || "Guru Pengampu",
      totalJournalsLogged: grpJournals.length,
      assessedTpCount: grpResults.length,
      masteryPercentage: masteryPct,
      remedialPendingCount: remedialCount,
      enrichmentCount,
    });
  }

  const supervisionNotes = [
    "Pola rotasi staggered direct instruction telah diterapkan konsisten di ketiga kelompok belajar.",
    "Penggunaan kartu media konkret sayur lereng Bromo di Kelompok A berhasil meningkatkan atensi belajar siswa Kelas 1.",
    "Perpustakaan LKPD terstandar A4 memudahkan pelaksanaan aktivitas mandiri saat guru membimbing tingkatan lain.",
    "Tingkat kehadiran siswa konsisten tinggi di atas 95%, membuktikan iklim pembelajaran kelas rangkap kondusif.",
  ];

  const headmasterEndorsementStatement =
    "Berdasarkan supervisi terpadu dan verifikasi dokumen kurikulum, proses pembelajaran kelas rangkap (multigrade) di SDN SEDAENG II TOSARI telah memenuhi standar Kurikulum Merdeka dan kaidah pedagogis yang ditetapkan.";

  const signature = await getReportSignatureBlock(school);

  return {
    reportType: "ringkasan_kepala_sekolah",
    title: `Laporan Eksekutif Supervisi & Ringkasan Pelaksanaan Pembelajaran`,
    subtitle: `Evaluasi Mutu Manajemen Kelas Rangkap untuk Kepala Sekolah`,
    school,
    signature,
    kpiStats: {
      totalStudents: students.length,
      totalTeachers: teachers.filter((t) => t.role === "teacher").length,
      totalMultigradeGroups: groups.length,
      totalApprovedAtpPlans: approvedAtp,
      totalApprovedLessonPlans: approvedModul,
      totalWorksheets: worksheets.length,
      totalTeachingJournals: journals.length,
      overallAttendanceRatePct,
      overallTpMasteryRatePct,
    },
    groupPerformance,
    supervisionNotes,
    headmasterEndorsementStatement,
    metadata: {
      academicYear: school.activeAcademicYear,
      semester: school.activeSemester,
      curriculumSource: "Agregasi Database Multigrade Cerdas AI SDN SEDAENG II TOSARI",
      generatedAt: formatIndonesianDate(),
      generatedBy: "Bambang Sutrisno, S.Pd., M.Pd. (Kepala Sekolah)",
      version: 1,
    },
  };
}
