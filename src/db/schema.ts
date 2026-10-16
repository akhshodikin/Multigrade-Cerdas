import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from "drizzle-orm/pg-core";

// 1. Profil Sekolah (SDN SEDAENG II Tosari - Singleton Entity)
export const schoolProfile = pgTable("school_profile", {
  id: integer("id").primaryKey(), // ID 1 (Singleton)
  npsn: text("npsn").notNull().default("20519000"),
  name: text("name").notNull().default("SDN SEDAENG II Tosari"),
  address: text("address").notNull().default("Dusun Sedaeng, Desa Sedaeng, Kec. Tosari, Kab. Pasuruan, Jawa Timur 67177"),
  headmasterName: text("headmaster_name").notNull().default("Kepala Sekolah SDN Sedaeng II"),
  headmasterNip: text("headmaster_nip").default("197508122000031002"),
  phone: text("phone").default("081234567890"),
  email: text("email").default("sdnsedaeng2tosari@gmail.com"),
  activeAcademicYear: text("active_academic_year").notNull().default("2024/2025"),
  activeSemester: text("active_semester").notNull().default("Ganjil"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Tahun Ajaran & Semester
export const academicTerms = pgTable("academic_terms", {
  id: uuid("id").defaultRandom().primaryKey(),
  year: text("year").notNull(), // e.g. "2024/2025"
  semester: text("semester", { enum: ["Ganjil", "Genap"] }).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Kelompok Belajar Rangkap (Multigrade Groups)
export const multigradeGroups = pgTable("multigrade_groups", {
  id: text("id").primaryKey(), // "group-a", "group-b", "group-c"
  name: text("name").notNull(), // "Kelompok A", "Kelompok B", "Kelompok C"
  phase: text("phase").notNull(), // "Fase A", "Fase B", "Fase C"
  grades: text("grades").notNull(), // "1,2", "3,4", "5,6"
  leadTeacherId: uuid("lead_teacher_id"), // FK to users.id
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Tingkatan Kelas (1 s/d 6)
export const classes = pgTable("classes", {
  id: integer("id").primaryKey(), // 1, 2, 3, 4, 5, 6
  name: text("name").notNull(), // "Kelas 1" s/d "Kelas 6"
  groupId: text("group_id").references(() => multigradeGroups.id).notNull(),
  phase: text("phase").notNull(), // "Fase A", "Fase B", "Fase C"
});

// 5. Pengguna & Peran (Admin, Kepala Sekolah, Guru Pengampu)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "headmaster", "teacher"] }).default("teacher").notNull(),
  nip: text("nip"),
  phone: text("phone"),
  assignedGroupId: text("assigned_group_id").references(() => multigradeGroups.id), // Pengampu Kelompok A, B, atau C
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Sesi Pengguna Aktif (Session Storage Aman Server-Side)
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // Token sesi acak berukuran aman
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Data Siswa SDN SEDAENG II Tosari (27 Siswa, Terlindungi Privasi)
export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentCode: text("student_code").notNull().unique(), // e.g. "SDN2-A-01"
  displayName: text("display_name").notNull(), // Nama panggil / inisial
  fullName: text("full_name").notNull(), // Nama siswa sintetis untuk administrasi
  classId: integer("class_id").references(() => classes.id).notNull(),
  groupId: text("group_id").references(() => multigradeGroups.id).notNull(),
  gender: text("gender", { enum: ["L", "P"] }).notNull(),
  birthDate: text("birth_date"),
  guardianName: text("guardian_name"),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 8. Log Audit Perubahan Penting
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: text("user_name"),
  userRole: text("user_role"),
  action: text("action").notNull(), // e.g. "LOGIN", "LOGOUT", "UPDATE_PROFILE", "CREATE_STUDENT", dll.
  targetEntity: text("target_entity").notNull(), // e.g. "student", "user", "school_profile", "term"
  targetId: text("target_id"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. Mata Pelajaran SD Kurikulum Merdeka (Persiapan Tahap Berikutnya)
export const subjects = pgTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  targetPhases: text("target_phases").notNull(),
});

// 10. Tujuan Pembelajaran (TP Resmi)
export const learningObjectives = pgTable("learning_objectives", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  phase: text("phase").notNull(),
  gradeLevel: integer("grade_level"),
  code: text("code").notNull(),
  description: text("description").notNull(),
  sourceDocument: text("source_document"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 11. Modul Ajar Multigrade
export const multigradeLessonPlans = pgTable("multigrade_lesson_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  groupId: text("group_id").references(() => multigradeGroups.id).notNull(),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  topic: text("topic").notNull(),
  durationMinutes: integer("duration_minutes").default(70).notNull(),
  differentiatedStrategy: jsonb("differentiated_strategy").$type<Record<string, unknown>>().notNull(),
  teacherId: uuid("teacher_id").references(() => users.id),
  aiAssisted: boolean("ai_assisted").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 12. Asesmen & Nilai
export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  lessonPlanId: uuid("lesson_plan_id").references(() => multigradeLessonPlans.id),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  title: text("title").notNull(),
  assessmentType: text("assessment_type", { enum: ["formatif", "sumatif", "observasi"] }).notNull(),
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

// 13. Antrean Sinkronisasi Offline
export const offlineSyncLogs = pgTable("offline_sync_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientEntityId: text("client_entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  action: text("action", { enum: ["insert", "update", "delete"] }).notNull(),
  payload: jsonb("payload").notNull(),
  syncStatus: text("sync_status", { enum: ["pending", "synced", "conflict", "failed"] }).default("pending").notNull(),
  errorMessage: text("error_message"),
  queuedAt: timestamp("queued_at", { withTimezone: true }).defaultNow().notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});
