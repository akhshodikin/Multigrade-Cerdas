"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/audit/logger";
import {
  curriculumSourceSchema,
  capaianPembelajaranSchema,
  tujuanPembelajaranSchema,
  atpPlanSchema,
  atpItemSchema,
  approvalSchema,
} from "@/lib/validations/curriculum";
import { extractDocumentContent, generateDuplicateHash } from "@/lib/curriculum/extractor";
import { recordCurriculumVersion } from "@/lib/curriculum/versioning";
import { revalidatePath } from "next/cache";

// 1. Impor & Pendaftaran Dokumen Sumber Kurikulum (PDF, DOCX, XLSX, Manual)
export async function importCurriculumSourceAction(formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const title = formData.get("title") as string;
  const documentNumber = formData.get("documentNumber") as string;
  const issuingAuthority = (formData.get("issuingAuthority") as string) || "BSKAP Kemendikbudristek";
  const publicationYear = Number(formData.get("publicationYear") || 2024);
  const fileType = formData.get("fileType") as "pdf" | "docx" | "xlsx" | "manual";
  const version = (formData.get("version") as string) || "v1.0";
  const manualText = (formData.get("manualText") as string) || "";
  const file = formData.get("file") as File | null;

  let extractedText = manualText;
  let fileSize = 0;
  let fileName = "";
  let needsManualReview = false;

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB limit
  if (file && file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: "Ukuran berkas melebihi batas keamanan maksimal 15 MB.",
    };
  }

  if (file && file.size > 0 && fileType !== "manual") {
    fileName = file.name;
    fileSize = file.size;

    // Validasi ekstensi terhadap tipe berkas yang dideklarasikan
    const ext = fileName.split(".").pop()?.toLowerCase();
    const validExtensions: Record<string, string[]> = {
      pdf: ["pdf"],
      docx: ["docx"],
      xlsx: ["xlsx", "xls"],
    };

    if (!ext || !validExtensions[fileType]?.includes(ext)) {
      return {
        success: false,
        error: `Format ekstensi .${ext} tidak sesuai dengan tipe berkas '${fileType}' yang dipilih.`,
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extraction = await extractDocumentContent(buffer, fileType, fileName);
    extractedText = extraction.text;
    needsManualReview = extraction.needsManualReview;
  }

  const validation = curriculumSourceSchema.safeParse({
    title,
    documentNumber,
    issuingAuthority,
    publicationYear,
    fileType,
    version,
    needsManualReview,
    extractedText,
  });

  if (!validation.success) {
    return {
      success: false,
      message: "Validasi dokumen sumber gagal",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  // Aturan Wajib: Data yang belum diverifikasi harus berstatus draft
  const [newSource] = await db
    .insert(schema.curriculumSources)
    .values({
      title: data.title,
      documentNumber: data.documentNumber,
      issuingAuthority: data.issuingAuthority,
      publicationYear: data.publicationYear,
      fileType: data.fileType,
      fileName: fileName || null,
      fileSize: fileSize || null,
      extractedText: data.extractedText || null,
      needsManualReview: data.needsManualReview,
      status: "draft", // Wajib draf
      version: data.version,
      uploadedById: currentUser.id,
    })
    .returning();

  await recordCurriculumVersion({
    entityType: "source_doc",
    entityId: newSource.id,
    versionNumber: 1,
    changeType: "created",
    changedById: currentUser.id,
    changedByName: currentUser.name,
    currentSnapshot: newSource as unknown as Record<string, unknown>,
    changeReason: "Impor dokumen sumber kurikulum baru",
  });

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "IMPORT_CURRICULUM_SOURCE",
    targetEntity: "curriculum_source",
    targetId: newSource.id,
    details: { title: data.title, documentNumber: data.documentNumber, fileType: data.fileType, needsManualReview },
  });

  revalidatePath("/dashboard/kurikulum/sumber");
  revalidatePath("/dashboard/kurikulum");

  return {
    success: true,
    message: `Dokumen '${data.title}' berhasil diimpor sebagai Draf.${needsManualReview ? " Catatan: Dokumen ditandai untuk pemeriksaan manual oleh pengguna." : ""}`,
    data: newSource,
  };
}

// 2. Tambah Capaian Pembelajaran (CP) dengan Verbatim & Deteksi Duplikat
export async function createCapaianPembelajaranAction(formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const rawData = {
    subjectId: formData.get("subjectId") as string,
    phase: formData.get("phase") as "Fase A" | "Fase B" | "Fase C",
    element: formData.get("element") as string,
    sourceDocumentId: formData.get("sourceDocumentId") as string,
    sourcePage: formData.get("sourcePage") as string,
    sourceSection: (formData.get("sourceSection") as string) || "",
    originalSourceText: formData.get("originalSourceText") as string,
    aiInterpretation: (formData.get("aiInterpretation") as string) || "",
    reviewNotes: (formData.get("reviewNotes") as string) || "",
  };

  const validation = capaianPembelajaranSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      message: "Validasi Capaian Pembelajaran gagal",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  // Deteksi Data Duplikat menggunakan SHA-256
  const duplicateHash = generateDuplicateHash(
    data.subjectId,
    data.phase,
    data.element,
    data.originalSourceText
  );

  const existingCp = await db
    .select()
    .from(schema.capaianPembelajaran)
    .where(eq(schema.capaianPembelajaran.duplicateHash, duplicateHash));

  if (existingCp.length > 0) {
    return {
      success: false,
      message: `Peringatan Duplikasi: Rumusan CP untuk mata pelajaran '${data.subjectId}', ${data.phase}, elemen '${data.element}' sudah terdaftar dalam sistem (Versi ${existingCp[0].version}, Status: ${existingCp[0].verificationStatus}).`,
    };
  }

  // Simpan CP berstatus draft
  const [newCp] = await db
    .insert(schema.capaianPembelajaran)
    .values({
      subjectId: data.subjectId,
      phase: data.phase,
      element: data.element,
      sourceDocumentId: data.sourceDocumentId,
      sourcePage: data.sourcePage,
      sourceSection: data.sourceSection || null,
      originalSourceText: data.originalSourceText, // Verbatim asli
      aiInterpretation: data.aiInterpretation || null, // Terpisah dari teks resmi
      duplicateHash,
      version: 1,
      verificationStatus: "draft", // Wajib draf
      reviewNotes: data.reviewNotes || null,
      createdById: currentUser.id,
    })
    .returning();

  await recordCurriculumVersion({
    entityType: "cp",
    entityId: newCp.id,
    versionNumber: 1,
    changeType: "created",
    changedById: currentUser.id,
    changedByName: currentUser.name,
    currentSnapshot: newCp as unknown as Record<string, unknown>,
    changeReason: "Pencatatan rumusan Capaian Pembelajaran sumber resmi",
  });

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "CREATE_CP",
    targetEntity: "capaian_pembelajaran",
    targetId: newCp.id,
    details: { subjectId: data.subjectId, phase: data.phase, element: data.element },
  });

  revalidatePath("/dashboard/kurikulum/cp");
  revalidatePath("/dashboard/kurikulum");

  return {
    success: true,
    message: `Capaian Pembelajaran (${data.phase} - ${data.element}) berhasil disimpan sebagai Draf.`,
    data: newCp,
  };
}

