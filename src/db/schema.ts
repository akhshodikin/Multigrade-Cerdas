import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from "drizzle-orm/pg-core";

// 1. Roles & Users (Guru & Tenaga Kependidikan)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["teacher", "headmaster", "admin"] }).default("teacher").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Multigrade Groups (Kelompok Belajar Rangkap)
export const multigradeGroups = pgTable("multigrade_groups", {
  id: text("id").primaryKey(), // e.g. "group-a", "group-b", "group-c"
  name: text("name").notNull(), // "Kelompok A", "Kelompok B", "Kelompok C"
  phase: text("phase").notNull(), // "Fase A", "Fase B", "Fase C"
  grades: text("grades").notNull(), // "1,2", "3,4", "5,6"
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Classes (Tingkatan Kelas 1 - 6)
export const classes = pgTable("classes", {
  id: integer("id").primaryKey(), // 1, 2, 3, 4, 5, 6
  name: text("name").notNull(), // "Kelas 1", etc.
  groupId: text("group_id").references(() => multigradeGroups.id).notNull(),
  phase: text("phase").notNull(), // "Fase A", "Fase B", "Fase C"
});

// 4. Students (Data Siswa dengan Proteksi Privasi & ID Terindeks)
// Sekolah kecil (27 siswa), privasi terlindungi dengan studentCode & identifier lokal
export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentCode: text("student_code").notNull().unique(), // e.g. "SDN2-A-01"
  displayName: text("display_name").notNull(), // Nama panggilan/inisial untuk privasi
  classId: integer("class_id").references(() => classes.id).notNull(),
  groupId: text("group_id").references(() => multigradeGroups.id).notNull(),
  gender: text("gender", { enum: ["L", "P"] }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 5. Subjects (Mata Pelajaran Kurikulum Merdeka SD)
export const subjects = pgTable("subjects", {
  id: text("id").primaryKey(), // e.g. "bahasa-indonesia", "matematika", "ipas", etc.
  name: text("name").notNull(),
  category: text("category").notNull(), // "wajib", "pilihan", "muatan-lokal"
  targetPhases: text("target_phases").notNull(), // "A,B,C"
});

// 6. Learning Objectives (Tujuan Pembelajaran / TP terverifikasi resmi Kurikulum Merdeka)
export const learningObjectives = pgTable("learning_objectives", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  phase: text("phase").notNull(), // "Fase A", "Fase B", "Fase C"
  gradeLevel: integer("grade_level"), // 1 s/d 6
  code: text("code").notNull(), // e.g. "TP-MAT-A-01"
  description: text("description").notNull(),
  sourceDocument: text("source_document"), // Rujukan resmi BSKAP Kemendikbudristek
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Multigrade Lesson Plans (Modul Ajar / RPP Multigrade)
export const multigradeLessonPlans = pgTable("multigrade_lesson_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  groupId: text("group_id").references(() => multigradeGroups.id).notNull(),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  topic: text("topic").notNull(),
  durationMinutes: integer("duration_minutes").default(70).notNull(),
  
  // Differentiated activities structure (e.g., lower grade direct vs upper grade self-directed)
  differentiatedStrategy: jsonb("differentiated_strategy").$type<{
    commonConcept: string;
    lowerGradeActivity: { grade: number; mode: string; steps: string[] };
    upperGradeActivity: { grade: number; mode: string; steps: string[] };
    peerTutoringNotes?: string;
  }>().notNull(),

  teacherId: uuid("teacher_id").references(() => users.id),
  aiAssisted: boolean("ai_assisted").default(false).notNull(),
  aiPromptSummary: text("ai_prompt_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 8. Assessments & Student Progress (Asesmen & Kemajuan Siswa)
export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  lessonPlanId: uuid("lesson_plan_id").references(() => multigradeLessonPlans.id),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  title: text("title").notNull(),
  assessmentType: text("assessment_type", { enum: ["formatif", "sumatif", "observasi"] }).notNull(),
  rubric: jsonb("rubric").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const studentAssessmentResults = pgTable("student_assessment_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  assessmentId: uuid("assessment_id").references(() => assessments.id).notNull(),
  studentId: uuid("student_id").references(() => students.id).notNull(),
  score: integer("score"),
  masteryLevel: text("mastery_level", { enum: ["perlu_bimbingan", "cukup", "baik", "sangat_baik"] }),
  teacherNotes: text("teacher_notes"),
  assessedAt: timestamp("assessed_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. Offline Sync Queue (Sinkronisasi Offline-to-Online saat internet tersedia)
export const offlineSyncLogs = pgTable("offline_sync_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientEntityId: text("client_entity_id").notNull(),
  entityType: text("entity_type").notNull(), // "assessment_result", "lesson_plan", etc.
  action: text("action", { enum: ["insert", "update", "delete"] }).notNull(),
  payload: jsonb("payload").notNull(),
  syncStatus: text("sync_status", { enum: ["pending", "synced", "conflict", "failed"] }).default("pending").notNull(),
  errorMessage: text("error_message"),
  queuedAt: timestamp("queued_at", { withTimezone: true }).defaultNow().notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});
