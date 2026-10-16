"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, hashPassword } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/audit/logger";
import { userSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { parseUsersXlsx } from "@/lib/excel/users-excel";

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

export async function toggleUserStatusFormAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId"));
  const currentStatus = formData.get("currentStatus") === "true";
  await toggleUserStatusAction(userId, currentStatus);
}

export async function createUserFormAction(formData: FormData): Promise<void> {
  await createUserAction(formData);
}

export async function importUsersFromXlsxAction(formData: FormData) {
  const currentUser = await requireAuth(["admin"]);

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

  const { validRows, errors } = parseUsersXlsx(buffer);

  if (errors.length > 0 && validRows.length === 0) {
    return { success: false, message: "Gagal memproses berkas Excel.", errors };
  }

  if (validRows.length === 0) {
    return { success: false, message: "Tidak ada baris data guru/staf yang valid ditemukan dalam berkas." };
  }

  let insertedCount = 0;
  let updatedCount = 0;

  for (const row of validRows) {
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, row.email.toLowerCase().trim()));

    if (existing.length > 0) {
      await db
        .update(schema.users)
        .set({
          name: row.name,
          role: row.role,
          nip: row.nip || existing[0].nip,
          phone: row.phone || existing[0].phone,
          assignedGroupId: row.assignedGroupId !== undefined ? row.assignedGroupId : existing[0].assignedGroupId,
          isActive: row.isActive,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.email, row.email.toLowerCase().trim()));

      if (row.assignedGroupId && row.role === "teacher") {
        await db
          .update(schema.multigradeGroups)
          .set({ leadTeacherId: existing[0].id })
          .where(eq(schema.multigradeGroups.id, row.assignedGroupId));
      }

      updatedCount++;
    } else {
      const passwordHash = await hashPassword(row.initialPassword || "Sedaeng2#Tosari");
      const [newUser] = await db
        .insert(schema.users)
        .values({
          name: row.name,
          email: row.email.toLowerCase().trim(),
          passwordHash,
          role: row.role,
          nip: row.nip || null,
          phone: row.phone || null,
          assignedGroupId: row.assignedGroupId || null,
          isActive: row.isActive,
        })
        .returning();

      if (row.assignedGroupId && row.role === "teacher") {
        await db
          .update(schema.multigradeGroups)
          .set({ leadTeacherId: newUser.id })
          .where(eq(schema.multigradeGroups.id, row.assignedGroupId));
      }

      insertedCount++;
    }
  }

  await recordAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: "IMPORT_USERS_XLSX",
    targetEntity: "user",
    details: {
      fileName: file.name,
      totalRows: validRows.length,
      insertedCount,
      updatedCount,
      warningErrors: errors,
    },
  });

  revalidatePath("/dashboard/guru");
  revalidatePath("/dashboard/kelompok");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Berhasil memproses ${validRows.length} data pendidik/staf (${insertedCount} pengguna baru, ${updatedCount} diperbarui).`,
    count: validRows.length,
    insertedCount,
    updatedCount,
    warnings: errors.length > 0 ? errors : undefined,
  };
}
