import { z } from "zod";

export const ReportTypeEnum = z.enum([
  "atp_multigrade",
  "irisan_materi",
  "modul_ajar",
  "lkpd",
  "jurnal_mengajar",
  "rekap_asesmen",
  "kemajuan_siswa",
  "ketercapaian_tp",
  "daftar_tindak_lanjut",
  "ringkasan_kepala_sekolah",
]);
export type ReportType = z.infer<typeof ReportTypeEnum>;

export const ExportFormatEnum = z.enum(["pdf", "docx", "xlsx", "print_html"]);
export type ExportFormat = z.infer<typeof ExportFormatEnum>;

export interface OfficialSchoolHeader {
  name: string;
  npsn: string;
  address: string;
  phone: string;
  email: string;
  headmasterName: string;
  headmasterNip: string;
  activeAcademicYear: string;
  activeSemester: string;
}

export interface ReportSignatureBlock {
  location: string; // e.g. "Tosari"
  dateFormatted: string; // e.g. "16 Oktober 2026"
  headmasterTitle: string; // "Kepala SDN Kandangan I Tosari"
  headmasterName: string;
  headmasterNip: string;
  teacherTitle: string; // "Guru Pengampu Kelas Rangkap"
  teacherName: string;
  teacherNip: string;
}

export interface BaseReportData {
  reportType: ReportType;
  title: string;
  subtitle: string;
  school: OfficialSchoolHeader;
  signature: ReportSignatureBlock;
  metadata: {
    fase?: string;
    grades?: string;
    subjectName?: string;
    academicYear: string;
    semester: string;
    curriculumSource?: string;
    generatedAt: string;
    generatedBy: string;
    version: number;
  };
}

// 1. ATP Multigrade Report Data
export interface AtpMultigradeReportData extends BaseReportData {
  reportType: "atp_multigrade";
  groupName: string;
  totalHours: number;
  items: Array<{
    sequenceOrder: number;
    tpCode: string;
    tpDescription: string;
    targetGrade: number;
    allocatedHours: number;
    semester: string;
    multigradeNotes: string;
  }>;
}

// 2. Irisan Materi Report Data
export interface MaterialIntersectionReportData extends BaseReportData {
  reportType: "irisan_materi";
  theme: string;
  sharedContext: string;
  intersectionType: string;
  confidenceScore: number;
  lowerGrade: number;
  higherGrade: number;
  lowerGradeTps: Array<{ code: string; text: string }>;
  higherGradeTps: Array<{ code: string; text: string }>;
  unifiedTps: string[];
  separatedTps: string[];
  rotationSteps: Array<{
    stepNumber: number;
    stepName: string;
    durationMinutes: number;
    lowerGradeActivity: string;
    higherGradeActivity: string;
  }>;
  differentiationNotes: {
    content: string;
    process: string;
    product: string;
  };
}

// 3. Modul Ajar Report Data
export interface ModulAjarReportData extends BaseReportData {
  reportType: "modul_ajar";
  durationMinutes: number;
  allocatedHours: number;
  essentialMaterials: string[];
  initialCompetencies: string[];
  learningObjectives: Array<{ grade: number; tpCode: string; competency: string }>;
  rotationSteps: Array<{
    stepNumber: number;
    stepName: string;
    durationMinutes: number;
    teacherRole: string;
    lowerGradeActivity: string;
    higherGradeActivity: string;
  }>;
  assessmentSummary: {
    diagnostic: string;
    formative: string;
    summative: string;
  };
  remedialAndEnrichment: {
    remedial: string;
    enrichment: string;
  };
}

// 4. LKPD Report Data
export interface LkpdReportData extends BaseReportData {
  reportType: "lkpd";
  targetGrade: number;
  themeTitle: string;
  ageAppropriateInstructions: string[];
  stimulusText: string;
  activitySteps: Array<{ stepNumber: number; instruction: string }>;
  questions: Array<{
    number: number;
    type: string;
    questionText: string;
    points: number;
  }>;
  rubricIndicators: Array<{
    indicator: string;
    perluBimbingan: string;
    cukup: string;
    baik: string;
    sangatBaik: string;
  }>;
}

