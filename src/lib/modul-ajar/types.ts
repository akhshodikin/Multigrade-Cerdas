import { z } from "zod";

export type TeachingPatternType =
  | "bersama"
  | "bimbingan_kelompok_1"
  | "mandiri_kelompok_2"
  | "bimbingan_kelompok_2"
  | "mandiri_kelompok_1"
  | "diferensiasi_kelas"
  | "berbagi_hasil"
  | "asesmen_refleksi";

export const TeachingStepSchema = z.object({
  stepNumber: z.number().int().min(1).max(20),
  stepName: z.string().min(1),
  durationMinutes: z.number().int().min(1),
  patternType: z.enum([
    "bersama",
    "bimbingan_kelompok_1",
    "mandiri_kelompok_2",
    "bimbingan_kelompok_2",
    "mandiri_kelompok_1",
    "diferensiasi_kelas",
    "berbagi_hasil",
    "asesmen_refleksi",
  ]),
  teacherRole: z.string().min(1),
  lowerGradeActivity: z.string().min(1),
  higherGradeActivity: z.string().min(1),
  classroomManagementNotes: z.string().default(""),
});

export type TeachingStep = z.infer<typeof TeachingStepSchema>;

export const LearningObjectiveItemSchema = z.object({
  grade: z.number().int().min(1).max(6),
  tpId: z.string().min(1),
  tpCode: z.string().min(1),
  competency: z.string().min(1),
  description: z.string().min(1),
});

export type LearningObjectiveItem = z.infer<typeof LearningObjectiveItemSchema>;

export const CurriculumReferencesSchema = z.object({
  cpId: z.string().optional(),
  cpCode: z.string().optional(),
  cpElement: z.string().optional(),
  atpPlanId: z.string().optional(),
  atpPlanTitle: z.string().optional(),
  materialMapId: z.string().optional(),
  tpIds: z.array(z.string()).default([]),
});

export type CurriculumReferences = z.infer<typeof CurriculumReferencesSchema>;

export const MediaAndResourcesSchema = z.object({
  media: z.array(z.string()).default([]),
  toolsAndMaterials: z.array(z.string()).default([]),
  learningSources: z.array(z.string()).default([]),
  localContextNotes: z.string().optional(),
});

export type MediaAndResources = z.infer<typeof MediaAndResourcesSchema>;

export const DifferentiationSchema = z.object({
  content: z.object({
    lowerGrade: z.string().default(""),
    higherGrade: z.string().default(""),
  }),
  process: z.object({
    lowerGrade: z.string().default(""),
    higherGrade: z.string().default(""),
  }),
  product: z.object({
    lowerGrade: z.string().default(""),
    higherGrade: z.string().default(""),
  }),
});

export type Differentiation = z.infer<typeof DifferentiationSchema>;

export const ObservationRubricItemSchema = z.object({
  criteria: z.string(),
  perluBimbingan: z.string(),
  cukup: z.string(),
  baik: z.string(),
  sangatBaik: z.string(),
});

export const AssessmentPlanSchema = z.object({
  diagnostic: z.object({
    technique: z.string().default("Tanya jawab pemantik lisan"),
    instrument: z.string().default("Daftar pertanyaan apersepsi pemantik"),
    questions: z.array(z.string()).default([]),
  }),
  formative: z.object({
    lowerGradeCriteria: z.string().default(""),
    higherGradeCriteria: z.string().default(""),
    observationRubric: z.array(ObservationRubricItemSchema).default([]),
  }),
  sumatif: z
    .object({
      technique: z.string(),
      testItems: z.string(),
    })
    .optional(),
});

export type AssessmentPlan = z.infer<typeof AssessmentPlanSchema>;

export const ReflectionsSchema = z.object({
  teacherReflectionGuide: z.array(z.string()).default([]),
  studentReflectionQuestions: z.array(z.string()).default([]),
});

export type Reflections = z.infer<typeof ReflectionsSchema>;

export const RemedialAndEnrichmentSchema = z.object({
  remedialPlan: z.string().default(""),
  enrichmentPlan: z.string().default(""),
  followUpAction: z.string().default(""),
});

export type RemedialAndEnrichment = z.infer<typeof RemedialAndEnrichmentSchema>;

export interface ModulAjarGenerationOptions {
  groupId: string; // "group-a" | "group-b" | "group-c"
  subjectId: string;
  academicYear?: string;
  semester?: "Ganjil" | "Genap";
  durationMinutes?: number; // e.g. 70
  allocatedHours?: number; // e.g. 2
  topic?: string;
  lowerGradeTpIds: string[];
  higherGradeTpIds: string[];
  teacherNotes?: string;
  baseAtpPlanId?: string;
  baseMaterialMapId?: string;
  aiProvider?: "gemini" | "mock_local" | "manual";
}

export interface CurriculumIntegrityReport {
  isConsistent: boolean;
  issues: string[];
  verifiedReferences: Array<{
    type: "cp" | "tp" | "atp" | "map";
    id: string;
    code: string;
    titleOrCompetency: string;
    status: "valid" | "changed" | "missing";
    details: string;
  }>;
}
