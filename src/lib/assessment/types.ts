import { z } from "zod";

export const AssessmentTypeEnum = z.enum(["diagnostik", "formatif", "sumatif", "observasi"]);
export type AssessmentType = z.infer<typeof AssessmentTypeEnum>;

export const MasteryLevelEnum = z.enum(["perlu_bimbingan", "cukup", "baik", "sangat_baik"]);
export type MasteryLevel = z.infer<typeof MasteryLevelEnum>;

export const InstrumentTypeEnum = z.enum([
  "rubrik_observasi",
  "lkpd",
  "tes_tertulis",
  "unjuk_kerja",
  "tes_lisan",
  "portofolio",
]);
export type InstrumentType = z.infer<typeof InstrumentTypeEnum>;

export const FollowUpTypeEnum = z.enum([
  "tidak_perlu",
  "remedial_terbimbing",
  "remedial_tutor_sebaya",
  "pengayaan_mandiri",
  "pengayaan_eksploratif",
]);
export type FollowUpType = z.infer<typeof FollowUpTypeEnum>;

// Schema Rubrik Kriteria Asesmen
export const RubricCriterionSchema = z.object({
  criteria: z.string().min(1, "Kriteria penilaian wajib diisi"),
  perluBimbingan: z.string(),
  cukup: z.string(),
  baik: z.string(),
  sangatBaik: z.string(),
  maxScore: z.number().default(100),
});
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;

// Input Pembuatan Sesi Asesmen
export const CreateAssessmentSessionSchema = z.object({
  title: z.string().min(3, "Judul asesmen minimal 3 karakter"),
  lessonPlanId: z.string().uuid().optional().nullable(),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih"),
  classId: z.number().int().min(1).max(6),
  groupId: z.string().optional().nullable(),
  assessmentType: AssessmentTypeEnum,
  tpId: z.string().uuid().optional().nullable(),
  tpCode: z.string().optional().nullable(),
  phase: z.string().optional().nullable(),
  academicYear: z.string().default("2024/2025"),
  semester: z.enum(["Ganjil", "Genap"]).default("Ganjil"),
  instrumentType: InstrumentTypeEnum.default("rubrik_observasi"),
  rubricSchema: z.array(RubricCriterionSchema).default([]),
});
export type CreateAssessmentSessionInput = z.infer<typeof CreateAssessmentSessionSchema>;

// Input Penilaian Individual Siswa
export const StudentResultItemInputSchema = z.object({
  studentId: z.string().uuid(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  masteryLevel: MasteryLevelEnum,
  learningEvidence: z.string().min(1, "Catatan bukti belajar konkret wajib diisi"),
  teacherNotes: z.string().optional().nullable(),
  evidenceMediaUrl: z.string().optional().nullable(),
  followUpType: FollowUpTypeEnum.default("tidak_perlu"),
  followUpNotes: z.string().optional().nullable(),
  aiSuggestedFollowUp: z.string().optional().nullable(),
  followUpCompleted: z.boolean().default(false),
  assessmentDate: z.string().default(() => new Date().toISOString().split("T")[0]),
});
export type StudentResultItemInput = z.infer<typeof StudentResultItemInputSchema>;

// Batch Input Hasil Asesmen untuk Satu Kelas / Kelompok
export const BatchRecordAssessmentResultsSchema = z.object({
  assessmentId: z.string().uuid(),
  results: z.array(StudentResultItemInputSchema),
});
export type BatchRecordAssessmentResultsInput = z.infer<typeof BatchRecordAssessmentResultsSchema>;

// Struktur Profil Perkembangan Individual Siswa
export interface StudentProgressProfile {
  student: {
    id: string;
    studentCode: string;
    displayName: string;
    fullName: string;
    classId: number;
    groupId: string;
    gender: string;
    notes?: string | null;
  };
  academicYear: string;
  semester: string;
  totalAssessmentsRecorded: number;
  masterySummary: {
    perluBimbinganCount: number;
    cukupCount: number;
    baikCount: number;
    sangatBaikCount: number;
    overallCompletionRate: number; // Persentase TP yang telah tuntas (level cukup, baik, atau sangat baik)
  };
  tpProgressItems: Array<{
    tpId: string;
    tpCode: string;
    competency: string;
    contentScope: string;
    subjectId: string;
    subjectName: string;
    latestMasteryLevel: MasteryLevel;
    latestScore?: number | null;
    latestEvidence: string;
    latestAssessmentDate: string;
    assessmentType: AssessmentType;
    followUpType: FollowUpType;
    followUpCompleted: boolean;
    isMastered: boolean;
  }>;
  remedialQueue: Array<{
    tpCode: string;
    subjectName: string;
    evidence: string;
    recommendedStrategy: string;
  }>;
  enrichmentOpportunities: Array<{
    tpCode: string;
    subjectName: string;
    evidence: string;
    challengeSuggestion: string;
  }>;
  pedagogicalDisclaimer: string;
}

// Rekap Capaian per TP
export interface TpAssessmentRecap {
  tpId: string;
  tpCode: string;
  competency: string;
  contentScope: string;
  subjectId: string;
  subjectName: string;
  targetGrade?: number | null;
  phase: string;
  totalStudentsAssessed: number;
  levelCounts: {
    perluBimbingan: number;
    cukup: number;
    baik: number;
    sangatBaik: number;
  };
  masteryRatePercentage: number;
  studentDetails: Array<{
    studentId: string;
    studentCode: string;
    displayName: string;
    classId: number;
    score?: number | null;
    masteryLevel: MasteryLevel;
    learningEvidence: string;
    followUpType: FollowUpType;
    followUpCompleted: boolean;
    assessedAt: string;
    assessorName?: string | null;
  }>;
  pedagogicalRecommendation: string;
}

// Rekap Kelompok Multigrade
export interface MultigradeGroupRecap {
  groupId: string;
  groupName: string;
  phase: string;
  grades: number[];
  totalStudents: number;
  subjectStats: Array<{
    subjectId: string;
    subjectName: string;
    totalAssessments: number;
    assessedTpCount: number;
    masteryPercentage: number;
  }>;
  activeRemedialStudents: Array<{
    studentCode: string;
    displayName: string;
    classId: number;
    subjectName: string;
    tpCode: string;
    evidence: string;
    actionPlan: string;
  }>;
  activeEnrichmentStudents: Array<{
    studentCode: string;
    displayName: string;
    classId: number;
    subjectName: string;
    tpCode: string;
    achievement: string;
    challengePlan: string;
  }>;
}
