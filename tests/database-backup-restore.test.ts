import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createDatabaseBackup } from "../scripts/backup-db";
import { restoreDatabaseBackup } from "../scripts/restore-db";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";

describe("Pengujian Pencadangan & Pemulihan Database Multigrade Cerdas AI (SDN Kandangan I Tosari)", () => {
  let createdBackupPath: string;
  let createdChecksumPath: string;

  it("1. harus membuat berkas backup JSON dan berkas checksum SHA-256 secara lengkap", async () => {
    const testBackupDir = path.join(process.cwd(), "backups", "test-run");
    const result = await createDatabaseBackup(testBackupDir);

    expect(result.backupFilePath).toBeDefined();
    expect(fs.existsSync(result.backupFilePath)).toBe(true);
    expect(fs.existsSync(result.checksumFilePath)).toBe(true);
    expect(result.totalRecords).toBeGreaterThan(0);

    createdBackupPath = result.backupFilePath;
    createdChecksumPath = result.checksumFilePath;

    // Verifikasi isi berkas backup
    const rawContent = fs.readFileSync(createdBackupPath, "utf8");
    const parsed = JSON.parse(rawContent);

    expect(parsed.version).toBe(1);
    expect(parsed.schoolName).toBe("SDN Kandangan I Tosari");
    expect(parsed.npsn).toBe("20519069");
    expect(parsed.tables).toBeDefined();
    expect(parsed.tables.students.length).toBeGreaterThan(0);
    expect(parsed.tables.users.length).toBeGreaterThan(0);
  });

  it("2. harus memvalidasi kesesuaian checksum SHA-256 dengan berkas aktual", () => {
    const rawContent = fs.readFileSync(createdBackupPath, "utf8");
    const computedHash = crypto.createHash("sha256").update(rawContent).digest("hex");

    const checksumContent = fs.readFileSync(createdChecksumPath, "utf8").trim();
    const storedHash = checksumContent.split(/\s+/)[0];

    expect(computedHash).toBe(storedHash);
  });

  it("3. harus menolak pemulihan jika berkas backup rusak atau checksum tidak cocok (Integrity Protection)", async () => {
    // Buat berkas backup tiruan yang diubah isinya (tampered)
    const tamperedPath = `${createdBackupPath}.tampered.json`;
    const tamperedChecksumPath = `${tamperedPath}.sha256`;

    fs.writeFileSync(tamperedPath, '{"version": 1, "tables": {}, "tampered": true}', "utf8");
    // Berikan checksum yang sengaja salah
    fs.writeFileSync(tamperedChecksumPath, "deadbeef1234567890abcdef  fake.json\n", "utf8");

    await expect(restoreDatabaseBackup(tamperedPath)).rejects.toThrow(/INTEGRITY FAILURE/i);

    // Bersihkan berkas uji coba
    if (fs.existsSync(tamperedPath)) fs.unlinkSync(tamperedPath);
    if (fs.existsSync(tamperedChecksumPath)) fs.unlinkSync(tamperedChecksumPath);
  });

  it("4. harus berhasil memulihkan database dari berkas backup yang valid", async () => {
    const restoreResult = await restoreDatabaseBackup(createdBackupPath);

    expect(restoreResult.success).toBe(true);
    expect(restoreResult.restoredRecords).toBeGreaterThan(0);
    expect(restoreResult.message).toContain("berhasil");
  });

  it("5. harus mencatat log audit transaksi pencadangan dan pemulihan ke tabel audit_logs", async () => {
    const recentAuditLogs = await db.query.auditLogs.findMany({
      orderBy: [desc(schema.auditLogs.createdAt)],
      limit: 10,
    });

    const hasBackupLog = recentAuditLogs.some(
      (log) => log.action === "DATABASE_BACKUP_CREATED"
    );
    const hasRestoreLog = recentAuditLogs.some(
      (log) => log.action === "DATABASE_RESTORE_COMPLETED"
    );

    expect(hasBackupLog).toBe(true);
    expect(hasRestoreLog).toBe(true);

    // Bersihkan berkas uji coba setelah seluruh tes selesai
    if (fs.existsSync(createdBackupPath)) fs.unlinkSync(createdBackupPath);
    if (fs.existsSync(createdChecksumPath)) fs.unlinkSync(createdChecksumPath);
  });
});
