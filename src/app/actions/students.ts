"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/audit/logger";
import { studentSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { getGroupIdForClass } from "@/lib/multigrade";
import { parseStudentsXlsx } from "@/lib/excel/students-excel";

export async function createStudentAction(formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const rawClassId = Number(formData.get("classId"));
  const computedGroupId = getGroupIdForClass(rawClassId);

  // Jika guru, pastikan guru hanya menambah siswa ke kelompok pengampuannya (kecuali admin/kepsek)
  if (currentUser.role === "teacher" && currentUser.assignedGroupId && currentUser.assignedGroupId !== computedGroupId) {
    return {
      success: false,
      message: `FORBIDDEN: Sebagai pengampu ${currentUser.assignedGroupId}, Anda hanya diizinkan mengelola siswa kelompok Anda.`,
    };
  }

  const rawData = {
    studentCode: formData.get("studentCode"),
    displayName: formData.get("displayName"),
    fullName: formData.get("fullName"),
    classId: rawClassId,
    groupId: computedGroupId,
    gender: formData.get("gender"),
    birthDate: formData.get("birthDate") || "",
    guardianName: formData.get("guardianName") || "",
    isActive: formData.get("isActive") !== "false",
    notes: formData.get("notes") || "",
  };

  const validation = studentSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      message: "Validasi data siswa gagal",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  // Cek keunikan kode siswa
  const existing = await db.select().from(schema.students).where(eq(schema.students.studentCode, data.studentCode));
  if (existing.length > 0) {
    return {
      success: false,
      message: `Kode siswa '${data.studentCode}' sudah digunakan.`,
    };
  }

  const [newStudent] = await db
    .insert(schema.students)
    .values({
      studentCode: data.studentCode,
      displayName: data.displayName,
      fullName: data.fullName,
      classId: data.classId,
      groupId: data.groupId,
      gender: data.gender,
      birthDate: data.birthDate || null,
      guardianName: data.guardianName || null,
      isActive: data.isActive,
      notes: data.notes || null,
    })
    .returning();

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "CREATE_STUDENT",
    targetEntity: "student",
    targetId: newStudent.id,
    details: { studentCode: data.studentCode, classId: data.classId, groupId: data.groupId },
  });

  revalidatePath("/dashboard/siswa");
  revalidatePath("/dashboard/kelompok");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Siswa ${data.displayName} (${data.studentCode}) berhasil didaftarkan ke Kelas ${data.classId} (${data.groupId.toUpperCase()}).`,
  };
}

export async function updateStudentAction(studentId: string, formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const existingStudent = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (existingStudent.length === 0) {
    return { success: false, message: "Data siswa tidak ditemukan." };
  }

  const rawClassId = Number(formData.get("classId"));
  const computedGroupId = getGroupIdForClass(rawClassId);

  // Jika guru, pastikan tidak memodifikasi siswa di luar kelompoknya
  if (currentUser.role === "teacher" && currentUser.assignedGroupId) {
    if (existingStudent[0].groupId !== currentUser.assignedGroupId && computedGroupId !== currentUser.assignedGroupId) {
      return {
        success: false,
        message: "FORBIDDEN: Anda tidak memiliki akses untuk mengubah data siswa kelompok lain.",
      };
    }
  }

  const rawData = {
    studentCode: formData.get("studentCode"),
    displayName: formData.get("displayName"),
    fullName: formData.get("fullName"),
    classId: rawClassId,
    groupId: computedGroupId,
    gender: formData.get("gender"),
    birthDate: formData.get("birthDate") || "",
    guardianName: formData.get("guardianName") || "",
    isActive: formData.get("isActive") !== "false",
    notes: formData.get("notes") || "",
  };

  const validation = studentSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      message: "Validasi data siswa gagal",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  // Cek jika kode siswa diubah dan bentrok
  if (data.studentCode !== existingStudent[0].studentCode) {
    const codeCheck = await db.select().from(schema.students).where(eq(schema.students.studentCode, data.studentCode));
    if (codeCheck.length > 0) {
      return { success: false, message: `Kode siswa '${data.studentCode}' sudah terpakai.` };
    }
  }

  await db
    .update(schema.students)
    .set({
      studentCode: data.studentCode,
      displayName: data.displayName,
      fullName: data.fullName,
      classId: data.classId,
      groupId: data.groupId,
      gender: data.gender,
      birthDate: data.birthDate || null,
      guardianName: data.guardianName || null,
      isActive: data.isActive,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.students.id, studentId));

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "UPDATE_STUDENT",
    targetEntity: "student",
    targetId: studentId,
    details: { studentCode: data.studentCode, classId: data.classId, groupId: data.groupId },
  });

  revalidatePath("/dashboard/siswa");
  revalidatePath("/dashboard/kelompok");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Data siswa berhasil diperbarui.",
  };
}

export async function toggleStudentStatusAction(studentId: string, currentStatus: boolean) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const student = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (student.length === 0) {
    return { success: false, message: "Siswa tidak ditemukan." };
  }

  if (currentUser.role === "teacher" && currentUser.assignedGroupId && student[0].groupId !== currentUser.assignedGroupId) {
    return { success: false, message: "FORBIDDEN: Anda tidak dapat mengubah status siswa kelompok lain." };
  }

  await db
    .update(schema.students)
    .set({
      isActive: !currentStatus,
      updatedAt: new Date(),
    })
    .where(eq(schema.students.id, studentId));

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "TOGGLE_STUDENT_STATUS",
    targetEntity: "student",
    targetId: studentId,
    details: { studentCode: student[0].studentCode, newStatus: !currentStatus },
  });

  revalidatePath("/dashboard/siswa");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Status siswa berhasil diubah menjadi ${!currentStatus ? "Aktif" : "Nonaktif"}.`,
  };
}

