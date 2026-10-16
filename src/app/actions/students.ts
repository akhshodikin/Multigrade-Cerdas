"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/audit/logger";
import { studentSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { getGroupIdForClass } from "@/lib/multigrade";

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