// 3. Persetujuan & Verifikasi Status CP (Workflow Approval)
export async function updateCpStatusAction(cpId: string, formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const rawStatus = formData.get("status") as "draft" | "in_review" | "approved" | "rejected";
  const reviewNotes = (formData.get("reviewNotes") as string) || "";

  // Validasi kewenangan: Hanya Kepala Sekolah dan Administrator yang berhak memberikan approval 'approved'
  if (rawStatus === "approved" && currentUser.role === "teacher") {
    return {
      success: false,
      message: "FORBIDDEN: Guru hanya berwenang mengajukan penelaahan (in_review). Persetujuan resmi wajib oleh Kepala Sekolah.",
    };
  }

  const existingCp = await db.select().from(schema.capaianPembelajaran).where(eq(schema.capaianPembelajaran.id, cpId));
  if (existingCp.length === 0) {
    return { success: false, message: "Capaian Pembelajaran tidak ditemukan." };
  }

  const prevCp = existingCp[0];
  const newVersion = prevCp.version + 1;

  const [updatedCp] = await db
    .update(schema.capaianPembelajaran)
    .set({
      verificationStatus: rawStatus,
      reviewNotes: reviewNotes || prevCp.reviewNotes,
      approvedById: rawStatus === "approved" ? currentUser.id : null,
      approvedAt: rawStatus === "approved" ? new Date() : null,
      version: newVersion,
      updatedAt: new Date(),
    })
    .where(eq(schema.capaianPembelajaran.id, cpId))
    .returning();

  await recordCurriculumVersion({
    entityType: "cp",
    entityId: cpId,
    versionNumber: newVersion,
    changeType: "status_changed",
    changedById: currentUser.id,
    changedByName: currentUser.name,
    previousSnapshot: prevCp as unknown as Record<string, unknown>,
    currentSnapshot: updatedCp as unknown as Record<string, unknown>,
    changeReason: `Perubahan status CP dari ${prevCp.verificationStatus} menjadi ${rawStatus}: ${reviewNotes || "Tanpa catatan"}`,
  });

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: `CP_STATUS_${rawStatus.toUpperCase()}`,
    targetEntity: "capaian_pembelajaran",
    targetId: cpId,
    details: { previousStatus: prevCp.verificationStatus, newStatus: rawStatus, reviewNotes },
  });

  revalidatePath("/dashboard/kurikulum/cp");
  revalidatePath("/dashboard/kurikulum");

  return {
    success: true,
    message: `Status CP berhasil diperbarui menjadi '${rawStatus}'.`,
    data: updatedCp,
  };
}

