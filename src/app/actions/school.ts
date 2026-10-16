"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/audit/logger";
import { schoolProfileSchema, academicTermSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function updateSchoolProfileAction(formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster"]);

  const rawData = {
    name: formData.get("name"),
    npsn: formData.get("npsn"),
    address: formData.get("address"),
    headmasterName: formData.get("headmasterName"),
    headmasterNip: formData.get("headmasterNip") || "",
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    activeAcademicYear: formData.get("activeAcademicYear"),
    activeSemester: formData.get("activeSemester"),
  };

  const validation = schoolProfileSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      message: "Validasi gagal",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  await db
    .update(schema.schoolProfile)
    .set({
      name: data.name,
      npsn: data.npsn,
      address: data.address,
      headmasterName: data.headmasterName,
      headmasterNip: data.headmasterNip,
      phone: data.phone,
      email: data.email,
      activeAcademicYear: data.activeAcademicYear,
      activeSemester: data.activeSemester,
      updatedAt: new Date(),
    })
    .where(eq(schema.schoolProfile.id, 1));

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "UPDATE_SCHOOL_PROFILE",
    targetEntity: "school_profile",
    targetId: "1",
    details: data,
  });

  revalidatePath("/dashboard/profil-sekolah");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Profil SDN SEDAENG II Tosari berhasil diperbarui.",
  };
}

export async function createAcademicTermAction(formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster"]);

  const rawData = {
    year: formData.get("year"),
    semester: formData.get("semester"),
    isActive: formData.get("isActive") === "true",
    startDate: formData.get("startDate") || "",
    endDate: formData.get("endDate") || "",
  };

  const validation = academicTermSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      message: "Validasi gagal",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  if (data.isActive) {
    // Nonaktifkan term lainnya
    await db.update(schema.academicTerms).set({ isActive: false });
    // Perbarui profil sekolah
    await db
      .update(schema.schoolProfile)
      .set({
        activeAcademicYear: data.year,
        activeSemester: data.semester,
        updatedAt: new Date(),
      })
      .where(eq(schema.schoolProfile.id, 1));
  }

  const [newTerm] = await db
    .insert(schema.academicTerms)
    .values({
      year: data.year,
      semester: data.semester,
      isActive: data.isActive,
      startDate: data.startDate,
      endDate: data.endDate,
    })
    .returning();

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "CREATE_ACADEMIC_TERM",
    targetEntity: "academic_term",
    targetId: newTerm.id,
    details: data,
  });

  revalidatePath("/dashboard/pengaturan-semester");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Tahun ajaran berhasil ditambahkan.",
  };
}

export async function setActiveAcademicTermAction(termId: string) {
  const currentUser = await requireAuth(["admin", "headmaster"]);

  const term = await db.select().from(schema.academicTerms).where(eq(schema.academicTerms.id, termId));
  if (term.length === 0) {
    return { success: false, message: "Tahun ajaran tidak ditemukan." };
  }

  // Nonaktifkan semua term lain
  await db.update(schema.academicTerms).set({ isActive: false });

  // Aktifkan term ini
  await db.update(schema.academicTerms).set({ isActive: true }).where(eq(schema.academicTerms.id, termId));

  // Sinkronkan profil sekolah
  await db
    .update(schema.schoolProfile)
    .set({
      activeAcademicYear: term[0].year,
      activeSemester: term[0].semester,
      updatedAt: new Date(),
    })
    .where(eq(schema.schoolProfile.id, 1));

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "ACTIVATE_ACADEMIC_TERM",
    targetEntity: "academic_term",
    targetId: termId,
    details: { year: term[0].year, semester: term[0].semester },
  });

  revalidatePath("/dashboard/pengaturan-semester");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Tahun ajaran ${term[0].year} (${term[0].semester}) kini aktif.`,
  };
}
