"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, hashPassword } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/audit/logger";
import { userSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: FormData) {
  const currentUser = await requireAuth(["admin"]);

  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    nip: formData.get("nip") || "",
    phone: formData.get("phone") || "",
    assignedGroupId: formData.get("assignedGroupId") || null,
    isActive: formData.get("isActive") !== "false",
  };

  const validation = userSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      message: "Validasi data gagal",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  // Cek apakah email sudah ada
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, data.email.toLowerCase().trim()));
  if (existing.length > 0) {
    return {
      success: false,
      message: "Email tersebut sudah terdaftar.",
    };
  }

  const passwordHash = await hashPassword(data.password || "Sedaeng2#Tosari");

  const [newUser] = await db
    .insert(schema.users)
    .values({
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role,
      nip: data.nip || null,
      phone: data.phone || null,
      assignedGroupId: data.assignedGroupId || null,
      isActive: data.isActive,
    })
    .returning();

  // Jika guru ditugaskan sebagai pengampu kelompok, perbarui juga multigrade_groups
  if (data.assignedGroupId && data.role === "teacher") {
    await db
      .update(schema.multigradeGroups)
      .set({ leadTeacherId: newUser.id })
      .where(eq(schema.multigradeGroups.id, data.assignedGroupId));
  }

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "CREATE_USER",
    targetEntity: "user",
    targetId: newUser.id,
    details: { name: newUser.name, email: newUser.email, role: newUser.role, assignedGroupId: data.assignedGroupId },
  });

  revalidatePath("/dashboard/guru");
  revalidatePath("/dashboard/kelompok");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Data ${data.role === "teacher" ? "Guru" : "Pengguna"} berhasil ditambahkan.`,
  };
}

export async function updateUserAction(userId: string, formData: FormData) {
  const currentUser = await requireAuth(["admin", "headmaster"]);

  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    nip: formData.get("nip") || "",
    phone: formData.get("phone") || "",
    assignedGroupId: formData.get("assignedGroupId") || null,
    isActive: formData.get("isActive") !== "false",
  };

  const validation = userSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      message: "Validasi data gagal",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  // Hanya admin yang boleh mengubah peran user
  if (currentUser.role !== "admin") {
    const existing = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    if (existing.length > 0 && existing[0].role !== data.role) {
      return { success: false, message: "Hanya Administrator yang dapat mengubah peran pengguna." };
    }
  }

  await db
    .update(schema.users)
    .set({
      name: data.name,
      nip: data.nip || null,
      phone: data.phone || null,
      assignedGroupId: data.assignedGroupId || null,
      isActive: data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  // Tautkan guru ke kelompok multigrade jika ada penugasan
  if (data.assignedGroupId && data.role === "teacher") {
    await db
      .update(schema.multigradeGroups)
      .set({ leadTeacherId: userId })
      .where(eq(schema.multigradeGroups.id, data.assignedGroupId));
  }

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "UPDATE_USER",
    targetEntity: "user",
    targetId: userId,
    details: { name: data.name, role: data.role, assignedGroupId: data.assignedGroupId },
  });

  revalidatePath("/dashboard/guru");
  revalidatePath("/dashboard/kelompok");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Data pengguna berhasil diperbarui.",
  };
}

export async function toggleUserStatusAction(userId: string, currentStatus: boolean) {
  const currentUser = await requireAuth(["admin"]);

  if (userId === currentUser.id) {
    return { success: false, message: "Anda tidak dapat menonaktifkan akun sendiri." };
  }

  await db
    .update(schema.users)
    .set({
      isActive: !currentStatus,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "TOGGLE_USER_STATUS",
    targetEntity: "user",
    targetId: userId,
    details: { newStatus: !currentStatus },
  });

  revalidatePath("/dashboard/guru");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Status akun berhasil diubah menjadi ${!currentStatus ? "Aktif" : "Nonaktif"}.`,
  };
}
