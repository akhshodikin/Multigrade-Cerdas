import { describe, it, expect } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/logger";
import { eq, desc } from "drizzle-orm";

describe("Pengujian Audit Log & Proteksi Akses", () => {
  it("harus mencatat mutasi data penting ke dalam tabel audit_logs", async () => {
    const testAction = "TEST_INTEGRATION_MUTATION";

    await recordAuditLog({
      userId: null,
      userName: "Sistem Penguji",
      userRole: "admin",
      action: testAction,
      targetEntity: "test_entity",
      targetId: "test-123",
      details: { catatan: "Pengujian integritas log audit" },
    });

    const recorded = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, testAction))
      .orderBy(desc(schema.auditLogs.createdAt));

    expect(recorded.length).toBeGreaterThanOrEqual(1);
    expect(recorded[0].userName).toBe("Sistem Penguji");
    expect(recorded[0].targetEntity).toBe("test_entity");

    // Bersihkan rekod pengujian
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.action, testAction));
  });

  it("harus menolak duplikasi email pengguna", async () => {
    let errorCaught = false;
    try {
      await db.insert(schema.users).values({
        name: "Pengguna Duplikat",
        email: "admin@sedaeng2.sch.id", // Email yang sudah ada
        passwordHash: "hash",
        role: "admin",
      });
    } catch {
      errorCaught = true;
    }
    expect(errorCaught).toBe(true);
  });
});
