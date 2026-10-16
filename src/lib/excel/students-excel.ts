import * as XLSX from "xlsx";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc } from "drizzle-orm";
import { getGroupIdForClass } from "@/lib/multigrade";

export interface ParsedStudentRow {
  studentCode: string;
  fullName: string;
  displayName: string;
  classId: number;
  groupId: "group-a" | "group-b" | "group-c";
  gender: "L" | "P";
  birthDate?: string;
  guardianName?: string;
  isActive: boolean;
  notes?: string;
}

/**
 * Menghasilkan Berkas Excel Spreadsheet (.xlsx) Data Siswa Terdaftar
 */
export async function generateStudentsXlsx(filter?: { classId?: number; groupId?: string }): Promise<Buffer> {
  const school = await db.query.schoolProfile.findFirst();
  let query = db.select().from(schema.students);
  const students = await query.orderBy(asc(schema.students.classId), asc(schema.students.studentCode));

  const filtered = students.filter((s) => {
    if (filter?.classId && s.classId !== filter.classId) return false;
    if (filter?.groupId && s.groupId !== filter.groupId) return false;
    return true;
  });

  const wb = XLSX.utils.book_new();

  const groupNames: Record<string, string> = {
    "group-a": "Kelompok A (Kelas 1-2)",
    "group-b": "Kelompok B (Kelas 3-4)",
    "group-c": "Kelompok C (Kelas 5-6)",
  };

  const rows: (string | number)[][] = [
    [(school?.name || "SDN KANDANGAN I TOSARI").toUpperCase()],
    [`NPSN: ${school?.npsn || "20519069"} | Alamat: ${school?.address || "Kec. Tosari, Kab. Pasuruan"}`],
    ["DATA INDUK SISWA PEMBELAJARAN MULTIGRADE / KELAS RANGKAP"],
    [`Waktu Unduh: ${new Date().toLocaleString("id-ID")} | Total Siswa: ${filtered.length}`],
    [],
    [
      "No",
      "Kode Siswa",
      "Nama Lengkap",
      "Nama Panggilan",
      "Kelas",
      "Kelompok Multigrade",
      "Jenis Kelamin",
      "Tanggal Lahir",
      "Nama Wali / Orang Tua",
      "Status",
      "Catatan Kebutuhan / Minat",
    ],
  ];

  filtered.forEach((st, idx) => {
    rows.push([
      idx + 1,
      st.studentCode,
      st.fullName,
      st.displayName,
      st.classId,
      groupNames[st.groupId] || st.groupId,
      st.gender === "L" ? "Laki-laki (L)" : "Perempuan (P)",
      st.birthDate || "-",
      st.guardianName || "-",
      st.isActive ? "Aktif" : "Nonaktif",
      st.notes || "-",
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 15 },
    { wch: 28 },
    { wch: 16 },
    { wch: 8 },
    { wch: 24 },
    { wch: 18 },
    { wch: 15 },
    { wch: 24 },
    { wch: 12 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

/**
 * Menghasilkan Berkas Template Excel (.xlsx) Kosong Siap Isi untuk Impor Data Siswa
 */
export async function generateStudentsTemplateXlsx(): Promise<Buffer> {
  const wb = XLSX.utils.book_new();

  const templateRows: (string | number)[][] = [
    [
      "Kode Siswa",
      "Nama Lengkap",
      "Nama Panggilan",
      "Kelas",
      "Jenis Kelamin",
      "Tanggal Lahir",
      "Nama Wali",
      "Status",
      "Catatan",
    ],
    [
      "SDN1-A-1-01",
      "Ahmad Fauzi Pratama",
      "Ahmad",
      1,
      "L",
      "2018-05-14",
      "Budi Pratama",
      "Aktif",
      "Minat tinggi dalam berhitung",
    ],
    [
      "SDN1-A-2-01",
      "Siti Rahmawati Tengger",
      "Rahma",
      2,
      "P",
      "2017-08-20",
      "Slamet Riyadi",
      "Aktif",
      "Senang membaca cerita bergambar",
    ],
    [
      "SDN1-B-3-01",
      "Bayu Prasetyo Bromo",
      "Bayu",
      3,
      "L",
      "2016-02-11",
      "Hadi Prasetyo",
      "Aktif",
      "-",
    ],
  ];

  const wsTemplate = XLSX.utils.aoa_to_sheet(templateRows);
  wsTemplate["!cols"] = [
    { wch: 16 },
    { wch: 28 },
    { wch: 16 },
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 10 },
    { wch: 32 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTemplate, "Template Siswa");

  const guideRows = [
    ["PANDUAN PENGISIAN DATA SISWA DALAM FORMAT EXCEL (XLSX)"],
    ["SDN KANDANGAN I TOSARI - PEMBELAJARAN MULTIGRADE"],
    ["=========================================================================================="],
    [],
    ["1. Kolom 'Kode Siswa' (Wajib):", "Kode unik siswa. Jika kode sudah ada di sistem, data akan diperbarui (update). Jika baru, data akan ditambahkan."],
    ["2. Kolom 'Nama Lengkap' (Wajib):", "Nama lengkap siswa sesuai akta lahir atau Dapodik."],
    ["3. Kolom 'Nama Panggilan' (Opsional):", "Nama panggilan sehari-hari di kelas. Jika kosong, sistem otomatis mengambil kata pertama nama lengkap."],
    ["4. Kolom 'Kelas' (Wajib):", "Tingkat kelas asal (isi dengan angka 1, 2, 3, 4, 5, atau 6)."],
    ["", "Sistem otomatis mengelompokkan ke multigrade: Kelas 1-2 = Kelompok A, Kelas 3-4 = Kelompok B, Kelas 5-6 = Kelompok C."],
    ["5. Kolom 'Jenis Kelamin' (Wajib):", "Isi dengan 'L' untuk Laki-laki atau 'P' untuk Perempuan."],
    ["6. Kolom 'Tanggal Lahir' (Opsional):", "Format TTTT-BB-HH (contoh: 2017-08-20) atau format tanggal Excel standar."],
    ["7. Kolom 'Nama Wali' (Opsional):", "Nama orang tua atau wali murid."],
    ["8. Kolom 'Status' (Opsional):", "Isi 'Aktif' atau 'Nonaktif' (default: Aktif)."],
    ["9. Kolom 'Catatan' (Opsional):", "Kebutuhan belajar, minat, atau observasi awal guru."],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide["!cols"] = [{ wch: 35 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, "Petunjuk Pengisian");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

/**
 * Membaca & Memvalidasi File Excel yang Diunggah untuk Impor Siswa
 */
export function parseStudentsXlsx(buffer: Buffer): { validRows: ParsedStudentRow[]; errors: string[] } {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { validRows: [], errors: ["File Excel kosong atau tidak memiliki lembar kerja (sheet)."] };
  }

  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  if (rawRows.length === 0) {
    return { validRows: [], errors: ["Lembar kerja Excel tidak berisi data siswa."] };
  }

  const validRows: ParsedStudentRow[] = [];
  const errors: string[] = [];

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // Header adalah baris 1

    const getField = (...keys: string[]): string => {
      for (const k of keys) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.trim().toLowerCase() === k.trim().toLowerCase()) {
            return String(row[rowKey] ?? "").trim();
          }
        }
      }
      return "";
    };

    const studentCode = getField("Kode Siswa", "kode_siswa", "kode", "student_code", "nis");
    const fullName = getField("Nama Lengkap", "nama_lengkap", "nama", "full_name", "student_name");
    const displayName = getField("Nama Panggilan", "nama_panggilan", "panggilan", "display_name") || fullName.split(" ")[0] || "Siswa";
    const rawClass = getField("Kelas", "kelas", "class_id", "tingkat_kelas", "class");
    const rawGender = getField("Jenis Kelamin", "jenis_kelamin", "jk", "gender", "l/p");
    const rawBirthDate = getField("Tanggal Lahir", "tanggal_lahir", "birth_date", "tgl_lahir");
    const guardianName = getField("Nama Wali", "nama_wali", "wali", "guardian_name", "orang_tua");
    const rawStatus = getField("Status", "status", "keaktifan", "is_active");
    const notes = getField("Catatan", "catatan", "notes", "kebutuhan_khusus");

    // Skip baris contoh atau baris kosong
    if (!studentCode && !fullName && !rawClass) {
      return;
    }

    if (!studentCode) {
      errors.push(`Baris ${rowNum}: 'Kode Siswa' wajib diisi.`);
      return;
    }

    if (!fullName) {
      errors.push(`Baris ${rowNum} (${studentCode}): 'Nama Lengkap' wajib diisi.`);
      return;
    }

    const classId = parseInt(rawClass, 10);
    if (isNaN(classId) || classId < 1 || classId > 6) {
      errors.push(`Baris ${rowNum} (${studentCode}): 'Kelas' harus berupa angka 1 sampai 6 (ditemukan: '${rawClass}').`);
      return;
    }

    const groupId = getGroupIdForClass(classId);

    let gender: "L" | "P" = "L";
    const gLower = rawGender.toLowerCase();
    if (gLower.startsWith("p") || gLower.includes("perempuan") || gLower.includes("wanita")) {
      gender = "P";
    } else {
      gender = "L";
    }

    const isActive = rawStatus.toLowerCase() !== "nonaktif" && rawStatus.toLowerCase() !== "false" && rawStatus.toLowerCase() !== "tidak aktif";

    let birthDate: string | undefined = undefined;
    if (rawBirthDate) {
      birthDate = String(rawBirthDate).split("T")[0];
    }

    validRows.push({
      studentCode,
      fullName,
      displayName,
      classId,
      groupId,
      gender,
      birthDate,
      guardianName: guardianName || undefined,
      isActive,
      notes: notes || undefined,
    });
  });

  return { validRows, errors };
}
