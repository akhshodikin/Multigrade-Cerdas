import { z } from "zod";

export const SourceTpSchema = z.object({
  id: z.string(),
  code: z.string(),
  competency: z.string(),
  contentScope: z.string(),
  description: z.string(),
  targetGrade: z.number(),
  cpId: z.string().optional(),
  cpElement: z.string().optional(),
});

export type SourceTpInput = z.infer<typeof SourceTpSchema>;

export const IntersectionMappingRequestSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  phase: z.string(),
  classes: z.array(z.number()),
  subjectId: z.string(),
  subjectName: z.string(),
  academicYear: z.string(),
  semester: z.enum(["Ganjil", "Genap"]),
  durationMinutes: z.number().min(30).max(240).default(70),
  studentContext: z.string().optional(), // Non-PII contextual info
  sourceTpsLowerGrade: z.array(SourceTpSchema),
  sourceTpsHigherGrade: z.array(SourceTpSchema),
  prerequisites: z.array(
    z.object({
      tpId: z.string(),
      prerequisiteTpId: z.string(),
      type: z.string(),
    })
  ).default([]),
});

export type IntersectionMappingRequest = z.infer<typeof IntersectionMappingRequestSchema>;

export const SideBySideComparisonSchema = z.object({
  lowerGradeTp: z.object({
    id: z.string(),
    code: z.string(),
    grade: z.number(),
    competency: z.string(),
    description: z.string(),
  }),
  higherGradeTp: z.object({
    id: z.string(),
    code: z.string(),
    grade: z.number(),
    competency: z.string(),
    description: z.string(),
  }),
  relationship: z.enum(["irisan_kuat", "irisan_lemah", "tidak_beririsan"]),
  relationshipNote: z.string(),
});

export const MergedTpItemSchema = z.object({
  title: z.string(),
  lowerGradeTpId: z.string(),
  higherGradeTpId: z.string(),
  sharedCoreConcept: z.string(),
  rationale: z.string(),
});

export const SeparateTpItemSchema = z.object({
  tpId: z.string(),
  grade: z.number(),
  reasonForSeparation: z.string(),
  suggestedSoloActivity: z.string(),
});

export const PrerequisitesAnalysisItemSchema = z.object({
  tpId: z.string(),
  prerequisiteTpId: z.string(),
  status: z.enum(["terpenuhi", "perlu_penguatan_awal"]),
  notes: z.string(),
});

export const RecommendedActivitiesSchema = z.object({
  sharedOpeningActivity: z.string(),
  lowerGradeActivity: z.string(),
  higherGradeActivity: z.string(),
  sharedClosingActivity: z.string(),
});

export const DifferentiatedOutcomesSchema = z.object({
  lowerGrade: z.object({
    content: z.string(),
    process: z.string(),
    product: z.string(),
  }),
  higherGrade: z.object({
    content: z.string(),
    process: z.string(),
    product: z.string(),
  }),
});

export const AssessmentRecommendationsSchema = z.object({
  lowerGradeAssessment: z.string(),
  higherGradeAssessment: z.string(),
  sharedObservationCriteria: z.array(z.string()),
});

export const MappingBasisSchema = z.object({
  pedagogicalNotes: z.string(),
  referencedTpIds: z.array(z.string()),
  referencedCpElements: z.array(z.string()),
});

export const ConfidenceSchema = z.object({
  level: z.enum(["tinggi", "sedang", "rendah"]),
  score: z.number().min(0).max(100),
  disclaimer: z.string(),
});

export const IntersectionMappingResultSchema = z.object({
  sharedTheme: z.string(),
  mappingStrategy: z.enum(["terpadu_sebagian", "terpisah_paralel", "terpadu_penuh"]),
  strategyRationale: z.string(),
  sourceTpsSideBySide: z.array(SideBySideComparisonSchema),
  mergedTps: z.array(MergedTpItemSchema),
  separateTps: z.array(SeparateTpItemSchema),
  prerequisitesAnalysis: z.array(PrerequisitesAnalysisItemSchema),
  recommendedActivities: RecommendedActivitiesSchema,
  differentiatedOutcomes: DifferentiatedOutcomesSchema,
  assessmentRecommendations: AssessmentRecommendationsSchema,
  mappingBasis: MappingBasisSchema,
  confidence: ConfidenceSchema,
});

export type IntersectionMappingResult = z.infer<typeof IntersectionMappingResultSchema>;

export interface AiGenerationResult {
  success: boolean;
  data?: IntersectionMappingResult;
  error?: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: string;
  latencyMs: number;
}
