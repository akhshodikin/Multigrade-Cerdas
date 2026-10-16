import crypto from "crypto";

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  needsManualReview: boolean;
  reviewReason?: string;
}

export function generateDuplicateHash(
  subjectId: string,
  phase: string,
  element: string,
  originalText: string
): string {
  // Normalisasi teks untuk deteksi duplikasi yang presisi
  const normalized = originalText
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\u00C0-\u024F]/gi, "")
    .trim();

  const payload = `${subjectId.trim().toLowerCase()}:${phase.trim()}:${element.trim().toLowerCase()}:${normalized}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function extractDocumentContent(
  buffer: Buffer,
  fileType: "pdf" | "docx" | "xlsx" | "manual",
  fileName: string
): Promise<ExtractionResult> {
  try {
    if (fileType === "pdf") {
      // Dynamic import to prevent unnecessary server startup overhead
      const pdfParseModule: any = await import("pdf-parse");
      const pdfParse = typeof pdfParseModule === "function" ? pdfParseModule : pdfParseModule.default || pdfParseModule;
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text ? pdfData.text.trim() : "";

      // Evaluasi kualitas ekstraksi PDF
      const nonPrintableCount = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
      const isDubious =
        text.length < 50 ||
        (text.length > 0 && nonPrintableCount / text.length > 0.05);

      return {
        text,
        pageCount: pdfData.numpages || 1,
        needsManualReview: isDubious,
        reviewReason: isDubious
          ? "Teks hasil ekstraksi PDF terlalu pendek atau mengandung karakter yang mencurigakan (perlu pemeriksaan manual oleh pengguna)."
          : undefined,
      };
    }

    if (fileType === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value ? result.value.trim() : "";

      const isDubious = text.length < 30;
      return {
        text,
        needsManualReview: isDubious,
        reviewReason: isDubious
          ? "Teks dokumen DOCX sangat singkat atau kosong."
          : undefined,
      };
    }

    if (fileType === "xlsx") {
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheetLines: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const csv = xlsx.utils.sheet_to_csv(worksheet);
        if (csv.trim()) {
          sheetLines.push(`=== Lembar: ${sheetName} ===\n${csv}`);
        }
      }

      const text = sheetLines.join("\n\n");
      const isDubious = text.length < 20;

      return {
        text,
        needsManualReview: isDubious,
        reviewReason: isDubious
          ? "Data spreadsheet XLSX kosong atau tidak dapat dipindai."
          : undefined,
      };
    }

    // Default / Manual
    return {
      text: buffer.toString("utf-8"),
      needsManualReview: false,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      text: "",
      needsManualReview: true,
      reviewReason: `Gagal mengekstraksi file '${fileName}': ${errorMsg}. Wajib diinput manual atau diperiksa pengguna.`,
    };
  }
}