// 4. Tambah Tujuan Pembelajaran (TP)
export async function createTujuanPembelajaranAction(formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const rawData = {
    cpId: (formData.get("cpId") as string) || undefined,
    subjectId: formData.get("subjectId") as string,
    phase: formData.get("phase") as "Fase A" | "Fase B" | "Fase C",
    targetGrade: formData.get("targetGrade") ? Number(formData.get("targetGrade")) : undefined,
    code: formData.get("code") as string,
    competency: formData.get("competency") as string,
    contentScope: formData.get("contentScope") as string,
    description: formData.get("description") as string,
    sourceType: (formData.get("sourceType") as "verbatim_source" | "derived_teacher" | "ai_assisted") || "derived_teacher",
  };

  const validation = tujuanPembelajaranSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      message: "Validasi Tujuan Pembelajaran gagal",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  // Cek duplikasi kode TP
  const existingCode = await db.select().from(schema.tujuanPembelajaran).where(eq(schema.tujuanPembelajaran.code, data.code.trim()));
  if (existingCode.length > 0) {
    return {
      success: false,
      message: `Kode TP '${data.code}' sudah terdaftar dalam sistem.`,
    };
  }

  const [newTp] = await db
    .insert(schema.tujuanPembelajaran)
    .values({
      cpId: data.cpId || null,
      subjectId: data.subjectId,
      phase: data.phase,
      targetGrade: data.targetGrade || null,
      code: data.code.trim(),
      competency: data.competency,
      contentScope: data.contentScope,
      description: data.description,
      sourceType: data.sourceType,
      verificationStatus: "draft",
      version: 1,
      createdById: currentUser.id,
    })
    .returning();

  await recordCurriculumVersion({
    entityType: "tp",
    entityId: newTp.id,
    versionNumber: 1,
    changeType: "created",
    changedById: currentUser.id,
    changedByName: currentUser.name,
    currentSnapshot: newTp as unknown as Record<string, unknown>,
    changeReason: "Pembuatan Tujuan Pembelajaran baru",
  });

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "CREATE_TP",
    targetEntity: "tujuan_pembelajaran",
    targetId: newTp.id,
    details: { code: data.code, subjectId: data.subjectId, phase: data.phase },
  });

  revalidatePath("/dashboard/kurikulum/tp");
  revalidatePath("/dashboard/kurikulum");

  return {
    success: true,
    message: `Tujuan Pembelajaran (${data.code}) berhasil disimpan sebagai Draf.`,
    data: newTp,
  };
}

// 5. Persetujuan & Penolakan Status TP
export async function updateTpStatusAction(tpId: string, formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const rawStatus = formData.get("status") as "draft" | "in_review" | "approved" | "rejected";

  if (rawStatus === "approved" && currentUser.role === "teacher") {
    return {
      success: false,
      message: "FORBIDDEN: Guru hanya berwenang mengajukan penelaahan (in_review). Persetujuan resmi wajib oleh Kepala Sekolah.",
    };
  }

  const existingTp = await db.select().from(schema.tujuanPembelajaran).where(eq(schema.tujuanPembelajaran.id, tpId));
  if (existingTp.length === 0) {
    return { success: false, message: "Tujuan Pembelajaran tidak ditemukan." };
  }

  const prevTp = existingTp[0];
  const newVersion = prevTp.version + 1;

  const [updatedTp] = await db
    .update(schema.tujuanPembelajaran)
    .set({
      verificationStatus: rawStatus,
      approvedById: rawStatus === "approved" ? currentUser.id : null,
      approvedAt: rawStatus === "approved" ? new Date() : null,
      version: newVersion,
      updatedAt: new Date(),
    })
    .where(eq(schema.tujuanPembelajaran.id, tpId))
    .returning();

  await recordCurriculumVersion({
    entityType: "tp",
    entityId: tpId,
    versionNumber: newVersion,
    changeType: "status_changed",
    changedById: currentUser.id,
    changedByName: currentUser.name,
    previousSnapshot: prevTp as unknown as Record<string, unknown>,
    currentSnapshot: updatedTp as unknown as Record<string, unknown>,
    changeReason: `Status TP diubah menjadi ${rawStatus}`,
  });

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: `TP_STATUS_${rawStatus.toUpperCase()}`,
    targetEntity: "tujuan_pembelajaran",
    targetId: tpId,
    details: { code: prevTp.code, newStatus: rawStatus },
  });

  revalidatePath("/dashboard/kurikulum/tp");
  revalidatePath("/dashboard/kurikulum");

  return {
    success: true,
    message: `Status TP ${prevTp.code} diubah menjadi '${rawStatus}'.`,
    data: updatedTp,
  };
}

