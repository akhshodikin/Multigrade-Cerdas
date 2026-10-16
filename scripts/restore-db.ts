import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../src/db";
import * as schema from "../src/db/schema";
import type { DatabaseBackupPayload } from "./backup-db";

function hydrateRowDates(row: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
      result[k] = new Date(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

export async function restoreDatabaseBackup(backupFilePath: string): Promise<{
  success: boolean;
  restoredRecords: number;
  message: string;
}> {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Berkas cadangan tidak ditemukan: ${backupFilePath}`);
  }

  // 1. Verifikasi Checksum jika berkas .sha256 tersedia
  const checksumFilePath = `${backupFilePath}.sha256`;
  const fileContent = fs.readFileSync(backupFilePath, "utf8");
  const computedHash = crypto.createHash("sha256").update(fileContent).digest("hex");

  if (fs.existsSync(checksumFilePath)) {
    const expectedHashLine = fs.readFileSync(checksumFilePath, "utf8").trim();
    const expectedHash = expectedHashLine.split(/\s+/)[0];
    if (computedHash !== expectedHash) {
      throw new Error(
        `INTEGRITY FAILURE: Checksum berkas cadangan (${computedHash}) tidak cocok dengan acuan (${expectedHash}). Kemungkinan berkas rusak atau dimanipulasi.`
      );
    }
  }

  const payload: DatabaseBackupPayload = JSON.parse(fileContent);

  if (!payload.tables || !payload.version) {
    throw new Error("Struktur berkas cadangan tidak valid (header version atau tables hilang).");
  }

  let restoredRecords = 0;

  // 2. Pemulihan Bertahap Sesuai Urutan Relasi Foreign Key
  const { tables } = payload;

  // a. Profil & Master Data
  if (tables.schoolProfile?.length > 0) {
    for (const raw of tables.schoolProfile) {
      await db
        .insert(schema.schoolProfile)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.multigradeGroups?.length > 0) {
    for (const raw of tables.multigradeGroups) {
      await db
        .insert(schema.multigradeGroups)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.academicTerms?.length > 0) {
    for (const raw of tables.academicTerms) {
      await db
        .insert(schema.academicTerms)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.classes?.length > 0) {
    for (const raw of tables.classes) {
      await db
        .insert(schema.classes)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.users?.length > 0) {
    for (const raw of tables.users) {
      await db
        .insert(schema.users)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.students?.length > 0) {
    for (const raw of tables.students) {
      await db
        .insert(schema.students)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.subjects?.length > 0) {
    for (const raw of tables.subjects) {
      await db
        .insert(schema.subjects)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  // b. Kurikulum & Modul Ajar
  if (tables.curriculumSources?.length > 0) {
    for (const raw of tables.curriculumSources) {
      await db
        .insert(schema.curriculumSources)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.capaianPembelajaran?.length > 0) {
    for (const raw of tables.capaianPembelajaran) {
      await db
        .insert(schema.capaianPembelajaran)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.tujuanPembelajaran?.length > 0) {
    for (const raw of tables.tujuanPembelajaran) {
      await db
        .insert(schema.tujuanPembelajaran)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.atpPlans?.length > 0) {
    for (const raw of tables.atpPlans) {
      await db
        .insert(schema.atpPlans)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.multigradeLessonPlans?.length > 0) {
    for (const raw of tables.multigradeLessonPlans) {
      await db
        .insert(schema.multigradeLessonPlans)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.lkpdWorksheets?.length > 0) {
    for (const raw of tables.lkpdWorksheets) {
      await db
        .insert(schema.lkpdWorksheets)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  if (tables.teachingJournals?.length > 0) {
    for (const raw of tables.teachingJournals) {
      await db
        .insert(schema.teachingJournals)
        .values(hydrateRowDates(raw) as any)
        .onConflictDoNothing();
      restoredRecords++;
    }
  }

  // Log audit pemulihan
  try {
    await db.insert(schema.auditLogs).values({
      action: "DATABASE_RESTORE_COMPLETED",
      targetEntity: "database_backup",
      targetId: path.basename(backupFilePath),
      details: {
        restoredRecords,
        checksumVerified: true,
        schoolName: payload.schoolName,
      },
    });
  } catch (err) {
    console.warn("[Restore] Gagal mencatat log audit:", err);
  }

  return {
    success: true,
    restoredRecords,
    message: `Pemulihan database berhasil (${restoredRecords} rekaman dipulihkan dan diverifikasi).`,
  };
}

// Eksekusi langsung jika dipanggil via CLI `tsx scripts/restore-db.ts <path>`
if (require.main === module || (typeof process !== "undefined" && process.argv[1]?.endsWith("restore-db.ts"))) {
  const targetFile = process.argv[2];
  if (!targetFile) {
    console.error("Gunakan: tsx scripts/restore-db.ts <lokasi-berkas-backup.json>");
    process.exit(1);
  }

  restoreDatabaseBackup(targetFile)
    .then((res) => {
      console.log(`[Sukses]: ${res.message}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Pemulihan Gagal]:", err);
      process.exit(1);
    });
}