export async function toggleStudentStatusFormAction(formData: FormData): Promise<void> {
  const studentId = String(formData.get("studentId"));
  const currentStatus = formData.get("currentStatus") === "true";
  await toggleStudentStatusAction(studentId, currentStatus);
}

export async function createStudentFormAction(formData: FormData): Promise<void> {
  await createStudentAction(formData);
}

export async function importStudentsFromXlsxAction(formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, message: "Berkas Excel belum dipilih atau kosong." };
  }

  // Batas ukuran 15 MB
  const MAX_FILE_SIZE = 15 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, message: "Ukuran berkas melebihi batas maksimal 15 MB." };
  }

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
    return { success: false, message: "Format berkas tidak valid. Harap unggah berkas Excel (.xlsx atau .xls)." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { validRows, errors } = parseStudentsXlsx(buffer);

  if (errors.length > 0 && validRows.length === 0) {
    return { success: false, message: "Gagal memproses berkas Excel.", errors };
  }

  if (validRows.length === 0) {
    return { success: false, message: "Tidak ada baris data siswa yang valid ditemukan dalam berkas." };
  }

  // Jika guru, pastikan semua siswa yang diimpor sesuai dengan kelompok penugasannya
  if (currentUser.role === "teacher" && currentUser.assignedGroupId) {
    const invalidGroupRow = validRows.find((r) => r.groupId !== currentUser.assignedGroupId);
    if (invalidGroupRow) {
      return {
        success: false,
        message: `FORBIDDEN: Anda hanya berwenang mengelola siswa ${currentUser.assignedGroupId}. Baris siswa '${invalidGroupRow.studentCode}' (${invalidGroupRow.fullName}) berada di ${invalidGroupRow.groupId}.`,
      };
    }
  }

  let insertedCount = 0;
  let updatedCount = 0;

  for (const row of validRows) {
    const existing = await db
      .select()
      .from(schema.students)
      .where(eq(schema.students.studentCode, row.studentCode));

    if (existing.length > 0) {
      await db
        .update(schema.students)
        .set({
          fullName: row.fullName,
          displayName: row.displayName,
          classId: row.classId,
          groupId: row.groupId,
          gender: row.gender,
          birthDate: row.birthDate || existing[0].birthDate,
          guardianName: row.guardianName || existing[0].guardianName,
          isActive: row.isActive,
          notes: row.notes || existing[0].notes,
          updatedAt: new Date(),
        })
        .where(eq(schema.students.studentCode, row.studentCode));
      updatedCount++;
    } else {
      await db.insert(schema.students).values({
        studentCode: row.studentCode,
        fullName: row.fullName,
        displayName: row.displayName,
        classId: row.classId,
        groupId: row.groupId,
        gender: row.gender,
        birthDate: row.birthDate || null,
        guardianName: row.guardianName || null,
        isActive: row.isActive,
        notes: row.notes || null,
      });
      insertedCount++;
    }
  }

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "IMPORT_STUDENTS_XLSX",
    targetEntity: "student",
    details: {
      fileName: file.name,
      totalRows: validRows.length,
      insertedCount,
      updatedCount,
      warningErrors: errors,
    },
  });

  revalidatePath("/dashboard/siswa");
  revalidatePath("/dashboard/kelompok");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Berhasil memproses ${validRows.length} data siswa (${insertedCount} siswa baru ditambahkan, ${updatedCount} siswa diperbarui).`,
    count: validRows.length,
    insertedCount,
    updatedCount,
    warnings: errors.length > 0 ? errors : undefined,
  };
}
