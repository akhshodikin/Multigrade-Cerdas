"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { loginSchema } from "@/lib/validations";
import { createSession, destroyCurrentSession, verifyPassword } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/audit/logger";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData): Promise<void> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  const validation = loginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });

  if (!validation.success) {
    redirect("/login?error=Data yang dimasukkan tidak valid.");
  }

  const { email, password } = validation.data;

  const users = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase().trim()));
  if (users.length === 0) {
    redirect("/login?error=Email atau kata sandi tidak cocok.");
  }

  const user = users[0];
  if (!user.isActive) {
    redirect("/login?error=Akun ini telah dinonaktifkan oleh Administrator.");
  }

  const passwordMatch = await verifyPassword(password, user.passwordHash);
  if (!passwordMatch) {
    redirect("/login?error=Email atau kata sandi tidak cocok.");
  }

  await createSession(user.id);

  await recordAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "LOGIN",
    targetEntity: "user",
    targetId: user.id,
    details: { email: user.email, role: user.role },
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}
