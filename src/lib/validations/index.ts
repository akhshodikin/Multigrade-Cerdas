import { z } from "zod";

// Validasi Kelompok Multigrade SDN SEDAENG II
export const multigradeGroupEnum = z.enum(["group-a", "group-b", "group-c"]);
export const gradeEnum = z.number().int().min(1).max(6);
export const phaseEnum = z.enum(["Fase A", "Fase B", "Fase C"]);

// Schema Siswa (Privacy-first: No real PII required in system)
export const studentSchema = z.object({
  studentCode: z.string().min(3).max(30),
  displayName: z.string().min(2).max(50),
  classId: gradeEnum,
  groupId: multigradeGroupEnum,
  gender: z.enum(["L", "P"]),
  isActive: z.boolean().default(true),
});

// Schema Rencana Pelaksanaan Pembelajaran Multigrade (RPP Terpadu)
export const multigradeLessonPlanSchema = z.object({
  title: z.string().min(5).max(150),
  groupId: multigradeGroupEnum,
  subjectId: z.string().min(2),
  topic: z.string().min(3).max(100),
  durationMinutes: z.number().int().min(30).max(180).default(70),
  differentiatedStrategy: z.object({
    commonConcept: z.string().min(5),
    lowerGradeActivity: z.object({
      grade: z.number().int().min(1).max(5),
      mode: z.enum(["direct_instruction", "independent_task", "peer_tutoring", "hands_on"]),
      steps: z.array(z.string()).min(1),
    }),
    upperGradeActivity: z.object({
      grade: z.number().int().min(2).max(6),
      mode: z.enum(["direct_instruction", "independent_task", "peer_tutoring", "hands_on"]),
      steps: z.array(z.string()).min(1),
    }),
    peerTutoringNotes: z.string().optional(),
  }),
});

// Schema Hasil Asesmen Formatif / Sumatif
export const assessmentResultSchema = z.object({
  assessmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  score: z.number().int().min(0).max(100).optional(),
  masteryLevel: z.enum(["perlu_bimbingan", "cukup", "baik", "sangat_baik"]),
  teacherNotes: z.string().max(500).optional(),
});

// Schema Antrean Sinkronisasi Offline
export const offlineSyncPayloadSchema = z.object({
  clientEntityId: z.string(),
  entityType: z.enum(["assessment_result", "lesson_plan", "attendance"]),
  action: z.enum(["insert", "update", "delete"]),
  payload: z.record(z.any()),
  queuedAt: z.string().datetime(),
});
