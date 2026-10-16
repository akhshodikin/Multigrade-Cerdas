import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../src/db";
import * as schema from "../src/db/schema";

export interface DatabaseBackupPayload {
  version: number;
  schoolName: string;
  npsn: string;
  exportedAt: string;
  tables: {
    schoolProfile: any[];
    academicTerms: any[];
    multigradeGroups: any[];
    classes: any[];
    users: any[];
    students: any[];
    auditLogs: any[];
    subjects: any[];
    curriculumSources: any[];
    capaianPembelajaran: any[];
    tujuanPembelajaran: any[];
    atpPlans: any[];
    atpItems: any[];
    multigradeLessonPlans: any[];
    assessments: any[];
    studentAssessmentResults: any[];
    schoolAssessmentCriteria: any[];
    offlineSyncLogs: any[];
    multigradeMaterialMaps: any[];
    lkpdWorksheets: any[];
    learningMediaItems: any[];
    teachingJournals: any[];
    reportExportHistory: any[];
  };
  checksums: Record<string, string>;
}

export async function createDatabaseBackup(customBackupDir?: string): Promise<{
  backupFilePath: string;
  checksumFilePath: string;
  totalRecords: number;
}> {
  const backupDir = customBackupDir || path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Ambil data dari seluruh tabel sistem
  const tables = {
    schoolProfile: await db.query.schoolProfile.findMany(),
    academicTerms: await db.query.academicTerms.findMany(),
    multigradeGroups: await db.query.multigradeGroups.findMany(),
    classes: await db.query.classes.findMany(),
    users: await db.query.users.findMany(),
    students: await db.query.students.findMany(),
    auditLogs: await db.query.auditLogs.findMany(),
    subjects: await db.query.subjects.findMany(),
    curriculumSources: await db.query.curriculumSources.findMany(),
    capaianPembelajaran: await db.query.capaianPembelajaran.findMany(),
    tujuanPembelajaran: await db.query.tujuanPembelajaran.findMany(),
    atpPlans: await db.query.atpPlans.findMany(),
    atpItems: await db.query.atpItems.findMany(),
    multigradeLessonPlans: await db.query.multigradeLessonPlans.findMany(),
    assessments: await db.query.assessments.findMany(),
    studentAssessmentResults: await db.query.studentAssessmentResults.findMany(),
    schoolAssessmentCriteria: await db.query.schoolAssessmentCriteria.findMany(),
    offlineSyncLogs: await db.query.offlineSyncLogs.findMany(),
    multigradeMaterialMaps: await db.query.multigradeMaterialMaps.findMany(),
    lkpdWorksheets: await db.query.lkpdWorksheets.findMany(),
    learningMediaItems: await db.query.learningMediaItems.findMany(),
    teachingJournals: await db.query.teachingJournals.findMany(),
    reportExportHistory: await db.query.reportExportHistory.findMany(),
  };

  let totalRecords = 0;
  const checksums: Record<string, string> = {};

  for (const [name, rows] of Object.entries(tables)) {
    totalRecords += rows.length;
    checksums[name] = crypto
      .createHash("sha256")
      .update(JSON.stringify(rows))
      .digest("hex");
  }

  const payload: DatabaseBackupPayload = {
    version: 1,
    schoolName: "SDN Kandangan I Tosari",
    npsn: "20519069",
    exportedAt: new Date().toISOString(),
    tables,
    checksums,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFileName = `backup-sdn-kandangan-1-${timestamp}.json`;
  const backupFilePath = path.join(backupDir, backupFileName);

  const jsonString = JSON.stringify(payload, null, 2);
  fs.writeFileSync(backupFilePath, jsonString, "utf8");

  // Buat berkas SHA-256 checksum untuk validasi integritas saat pemulihan
  const fileHash = crypto.createHash("sha256").update(jsonString).digest("hex");
  const checksumFilePath = `${backupFilePath}.sha256`;
  fs.writeFileSync(checksumFilePath, `${fileHash}  ${backupFileName}\n`, "utf8");

  // Log audit pencadangan
  try {
    await db.insert(schema.auditLogs).values({
      action: "DATABASE_BACKUP_CREATED",
      targetEntity: "database_backup",
      targetId: backupFileName,
      details: {
        totalRecords,
        backupFilePath,
        fileHash,
      },
    });
  } catch (err) {
    console.warn("[Backup] Gagal mencatat log audit:", err);
  }

  return { backupFilePath, checksumFilePath, totalRecords };
}

// Eksekusi langsung jika dipanggil via CLI `tsx scripts/backup-db.ts`
if (require.main === module || (typeof process !== "undefined" && process.argv[1]?.endsWith("backup-db.ts"))) {
  createDatabaseBackup()
    .then((res) => {
      console.log(`[Backup Sukses] ${res.totalRecords} rekaman dicadangkan ke: ${res.backupFilePath}`);
      console.log(`[Checksum SHA-256]: ${res.checksumFilePath}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Backup Gagal]:", err);
      process.exit(1);
    });
}
