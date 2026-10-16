import { z } from "zod";

export const QuestionTypeEnum = z.enum([
  "multiple_choice",
  "short_answer",
  "essay",
  "matching",
  "drawing_area",
  "fill_blank",
]);
export type QuestionType = z.infer<typeof QuestionTypeEnum>;

export const LkpdStatusEnum = z.enum([
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
]);
export type LkpdStatus = z.infer<typeof LkpdStatusEnum>;

export const MediaTypeEnum = z.enum([
  "kartu_aktivitas",
  "kartu_gambar",
  "bacaan_bertingkat",
  "media_literasi_numerasi",
  "presentasi",
  "ilustrasi_pendukung",
]);
export type MediaType = z.infer<typeof MediaTypeEnum>;

export const ColorModeEnum = z.enum(["color", "grayscale", "bw_eco"]);
export type ColorMode = z.infer<typeof ColorModeEnum>;

// Schema Butir Soal & Ruang Jawaban
export const AnswerSectionItemSchema = z.object({
  id: z.string(),
  questionNumber: z.number(),
  questionType: QuestionTypeEnum,
  questionText: z.string().min(1, "Pertanyaan/instruksi tidak boleh kosong"),
  options: z.array(z.string()).optional(),
  matchingPairs: z
    .array(
      z.object({
        left: z.string(),
        right: z.string(),
      })
    )
    .optional(),
  helperHint: z.string().optional(),
  points: z.number().default(10),
});
export type AnswerSectionItem = z.infer<typeof AnswerSectionItemSchema>;

// Schema Refleksi Siswa
export const StudentReflectionSchema = z.object({
  emoticonOptions: z.array(
    z.object({
      mood: z.string(),
      label: z.string(),
      icon: z.string(),
    })
  ),
  promptQuestions: z.array(z.string()),
});
export type StudentReflection = z.infer<typeof StudentReflectionSchema>;

// Schema Rubrik Penilaian Guru
export const TeacherRubricItemSchema = z.object({
  indicator: z.string().min(1, "Indikator penilaian wajib diisi"),
  perluBimbingan: z.string(),
  cukup: z.string(),
  baik: z.string(),
  sangatBaik: z.string(),
  maxScore: z.number().default(100),
});
export type TeacherRubricItem = z.infer<typeof TeacherRubricItemSchema>;

// Schema Pengaturan Cetak
export const PrintSettingsSchema = z.object({
  colorMode: ColorModeEnum.default("color"),
  showSchoolHeader: z.boolean().default(true),
  paperSize: z.enum(["A4", "F4"]).default("A4"),
});
export type PrintSettings = z.infer<typeof PrintSettingsSchema>;

// Schema Stimulus / Materi Pengantar LKPD
export const StimulusSchema = z.object({
  type: z.enum(["story", "dialogue", "image", "data_table", "local_context"]),
  title: z.string(),
  content: z.string(),
  illustrationKey: z.string().optional(),
  illustrationCaption: z.string().optional(),
});
export type Stimulus = z.infer<typeof StimulusSchema>;

// Schema Lengkap LKPD Per Kelas
export const LkpdWorksheetSchema = z.object({
  id: z.string().uuid().optional(),
  lessonPlanId: z.string().uuid().nullable().optional(),
  title: z.string().min(3, "Judul LKPD minimal 3 karakter"),
  groupId: z.string(),
  classId: z.number().int().min(1).max(6),
  grade: z.number().int().min(1).max(6),
  subjectId: z.string(),
  phase: z.string(),
  academicYear: z.string().default("2024/2025"),
  semester: z.enum(["Ganjil", "Genap"]).default("Ganjil"),
  themeOrTopic: z.string(),
  targetTpId: z.string().nullable().optional(),
  targetTpCode: z.string(),
  targetTpDescription: z.string(),
  timeAllocationMinutes: z.number().default(35),
  ageAppropriateInstructions: z.array(z.string()),
  stimulus: StimulusSchema,
  activitySteps: z.array(
    z.object({
      stepNumber: z.number(),
      instruction: z.string(),
      guidanceNotes: z.string().optional(),
    })
  ),
  answerSections: z.array(AnswerSectionItemSchema),
  studentReflection: StudentReflectionSchema,
  teacherRubric: z.array(TeacherRubricItemSchema),
  printSettings: PrintSettingsSchema.default({
    colorMode: "color",
    showSchoolHeader: true,
    paperSize: "A4",
  }),
  status: LkpdStatusEnum.default("draft"),
  version: z.number().default(1),
  versionNotes: z.string().nullable().optional(),
  clonedFromId: z.string().uuid().nullable().optional(),
  authorId: z.string().uuid().nullable().optional(),
  approvedById: z.string().uuid().nullable().optional(),
  approvedAt: z.date().nullable().optional(),
  rejectionNotes: z.string().nullable().optional(),
  aiAssisted: z.boolean().default(true),
  aiProvider: z.string().default("gemini"),
  aiModel: z.string().default("gemini-3.8-flash"),
});
export type LkpdWorksheet = z.infer<typeof LkpdWorksheetSchema>;

// Kartu Aktivitas & Kartu Gambar
export interface KartuGambarItem {
  id: string;
  title: string;
  subtitle?: string;
  illustrationKey: string;
  category: string;
  prompt: string;
  challengeText?: string;
  wordGrade1?: string;
  sentenceGrade2?: string;
}

// Bahan Bacaan Bertingkat
export interface LeveledReadingPassage {
  grade: number;
  levelLabel: string;
  wordCount: number;
  title: string;
  textContent: string;
  vocabulary: Array<{ word: string; meaning: string }>;
  comprehensionQuestions: string[];
}

// Media Literasi dan Numerasi
export interface NumeracyScenario {
  scenarioTitle: string;
  contextStory: string;
  visualElements: Array<{ label: string; count: number; unit: string; iconKey: string }>;
  mathProblems: Array<{
    problemText: string;
    targetGrade: number;
    difficulty: "mudah" | "sedang" | "pengayaan";
    guidanceHint: string;
  }>;
}

// Presentasi Pembelajaran
export interface PresentationSlide {
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  teacherScript: string;
  visualLayout: "split" | "centered" | "grid";
  visualKeyword: string;
}

// Opsi Input Pembuatan LKPD Berdiferensiasi
export interface GenerateDifferentiatedLkpdOptions {
  lessonPlanId?: string;
  groupId: string;
  subjectId: string;
  themeOrTopic: string;
  academicYear?: string;
  semester?: "Ganjil" | "Genap";
  lowerGradeTpId: string;
  higherGradeTpId: string;
  timeAllocationMinutes?: number;
  preferredColorMode?: ColorMode;
  localTosariContext?: boolean;
}
