import { db } from "@/db";
import * as schema from "@/db/schema";

export interface AuditLogParams {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  targetEntity: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function recordAuditLog(params: AuditLogParams) {
  try {
    await db.insert(schema.auditLogs).values({
      userId: params.userId || null,
      userName: params.userName || null,
      userRole: params.userRole || null,
      action: params.action,
      targetEntity: params.targetEntity,
      targetId: params.targetId || null,
      details: params.details || {},
      ipAddress: params.ipAddress || null,
    });
  } catch (error) {
    console.error("Gagal mencatat audit log:", error);
  }
}
