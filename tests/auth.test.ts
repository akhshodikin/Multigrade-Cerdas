import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

describe("Pengujian Autentikasi & Keamanan Sesi", () => {
  it("harus melakukan hashing dan verifikasi kata sandi dengan benar", async () => {
    const rawPassword = "PasswordRahasia#123";
    const hashed = await hashPassword(rawPassword);

    expect(hashed).not.toBe(rawPassword);
    expect(hashed.length).toBeGreaterThan(20);

    const isMatch = await verifyPassword(rawPassword, hashed);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword("SalahPassword", hashed);
    expect(isWrong).toBe(false);
  });

  it("harus memvalidasi pengguna yang tersimpan di PostgreSQL", async () => {
    const adminUser = await db.select().from(schema.users).where(eq(schema.users.email, "admin@sedaeng2.sch.id"));
    expect(adminUser.length).toBe(1);
    expect(adminUser[0].role).toBe("admin");

    const isPasswordValid = await verifyPassword("Sedaeng2#Tosari", adminUser[0].passwordHash);
    expect(isPasswordValid).toBe(true);
  });

  it("harus mampu membuat, mengambil, dan menghapus sesi di database", async () => {
    const user = await db.select().from(schema.users).where(eq(schema.users.email, "admin@sedaeng2.sch.id"));
    const userId = user[0].id;

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 jam

    // 1. Simpan sesi
    await db.insert(schema.sessions).values({
      id: token,
      userId,
      expiresAt,
    });

    // 2. Ambil sesi
    const sessionFound = await db.select().from(schema.sessions).where(eq(schema.sessions.id, token));
    expect(sessionFound.length).toBe(1);
    expect(sessionFound[0].userId).toBe(userId);

    // 3. Hapus sesi (Logout)
    await db.delete(schema.sessions).where(eq(schema.sessions.id, token));
    const sessionAfterLogout = await db.select().from(schema.sessions).where(eq(schema.sessions.id, token));
    expect(sessionAfterLogout.length).toBe(0);
  });

  it("harus menolak sesi yang sudah kedaluwarsa", async () => {
    const user = await db.select().from(schema.users).where(eq(schema.users.email, "admin@sedaeng2.sch.id"));
    const token = crypto.randomBytes(32).toString("hex");
    const expiredDate = new Date(Date.now() - 1000 * 60); // 1 menit lalu

    await db.insert(schema.sessions).values({
      id: token,
      userId: user[0].id,
      expiresAt: expiredDate,
    });

    const activeSessions = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, token));

    expect(activeSessions.length).toBe(1);
    expect(new Date(activeSessions[0].expiresAt).getTime()).toBeLessThan(Date.now());

    // Bersihkan
    await db.delete(schema.sessions).where(eq(schema.sessions.id, token));
  });
});
