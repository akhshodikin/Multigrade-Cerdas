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

// 9. Mata Pelajaran SD Kurikulum Merdeka
export const subjects = pgTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  targetPhases: text("target_phases").notNull(),
});

// Legacy / compatibility reference
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

// 10. Dokumen Sumber Kurikulum (PDF, DOCX, XLSX, Manual Input)
export const curriculumSources = pgTable("curriculum_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  documentNumber: text("document_number").notNull(),
  issuingAuthority: text("issuing_authority").default("BSKAP Kemendikbudristek").notNull(),
  publicationYear: integer("publication_year").default(2024).notNull(),
  fileType: text("file_type", { enum: ["pdf", "docx", "xlsx", "manual"] }).notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  extractedText: text("extracted_text"),
  needsManualReview: boolean("needs_manual_review").default(false).notNull(),
  status: text("status", { enum: ["draft", "verified", "rejected"] }).default("draft").notNull(),
  version: text("version").default("v1.0").notNull(),
  uploadedById: uuid("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
  verifiedById: uuid("verified_by_id").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 11. Capaian Pembelajaran (CP) dan Elemen CP Resmi
export const capaianPembelajaran = pgTable("capaian_pembelajaran", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  phase: text("phase", { enum: ["Fase A", "Fase B", "Fase C"] }).notNull(),
  element: text("element").notNull(),
  sourceDocumentId: uuid("source_document_id").references(() => curriculumSources.id, { onDelete: "cascade" }),
  sourcePage: text("source_page"),
  sourceSection: text("source_section"),
  originalSourceText: text("original_source_text").notNull(), // Rumusan CP verbatim tanpa perubahan
  aiInterpretation: text("ai_interpretation"), // Interpretasi / catatan pemetaan AI (terpisah dari sumber)
  duplicateHash: text("duplicate_hash").notNull(), // Deteksi data duplikat (SHA-256)
  version: integer("version").default(1).notNull(),
  verificationStatus: text("verification_status", { enum: ["draft", "in_review", "approved", "rejected", "in_use"] }).default("draft").notNull(),
  reviewNotes: text("review_notes"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 12. Tujuan Pembelajaran (TP)
export const tujuanPembelajaran = pgTable("tujuan_pembelajaran", {
  id: uuid("id").defaultRandom().primaryKey(),
  cpId: uuid("cp_id").references(() => capaianPembelajaran.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  phase: text("phase", { enum: ["Fase A", "Fase B", "Fase C"] }).notNull(),
  targetGrade: integer("target_grade"), // Kelas 1 s/d 6
  code: text("code").notNull(), // e.g. "TP-MAT-B.1-01"
  competency: text("competency").notNull(),
  contentScope: text("content_scope").notNull(),
  description: text("description").notNull(), // Rumusan lengkap Tujuan Pembelajaran
  sourceType: text("source_type", { enum: ["verbatim_source", "derived_teacher", "ai_assisted"] }).default("derived_teacher").notNull(),
  version: integer("version").default(1).notNull(),
  verificationStatus: text("verification_status", { enum: ["draft", "in_review", "approved", "rejected", "in_use"] }).default("draft").notNull(),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 13. Alur Tujuan Pembelajaran (ATP Plans)
export const atpPlans = pgTable("atp_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  phase: text("phase", { enum: ["Fase A", "Fase B", "Fase C"] }).notNull(),
  groupId: text("group_id").references(() => multigradeGroups.id), // e.g. "group-a", "group-b", "group-c"
  targetGrade: integer("target_grade"), // null = multigrade group (both classes), 1-6 = single class ATP
  semester: text("semester", { enum: ["Semua", "Ganjil", "Genap"] }).default("Semua").notNull(),
  academicYear: text("academic_year").default("2024/2025").notNull(),
  totalHours: integer("total_hours").default(72).notNull(),
  effectiveWeeks: integer("effective_weeks").default(36).notNull(),
  description: text("description"),
  status: text("status", { enum: ["draft", "in_review", "approved", "rejected", "in_use"] }).default("draft").notNull(),
  rejectionNotes: text("rejection_notes"),
  inUseAt: timestamp("in_use_at", { withTimezone: true }),
  version: integer("version").default(1).notNull(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 14. Butir Urutan Alur ATP (ATP Items)
export const atpItems = pgTable("atp_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  atpPlanId: uuid("atp_plan_id").references(() => atpPlans.id, { onDelete: "cascade" }).notNull(),
  tpId: uuid("tp_id").references(() => tujuanPembelajaran.id, { onDelete: "cascade" }).notNull(),
  sequenceOrder: integer("sequence_order").notNull(),
  allocatedHours: integer("allocated_hours").default(4).notNull(),
  targetGrade: integer("target_grade").notNull(),
  semester: text("semester", { enum: ["Ganjil", "Genap"] }).notNull(),
  startWeek: integer("start_week").default(1).notNull(),
  endWeek: integer("end_week").default(2).notNull(),
  monthName: text("month_name"),
  multigradeStrategy: text("multigrade_strategy", { enum: ["terpadu_sebagian", "terpisah_paralel", "terpadu_penuh", "mandiri"] }).default("terpadu_sebagian"),
  multigradeNotes: text("multigrade_notes"), // Catatan pembelajaran kelas rangkap
  pairedTpId: uuid("paired_tp_id").references(() => tujuanPembelajaran.id, { onDelete: "set null" }),
});

// 15. Prasyarat Pembelajaran (TP Prerequisites)
export const tpPrerequisites = pgTable("tp_prerequisites", {
  id: uuid("id").defaultRandom().primaryKey(),
  tpId: uuid("tp_id").references(() => tujuanPembelajaran.id, { onDelete: "cascade" }).notNull(),
  prerequisiteTpId: uuid("prerequisite_tp_id").references(() => tujuanPembelajaran.id, { onDelete: "cascade" }).notNull(),
  prerequisiteType: text("prerequisite_type", { enum: ["wajib", "dianjurkan"] }).default("wajib").notNull(),
  notes: text("notes"),
});

// 16. Riwayat Versi & Perbandingan Kurikulum (Audit Trails of Entities)
export const curriculumVersions = pgTable("curriculum_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type", { enum: ["source_doc", "cp", "tp", "atp"] }).notNull(),
  entityId: text("entity_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  changeType: text("change_type", { enum: ["created", "updated", "status_changed", "restored"] }).notNull(),
  changedById: uuid("changed_by_id").references(() => users.id, { onDelete: "set null" }),
  changedByName: text("changed_by_name"),
  previousSnapshot: jsonb("previous_snapshot").$type<Record<string, unknown>>(),
  currentSnapshot: jsonb("current_snapshot").$type<Record<string, unknown>>(),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 17. Laporan Validasi Kurikulum (Validation Engine Reports)
export const validationReports = pgTable("validation_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetType: text("target_type", { enum: ["atp_plan", "curriculum_bank", "tp"] }).notNull(),
  targetId: text("target_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  totalIssues: integer("total_issues").default(0).notNull(),
  criticalCount: integer("critical_count").default(0).notNull(),
  warningCount: integer("warning_count").default(0).notNull(),
  infoCount: integer("info_count").default(0).notNull(),
  pedagogicalDisclaimer: text("pedagogical_disclaimer").notNull(),
  reviewedById: uuid("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedByName: text("reviewed_by_name"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 18. Rincian Masalah Validasi (Validation Issues)
export const validationIssues = pgTable("validation_issues", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").references(() => validationReports.id, { onDelete: "cascade" }),
  ruleCode: text("rule_code").notNull(), // e.g. "RULE_TP_ORPHAN", "RULE_PREREQ_VIOLATION"
  title: text("title").notNull(),
  severity: text("severity", { enum: ["kritis", "peringatan", "info"] }).notNull(),
  sourceLocation: text("source_location").notNull(), // e.g. "TP-MAT-B.1-02", "ATP Urutan 2"
  entityType: text("entity_type", { enum: ["cp", "tp", "atp_plan", "atp_item", "prerequisite"] }).notNull(),
  entityId: text("entity_id").notNull(),
  description: text("description").notNull(),
  recommendation: text("recommendation").notNull(),
  resolutionStatus: text("resolution_status", { enum: ["terbuka", "selesai", "diabaikan"] }).default("terbuka").notNull(),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 11. Modul Ajar Multigrade (Multigrade Lesson Plans)
export const multigradeLessonPlans = pgTable("multigrade_lesson_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  groupId: text("group_id").references(() => multigradeGroups.id).notNull(),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  phase: text("phase").default("Fase A").notNull(),
  grades: text("grades").default("1,2").notNull(),
  academicYear: text("academic_year").default("2024/2025").notNull(),
  semester: text("semester", { enum: ["Ganjil", "Genap"] }).default("Ganjil").notNull(),
  allocatedHours: integer("allocated_hours").default(2).notNull(), // Alokasi JP
  durationMinutes: integer("duration_minutes").default(70).notNull(), // Durasi menit
  topic: text("topic").notNull(), // Tema / Topik Pembelajaran
  essentialMaterial: text("essential_material").default("").notNull(), // Materi Esensial
  initialCompetency: text("initial_competency").default("").notNull(), // Kompetensi Awal
  learningObjectives: jsonb("learning_objectives").$type<Array<{
    grade: number;
    tpId: string;
    tpCode: string;
    competency: string;
    description: string;
  }>>().default([]).notNull(), // Target per jenjang kelas (tidak dipaksakan sama)
  curriculumReferences: jsonb("curriculum_references").$type<{
    cpId?: string;
    cpCode?: string;
    cpElement?: string;
    atpPlanId?: string;
    atpPlanTitle?: string;
    materialMapId?: string;
    tpIds: string[];
  }>().default({ tpIds: [] }).notNull(),
  mediaAndResources: jsonb("media_and_resources").$type<{
    media: string[];
    toolsAndMaterials: string[];
    learningSources: string[];
    localContextNotes?: string;
  }>().default({ media: [], toolsAndMaterials: [], learningSources: [] }).notNull(),
  teachingSteps: jsonb("teaching_steps").$type<Array<{
    stepNumber: number;
    stepName: string;
    durationMinutes: number;
    patternType: "bersama" | "bimbingan_kelompok_1" | "mandiri_kelompok_2" | "bimbingan_kelompok_2" | "mandiri_kelompok_1" | "diferensiasi_kelas" | "berbagi_hasil" | "asesmen_refleksi";
    teacherRole: string;
    lowerGradeActivity: string;
    higherGradeActivity: string;
    classroomManagementNotes: string;
  }>>().default([]).notNull(), // 8 Pola Aktivitas Rotasi Kelas Rangkap
  differentiation: jsonb("differentiation").$type<{
    content: { lowerGrade: string; higherGrade: string };
    process: { lowerGrade: string; higherGrade: string };
    product: { lowerGrade: string; higherGrade: string };
  }>().default({
    content: { lowerGrade: "", higherGrade: "" },
    process: { lowerGrade: "", higherGrade: "" },
    product: { lowerGrade: "", higherGrade: "" },
  }).notNull(),
  assessments: jsonb("assessments").$type<{
    diagnostic: { technique: string; instrument: string; questions: string[] };
    formative: {
      lowerGradeCriteria: string;
      higherGradeCriteria: string;
      observationRubric: Array<{ criteria: string; perluBimbingan: string; cukup: string; baik: string; sangatBaik: string }>;
    };
    sumatif?: { technique: string; testItems: string };
  }>().default({
    diagnostic: { technique: "Tanya jawab lisan pemantik", instrument: "Daftar pertanyaan apersepsi", questions: [] },
    formative: { lowerGradeCriteria: "", higherGradeCriteria: "", observationRubric: [] },
  }).notNull(),
  reflections: jsonb("reflections").$type<{
    teacherReflectionGuide: string[];
    studentReflectionQuestions: string[];
  }>().default({ teacherReflectionGuide: [], studentReflectionQuestions: [] }).notNull(),
  remedialAndEnrichment: jsonb("remedial_and_enrichment").$type<{
    remedialPlan: string;
    enrichmentPlan: string;
    followUpAction: string;
  }>().default({ remedialPlan: "", enrichmentPlan: "", followUpAction: "" }).notNull(),
  differentiatedStrategy: jsonb("differentiated_strategy").$type<Record<string, unknown>>().default({}).notNull(),
  teacherNotes: text("teacher_notes"), // Kondisi pembelajaran & kebutuhan siswa Tosari
  status: text("status", { enum: ["draft", "in_review", "approved", "published", "archived"] }).default("draft").notNull(),
  teacherId: uuid("teacher_id").references(() => users.id),
  approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionNotes: text("rejection_notes"),
  version: integer("version").default(1).notNull(),
  versionNotes: text("version_notes"),
  clonedFromId: uuid("cloned_from_id"),
  aiAssisted: boolean("ai_assisted").default(false).notNull(),
  aiProvider: text("ai_provider").default("manual").notNull(), // "gemini", "mock_local", "manual"
  aiModel: text("ai_model").default("manual").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 12. Asesmen & Nilai
export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  lessonPlanId: uuid("lesson_plan_id").references(() => multigradeLessonPlans.id, { onDelete: "set null" }),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  title: text("title").notNull(),
  assessmentType: text("assessment_type", { enum: ["diagnostik", "formatif", "sumatif", "observasi"] }).notNull(),
  tpId: uuid("tp_id").references(() => tujuanPembelajaran.id, { onDelete: "set null" }),
  tpCode: text("tp_code"),
  phase: text("phase"),
  groupId: text("group_id").references(() => multigradeGroups.id, { onDelete: "set null" }),
  academicYear: text("academic_year").default("2024/2025").notNull(),
  semester: text("semester", { enum: ["Ganjil", "Genap"] }).default("Ganjil").notNull(),
  instrumentType: text("instrument_type", {
    enum: ["rubrik_observasi", "lkpd", "tes_tertulis", "unjuk_kerja", "tes_lisan", "portofolio"],
  }).default("rubrik_observasi").notNull(),
  rubricSchema: jsonb("rubric_schema").$type<Array<{
    criteria: string;
    perluBimbingan: string;
    cukup: string;
    baik: string;
    sangatBaik: string;
    maxScore: number;
  }>>().default([]).notNull(),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const studentAssessmentResults = pgTable("student_assessment_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  assessmentId: uuid("assessment_id").references(() => assessments.id, { onDelete: "cascade" }).notNull(),
  studentId: uuid("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  classId: integer("class_id"),
  subjectId: text("subject_id"),
  tpId: uuid("tp_id"),
  score: integer("score"),
  masteryLevel: text("mastery_level", { enum: ["perlu_bimbingan", "cukup", "baik", "sangat_baik"] }),
  teacherNotes: text("teacher_notes"),
  learningEvidence: text("learning_evidence"),
  evidenceMediaUrl: text("evidence_media_url"),
  assessorId: uuid("assessor_id").references(() => users.id, { onDelete: "set null" }),
  assessorName: text("assessor_name"),
  followUpType: text("follow_up_type", {
    enum: ["tidak_perlu", "remedial_terbimbing", "remedial_tutor_sebaya", "pengayaan_mandiri", "pengayaan_eksploratif"],
  }).default("tidak_perlu").notNull(),
  followUpNotes: text("follow_up_notes"),
  aiSuggestedFollowUp: text("ai_suggested_follow_up"),
  followUpCompleted: boolean("follow_up_completed").default(false).notNull(),
  assessmentDate: text("assessment_date"),
  assessedAt: timestamp("assessed_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 12b. Konfigurasi Kriteria Ketercapaian Sekolah (KKTP & Kebijakan Remedial/Pengayaan SDN SEDAENG II Tosari)
export const schoolAssessmentCriteria = pgTable("school_assessment_criteria", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: integer("school_id").default(1).notNull(),
  academicYear: text("academic_year").default("2024/2025").notNull(),
  semester: text("semester", { enum: ["Ganjil", "Genap"] }).default("Ganjil").notNull(),
  passingScoreDefault: integer("passing_score_default").default(70).notNull(),
  levelsDefinition: jsonb("levels_definition").$type<Array<{
    level: "perlu_bimbingan" | "cukup" | "baik" | "sangat_baik";
    label: string;
    scoreMin: number;
    scoreMax: number;
    description: string;
  }>>().default([
    { level: "perlu_bimbingan", label: "Perlu Bimbingan (Mulai Berkembang)", scoreMin: 0, scoreMax: 59, description: "Belum mencapai kriteria minimal TP, memerlukan intervensi remedial intensif / tutor sebaya." },
    { level: "cukup", label: "Cukup (Sedang Berkembang)", scoreMin: 60, scoreMax: 74, description: "Mencapai kriteria dengan sebagian bantuan arahan guru." },
    { level: "baik", label: "Baik (Berkembang Sesuai Harapan)", scoreMin: 75, scoreMax: 89, description: "Mencapai seluruh indikator TP secara mandiri dan akurat." },
    { level: "sangat_baik", label: "Sangat Baik (Sangat Berkembang)", scoreMin: 90, scoreMax: 100, description: "Melampaui kriteria TP, bernalar kritis mendalam dan siap menerima pengayaan eksploratif." },
  ]).notNull(),
  remedialPolicy: text("remedial_policy").default("Siswa pada level Perlu Bimbingan mendapatkan pendampingan terfokus pada rotasi kelas rangkap atau dipasangkan dengan tutor sebaya.").notNull(),
  enrichmentPolicy: text("enrichment_policy").default("Siswa pada level Sangat Baik diberikan tugas eksploratif, tantangan studi kasus lokal Tosari, atau peran sebagai tutor sebaya.").notNull(),
  nonNumericalRuleStatement: text("non_numerical_rule_statement").default("Penguasaan Capaian Pembelajaran (CP) Fase tidak boleh disimpulkan hanya dari satu angka rata-rata, melainkan berdasarkan akumulasi bukti belajar kualitatif per TP.").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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

// 19. Pemetaan Irisan Materi Multigrade (Cross-Cutting Topic Maps)
export const multigradeMaterialMaps = pgTable("multigrade_material_maps", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: text("group_id").references(() => multigradeGroups.id).notNull(),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  academicYear: text("academic_year").default("2024/2025").notNull(),
  semester: text("semester", { enum: ["Ganjil", "Genap"] }).default("Ganjil").notNull(),
  durationMinutes: integer("duration_minutes").default(70).notNull(),
  sharedTheme: text("shared_theme").notNull(),
  studentConditions: text("student_conditions"),
  mappingStrategy: text("mapping_strategy", { enum: ["terpadu_sebagian", "terpisah_paralel", "terpadu_penuh"] }).notNull(),
  aiProvider: text("ai_provider").notNull(), // "gemini", "mock_local", "manual"
  aiModel: text("ai_model").notNull(),
  confidenceLevel: text("confidence_level", { enum: ["tinggi", "sedang", "rendah"] }).default("sedang").notNull(),
  confidenceScore: integer("confidence_score").default(75).notNull(),
  confidenceDisclaimer: text("confidence_disclaimer").notNull(),
  structuredOutput: jsonb("structured_output").$type<Record<string, unknown>>().notNull(),
  status: text("status", { enum: ["draft", "reviewed", "approved", "rejected"] }).default("draft").notNull(),
  teacherNotes: text("teacher_notes"),
  rejectionReason: text("rejection_reason"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 20. Log Penggunaan & Biaya AI (Token & Cost Tracking)
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  feature: text("feature").notNull(), // "pemetaan_irisan_materi"
  provider: text("provider").notNull(), // "gemini", "mock_local"
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").default(0).notNull(),
  completionTokens: integer("completion_tokens").default(0).notNull(),
  totalTokens: integer("total_tokens").default(0).notNull(),
  estimatedCostUsd: text("estimated_cost_usd").default("0.0000").notNull(),
  latencyMs: integer("latency_ms").default(0).notNull(),
  status: text("status", { enum: ["success", "fallback", "error"] }).notNull(),
  errorMessage: text("error_message"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 21. Kalender Pendidikan & Pekan Efektif SDN SEDAENG II Tosari
export const academicCalendars = pgTable("academic_calendars", {
  id: uuid("id").defaultRandom().primaryKey(),
  academicYear: text("academic_year").default("2024/2025").notNull(),
  semester: text("semester", { enum: ["Ganjil", "Genap"] }).notNull(),
  title: text("title").notNull(),
  effectiveWeeksCount: integer("effective_weeks_count").default(18).notNull(),
  nonEffectiveWeeksCount: integer("non_effective_weeks_count").default(2).notNull(),
  events: jsonb("events").$type<Array<{ name: string; dateRange: string; type: string }>>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 22. Lembar Kerja Peserta Didik (LKPD Multigrade per Kelas)
export const lkpdWorksheets = pgTable("lkpd_worksheets", {
  id: uuid("id").defaultRandom().primaryKey(),
  lessonPlanId: uuid("lesson_plan_id").references(() => multigradeLessonPlans.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  groupId: text("group_id").references(() => multigradeGroups.id).notNull(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  grade: integer("grade").notNull(), // 1, 2, 3, 4, 5, 6
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  phase: text("phase").notNull(), // "Fase A", "Fase B", "Fase C"
  academicYear: text("academic_year").default("2024/2025").notNull(),
  semester: text("semester", { enum: ["Ganjil", "Genap"] }).default("Ganjil").notNull(),
  themeOrTopic: text("theme_or_topic").notNull(),
  targetTpId: uuid("target_tp_id"),
  targetTpCode: text("target_tp_code").notNull(),
  targetTpDescription: text("target_tp_description").notNull(),
  timeAllocationMinutes: integer("time_allocation_minutes").default(35).notNull(),
  ageAppropriateInstructions: jsonb("age_appropriate_instructions").$type<string[]>().default([]).notNull(),
  stimulus: jsonb("stimulus").$type<{
    type: "story" | "dialogue" | "image" | "data_table" | "local_context";
    title: string;
    content: string;
    illustrationKey?: string;
    illustrationCaption?: string;
  }>().notNull(),
  activitySteps: jsonb("activity_steps").$type<Array<{
    stepNumber: number;
    instruction: string;
    guidanceNotes?: string;
  }>>().default([]).notNull(),
  answerSections: jsonb("answer_sections").$type<Array<{
    id: string;
    questionNumber: number;
    questionType: "multiple_choice" | "short_answer" | "essay" | "matching" | "drawing_area" | "fill_blank";
    questionText: string;
    options?: string[];
    matchingPairs?: Array<{ left: string; right: string }>;
    helperHint?: string;
    points: number;
  }>>().default([]).notNull(),
  studentReflection: jsonb("student_reflection").$type<{
    emoticonOptions: Array<{ mood: string; label: string; icon: string }>;
    promptQuestions: string[];
  }>().notNull(),
  teacherRubric: jsonb("teacher_rubric").$type<Array<{
    indicator: string;
    perluBimbingan: string;
    cukup: string;
    baik: string;
    sangatBaik: string;
    maxScore: number;
  }>>().default([]).notNull(),
  printSettings: jsonb("print_settings").$type<{
    colorMode: "color" | "grayscale" | "bw_eco";
    showSchoolHeader: boolean;
    paperSize: "A4" | "F4";
  }>().default({ colorMode: "color", showSchoolHeader: true, paperSize: "A4" }).notNull(),
  status: text("status", { enum: ["draft", "in_review", "approved", "published", "archived"] }).default("draft").notNull(),
  version: integer("version").default(1).notNull(),
  versionNotes: text("version_notes"),
  clonedFromId: uuid("cloned_from_id"),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionNotes: text("rejection_notes"),
  aiAssisted: boolean("ai_assisted").default(true).notNull(),
  aiProvider: text("ai_provider").default("gemini").notNull(),
  aiModel: text("ai_model").default("gemini-3.8-flash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 23. Perpustakaan Media Pembelajaran (Reusable Multigrade Learning Media)
export const learningMediaItems = pgTable("learning_media_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  lessonPlanId: uuid("lesson_plan_id").references(() => multigradeLessonPlans.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  mediaType: text("media_type", {
    enum: [
      "kartu_aktivitas",
      "kartu_gambar",
      "bacaan_bertingkat",
      "media_literasi_numerasi",
      "presentasi",
      "ilustrasi_pendukung"
    ]
  }).notNull(),
  subjectId: text("subject_id").references(() => subjects.id).notNull(),
  phase: text("phase").default("Fase A").notNull(),
  targetGrade: integer("target_grade"), // null = lintas kelas
  groupId: text("group_id").references(() => multigradeGroups.id),
  description: text("description").default("").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  contentData: jsonb("content_data").$type<Record<string, unknown>>().default({}).notNull(),
  colorModeSupported: text("color_mode_supported", { enum: ["both", "color_only", "bw_eco"] }).default("both").notNull(),
  isPublicLibrary: boolean("is_public_library").default(true).notNull(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