// 6. Buat Alur Tujuan Pembelajaran (ATP Plan)
export async function createAtpPlanAction(formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const rawData = {
    title: formData.get("title") as string,
    subjectId: formData.get("subjectId") as string,
    phase: formData.get("phase") as "Fase A" | "Fase B" | "Fase C",
    academicYear: (formData.get("academicYear") as string) || "2024/2025",
    totalHours: Number(formData.get("totalHours") || 72),
  };

  const validation = atpPlanSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      message: "Validasi rencana ATP gagal",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  const [newAtp] = await db
    .insert(schema.atpPlans)
    .values({
      title: data.title,
      subjectId: data.subjectId,
      phase: data.phase,
      academicYear: data.academicYear,
      totalHours: data.totalHours,
      status: "draft",
      version: 1,
      authorId: currentUser.id,
    })
    .returning();

  await recordCurriculumVersion({
    entityType: "atp",
    entityId: newAtp.id,
    versionNumber: 1,
    changeType: "created",
    changedById: currentUser.id,
    changedByName: currentUser.name,
    currentSnapshot: newAtp as unknown as Record<string, unknown>,
    changeReason: "Penyusunan alur ATP baru",
  });

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "CREATE_ATP_PLAN",
    targetEntity: "atp_plan",
    targetId: newAtp.id,
    details: { title: data.title, subjectId: data.subjectId, phase: data.phase },
  });

  revalidatePath("/dashboard/kurikulum/atp");
  revalidatePath("/dashboard/kurikulum");

  return {
    success: true,
    message: `Rencana ATP '${data.title}' berhasil dibuat sebagai Draf.`,
    data: newAtp,
  };
}

// 7. Tambah Butir Alur TP ke ATP Plan
export async function addAtpItemAction(formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const rawData = {
    atpPlanId: formData.get("atpPlanId") as string,
    tpId: formData.get("tpId") as string,
    sequenceOrder: Number(formData.get("sequenceOrder") || 1),
    allocatedHours: Number(formData.get("allocatedHours") || 4),
    targetGrade: Number(formData.get("targetGrade") || 1),
    semester: (formData.get("semester") as "Ganjil" | "Genap") || "Ganjil",
    multigradeNotes: (formData.get("multigradeNotes") as string) || "",
  };

  const validation = atpItemSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      message: "Validasi butir alur ATP gagal",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  const [newItem] = await db
    .insert(schema.atpItems)
    .values({
      atpPlanId: data.atpPlanId,
      tpId: data.tpId,
      sequenceOrder: data.sequenceOrder,
      allocatedHours: data.allocatedHours,
      targetGrade: data.targetGrade,
      semester: data.semester,
      multigradeNotes: data.multigradeNotes || null,
    })
    .returning();

  revalidatePath("/dashboard/kurikulum/atp");

  return {
    success: true,
    message: `Butir urutan ke-${data.sequenceOrder} (${data.allocatedHours} JP) berhasil ditambahkan ke ATP.`,
    data: newItem,
  };
}

// 8. Ekspor Data Kurikulum (JSON / CSV Format)
export async function exportCurriculumDataAction(subjectId?: string, phase?: string) {
  await requireAuth(["admin", "headmaster", "teacher"]);

  let cpQuery = db.select().from(schema.capaianPembelajaran);
  let tpQuery = db.select().from(schema.tujuanPembelajaran);
  let atpQuery = db.select().from(schema.atpPlans);

  const cps = await cpQuery;
  const tps = await tpQuery;
  const atps = await atpQuery;
  const subjects = await db.select().from(schema.subjects);

  const filteredCps = cps.filter((c) => {
    if (subjectId && c.subjectId !== subjectId) return false;
    if (phase && c.phase !== phase) return false;
    return true;
  });

  const filteredTps = tps.filter((t) => {
    if (subjectId && t.subjectId !== subjectId) return false;
    if (phase && t.phase !== phase) return false;
    return true;
  });

  return {
    exportDate: new Date().toISOString(),
    school: "SDN SEDAENG II Tosari",
    totalCp: filteredCps.length,
    totalTp: filteredTps.length,
    capaianPembelajaran: filteredCps,
    tujuanPembelajaran: filteredTps,
    atpPlans: atps,
  };
}
