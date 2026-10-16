import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { UserRole } from "@/lib/validations";
import { recordAuditLog } from "@/lib/audit/logger";

const SESSION_COOKIE_NAME = "multigrade_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 hari

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.insert(schema.sessions).values({
    id: token,
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return token;
}

export async function destroyCurrentSession(): Promise<void> {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return;
  }
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const sessionRecord = await db.select().from(schema.sessions).where(eq(schema.sessions.id, token));
    if (sessionRecord.length > 0) {
      const user = await db.select().from(schema.users).where(eq(schema.users.id, sessionRecord[0].userId));
      if (user.length > 0) {
        await recordAuditLog({
          userId: user[0].id,
          userName: user[0].name,
          userRole: user[0].role,
          action: "LOGOUT",
          targetEntity: "session",
          targetId: token,
          details: { message: "Pengguna berhasil keluar" },
        });
      }
      await db.delete(schema.sessions).where(eq(schema.sessions.id, token));
    }
    try {
      cookieStore.delete(SESSION_COOKIE_NAME);
    } catch {
      // In case destroyCurrentSession is called in a context where cookies cannot be mutated
    }
  }
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedGroupId: string | null;
  nip: string | null;
  phone: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return null;
  }
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const now = new Date();
  const activeSessions = await db
    .select({
      sessionId: schema.sessions.id,
      user: schema.users,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.id, token), gt(schema.sessions.expiresAt, now)));

  if (activeSessions.length === 0) {
    try {
      cookieStore.delete(SESSION_COOKIE_NAME);
    } catch {
      // In Next.js App Router Server Components, cookies cannot be modified during render phase.
      // Ignoring this error is safe as returning null correctly signals unauthenticated state.
    }
    return null;
  }

  const user = activeSessions[0].user;
  if (!user.isActive) {
    try {
      cookieStore.delete(SESSION_COOKIE_NAME);
    } catch {
      // Ignore cookie deletion error in Server Component render phase.
    }
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    assignedGroupId: user.assignedGroupId,
    nip: user.nip,
    phone: user.phone,
  };
}

export async function requireAuth(allowedRoles?: UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHORIZED: Anda harus masuk terlebih dahulu.");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Peran '${user.role}' tidak memiliki izin untuk tindakan ini.`);
  }

  return user;
}
