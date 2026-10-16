import { z } from "zod";

export const phaseEnum = z.enum(["Fase A", "Fase B", "Fase C"]);
export const verificationStatusEnum = z.enum(["draft", "in_review", "approved", "rejected"]);

// Schema Dokumen Sumber Kurikulum
export const curriculumSourceSchema = z.object({
  title: z.string().min(5, "Judul dokumen minimal 5 karakter"),
  documentNumber: z.string().min(3, "Nomor dokumen minimal 3 karakter"),
  issuingAuthority: z.string().min(3, "Lembaga penerbit minimal 3 karakter").default("BSKAP Kemendikbudristek"),
  publicationYear: z.coerce.number().int().min(2020).max(2030).default(2024),
  fileType: z.enum(["pdf", "docx", "xlsx", "manual"]),
  version: z.string().default("v1.0"),
  needsManualReview: z.boolean().default(false),
  extractedText: z.string().optional(),
});

// Schema Capaian Pembelajaran (CP)
export const capaianPembelajaranSchema = z.object({
  subjectId: z.string().min(2, "Mata pelajaran wajib dipilih"),
  phase: phaseEnum,
  element: z.string().min(2, "Elemen CP wajib diisi (misal: Menyimak, Bilangan, Pemahaman IPAS)"),
  sourceDocumentId: z.string().uuid("Dokumen sumber wajib valid"),
  sourcePage: z.string().min(1, "Halaman sumber wajib dicatat (misal: Hal. 42)").max(100),
  sourceSection: z.string().optional().or(z.literal("")),
  originalSourceText: z.string().min(10, "Kutipan rumusan CP resmi sumber minimal 10 karakter"),
  aiInterpretation: z.string().optional().or(z.literal("")),
  reviewNotes: z.string().optional().or(z.literal("")),
});

// Schema Tujuan Pembelajaran (TP)
export const tujuanPembelajaranSchema = z.object({
  cpId: z.string().uuid("CP rujukan wajib valid").optional().or(z.literal("")),
  subjectId: z.string().min(2, "Mata pelajaran wajib dipilih"),
  phase: phaseEnum,
  targetGrade: z.coerce.number().int().min(1).max(6).optional(),
  code: z.string().min(3, "Kode TP minimal 3 karakter (contoh: TP-MAT-B.3-01)"),
  competency: z.string().min(3, "Kompetensi minimal 3 karakter"),
  contentScope: z.string().min(3, "Lingkup materi minimal 3 karakter"),
  description: z.string().min(10, "Rumusan Tujuan Pembelajaran minimal 10 karakter"),
  sourceType: z.enum(["verbatim_source", "derived_teacher", "ai_assisted"]).default("derived_teacher"),
});

// Schema Rencana ATP
export const atpPlanSchema = z.object({
  title: z.string().min(5, "Judul ATP minimal 5 karakter"),
  subjectId: z.string().min(2, "Mata pelajaran wajib dipilih"),
  phase: phaseEnum,
  academicYear: z.string().min(4, "Tahun ajaran wajib diisi (contoh: 2024/2025)"),
  totalHours: z.coerce.number().int().min(1).max(300).default(72),
});

// Schema Item Alur ATP
export const atpItemSchema = z.object({
  atpPlanId: z.string().uuid(),
  tpId: z.string().uuid(),
  sequenceOrder: z.coerce.number().int().min(1),
  allocatedHours: z.coerce.number().int().min(1).max(40).default(4),
  targetGrade: z.coerce.number().int().min(1).max(6),
  semester: z.enum(["Ganjil", "Genap"]),
  multigradeNotes: z.string().optional().or(z.literal("")),
});

// Schema Status Persetujuan
export const approvalSchema = z.object({
  status: verificationStatusEnum,
  reviewNotes: z.string().optional().or(z.literal("")),
});
