import { db } from "@/db";
import * as schema from "@/db/schema";
import crypto from "crypto";
import type { ReportType, ExportFormat, AnyReportData } from "./types";
import { generateReportPdf } from "./generators/pdf-generator";
import { generateReportDocx } from "./generators/docx-generator";
import { generateReportXlsx } from "./generators/xlsx-generator";
import { desc, eq, and } from "drizzle-orm";

export interface GenerateAndTrackResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  version: number;
  checksum: string;
  fileSizeBytes: number;
  historyId: string;
}

/**
 * Membuat berkas laporan (PDF, DOCX, atau XLSX) dan mencatat riwayat versi dokumen ke database.
 * "Jangan menampilkan laporan sebagai selesai jika pembuatan berkas gagal."
 */
export async function generateAndTrackReport(
  data: AnyReportData,
  format: ExportFormat,
  user?: { id?: string; name?: string; role?: string },
  filterParameters: Record<string, unknown> = {}
): Promise<GenerateAndTrackResult> {
  const timestampStr = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const sanitizedTitle = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Cari versi terakhir untuk tipe laporan dan entitas ini
  const previousHistory = await db.query.reportExportHistory.findFirst({
    where: and(
      eq(schema.reportExportHistory.reportType, data.reportType),
      eq(schema.reportExportHistory.format, format)
    ),
    orderBy: [desc(schema.reportExportHistory.version)],
  });

  const nextVersion = (previousHistory?.version || 0) + 1;

  let buffer: Buffer;
  let mimeType: string;
  let extension: string;

  try {
    switch (format) {
      case "pdf": {
        buffer = await generateReportPdf(data);
        mimeType = "application/pdf";
        extension = "pdf";
        break;
      }
      case "docx": {
        buffer = await generateReportDocx(data);
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        extension = "docx";
        break;
      }
      case "xlsx": {
        buffer = await generateReportXlsx(data);
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        extension = "xlsx";
        break;
      }
      default: {
        throw new Error(`Format ekspor '${format}' tidak didukung.`);
      }
    }

    if (!buffer || buffer.length === 0) {
      throw new Error(`Pembuatan berkas ${format.toUpperCase()} gagal menghasilkan data.`);
    }

    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
    const filename = `${data.reportType}_v${nextVersion}_${sanitizedTitle}_${timestampStr}.${extension}`;

    // Catat riwayat ekspor sukses ke database
    const [historyEntry] = await db
      .insert(schema.reportExportHistory)
      .values({
        reportType: data.reportType,
        title: data.title,
        format,
        version: nextVersion,
        targetEntityId: (filterParameters.studentId as string) || (filterParameters.planId as string) || (filterParameters.groupId as string),
        filterParameters,
        fileSizeBytes: buffer.length,
        checksum,
        status: "success",
        generatedById: user?.id,
        generatedByName: user?.name || "Pengguna",
        generatedByRole: user?.role || "teacher",
      })
      .returning();

    return {
      buffer,
      mimeType,
      filename,
      version: nextVersion,
      checksum,
      fileSizeBytes: buffer.length,
      historyId: historyEntry.id,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Catat riwayat kegagalan (Jangan menampilkan laporan sebagai selesai jika pembuatan berkas gagal)
    await db.insert(schema.reportExportHistory).values({
      reportType: data.reportType,
      title: data.title,
      format,
      version: nextVersion,
      targetEntityId: (filterParameters.studentId as string) || (filterParameters.planId as string) || (filterParameters.groupId as string),
      filterParameters,
      fileSizeBytes: 0,
      status: "failed",
      errorMessage: errorMsg,
      generatedById: user?.id,
      generatedByName: user?.name || "Pengguna",
      generatedByRole: user?.role || "teacher",
    });

    throw new Error(`Gagal menghasilkan berkas laporan: ${errorMsg}`);
  }
}