// 5. Jurnal Mengajar Report Data
export interface TeachingJournalReportData extends BaseReportData {
  reportType: "jurnal_mengajar";
  journals: Array<{
    date: string;
    groupName: string;
    subjectName: string;
    allocatedHours: number;
    grades: string;
    lowerGradeTp: string;
    higherGradeTp: string;
    rotationDescription: string;
    attendance: { present: number; sick: number; permit: number; absent: number };
    learningEvidence: string;
    teacherReflection: string;
    nextActionPlan: string;
    teacherName: string;
    isVerified: boolean;
  }>;
}

// 6. Rekap Asesmen Report Data
export interface AssessmentRecapReportData extends BaseReportData {
  reportType: "rekap_asesmen";
  sessions: Array<{
    title: string;
    assessmentType: string;
    instrumentType: string;
    subjectName: string;
    grades: string;
    tpCode: string;
    date: string;
    totalAssessed: number;
    averageScore: number;
    masteryDistribution: {
      perluBimbingan: number;
      cukup: number;
      baik: number;
      sangatBaik: number;
    };
    assessorName: string;
  }>;
}

// 7. Kemajuan Belajar Siswa Report Data
export interface StudentProgressReportData extends BaseReportData {
  reportType: "kemajuan_siswa";
  student: {
    studentCode: string;
    fullName: string;
    displayName: string;
    classId: number;
    groupName: string;
    gender: string;
  };
  masterySummary: {
    totalAssessedTps: number;
    masteredCount: number;
    masteryPercentage: number;
    perluBimbinganCount: number;
    sangatBaikCount: number;
  };
  tpRecords: Array<{
    subjectName: string;
    tpCode: string;
    masteryLevel: string;
    score: number | null;
    evidence: string;
    followUpType: string;
    followUpCompleted: boolean;
    date: string;
  }>;
  activeFollowUpQueue: Array<{
    subjectName: string;
    type: string;
    notes: string;
    isCompleted: boolean;
  }>;
  nonNumericalMasteryDisclaimer: string;
}

// 8. Rekap Ketercapaian TP Report Data
export interface TpCoverageReportData extends BaseReportData {
  reportType: "ketercapaian_tp";
  tpStats: Array<{
    subjectName: string;
    phase: string;
    grade: number;
    tpCode: string;
    competency: string;
    totalAssessed: number;
    masteredCount: number;
    masteryPercentage: number;
    statusRecommendation: string;
  }>;
}

// 9. Daftar Tindak Lanjut Report Data
export interface FollowUpQueueReportData extends BaseReportData {
  reportType: "daftar_tindak_lanjut";
  remedialQueue: Array<{
    studentCode: string;
    studentName: string;
    classId: number;
    subjectName: string;
    tpCode: string;
    evidence: string;
    actionPlan: string;
    isCompleted: boolean;
  }>;
  enrichmentQueue: Array<{
    studentCode: string;
    studentName: string;
    classId: number;
    subjectName: string;
    tpCode: string;
    evidence: string;
    challengePlan: string;
    isCompleted: boolean;
  }>;
}

// 10. Ringkasan Pelaksanaan Pembelajaran untuk Kepala Sekolah Report Data
export interface PrincipalExecutiveSummaryReportData extends BaseReportData {
  reportType: "ringkasan_kepala_sekolah";
  kpiStats: {
    totalStudents: number;
    totalTeachers: number;
    totalMultigradeGroups: number;
    totalApprovedAtpPlans: number;
    totalApprovedLessonPlans: number;
    totalWorksheets: number;
    totalTeachingJournals: number;
    overallAttendanceRatePct: number;
    overallTpMasteryRatePct: number;
  };
  groupPerformance: Array<{
    groupId: string;
    groupName: string;
    grades: string;
    leadTeacher: string;
    totalJournalsLogged: number;
    assessedTpCount: number;
    masteryPercentage: number;
    remedialPendingCount: number;
    enrichmentCount: number;
  }>;
  supervisionNotes: string[];
  headmasterEndorsementStatement: string;
}

export type AnyReportData =
  | AtpMultigradeReportData
  | MaterialIntersectionReportData
  | ModulAjarReportData
  | LkpdReportData
  | TeachingJournalReportData
  | AssessmentRecapReportData
  | StudentProgressReportData
  | TpCoverageReportData
  | FollowUpQueueReportData
  | PrincipalExecutiveSummaryReportData;
