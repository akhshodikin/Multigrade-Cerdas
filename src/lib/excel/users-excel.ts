import * as XLSX from "xlsx";
import { db } from "@/db";
import * as schema from "@/db/schema";

export interface ParsedUserRow {
  name: string;
  email: string;
  role: "admin" | "headmaster" | "teacher";
  nip?: string;
  phone?: string;
  assignedGroupId?: "group-a" | "group-b" | "group-c";
  isActive: boolean;
  initialPassword?: string;
}

/**
 * Menghasilkan Berkas Excel Spreadsheet (.xlsx) Data Guru & Tenaga Pendidik
 */
export async function generateUsersXlsx(): Promise<Buffer> {
  const school = await db.query.schoolProfile.findFirst();
  const usersList = await db.select().from(schema.users);
  const groupsList = await db.select().from(schema.multigradeGroups);

  const wb = XLSX.utils.book_new();

  const roleLabels: Record<string, string> = {
    admin: "Administrator / Operator",
    headmaster: "Kepala Sekolah",
    teacher: "Guru Pengampu Kelas Rangkap",
  };

  const rows: (string | number)[][] = [
    [(school?.name || "SDN SEDAENG II TOSARI").toUpperCase()],
    [`NPSN: ${school?.npsn || "20519069"} | Alamat: ${school?.address || "Kec. Tosari, Kab. Pasuruan"}`],
    ["DATA GURU DAN TENAGA KEPENDIDIKAN (GTK)"],
    [`Waktu Unduh: ${new Date().toLocaleString("id-ID")} | Total Staf: ${usersList.length}`],
    [],
    [
      "No",
      "Nama Lengkap & Gelar",
      "Email (Akun Login)",
      "NIP",
      "No Telepon / WhatsApp",
      "Peran Sistem",
      "Kelompok yang Ditugaskan",
      "Status Akun",
    ],
  ];

  usersList.forEach((u, idx) => {
    const assignedGroup = groupsList.find((g) => g.id === u.assignedGroupId);
    rows.push([
      idx + 1,
      u.name,
      u.email,
      u.nip || "-",
      u.phone || "-",
      roleLabels[u.role] || u.role,
      assignedGroup ? `${assignedGroup.name} (${assignedGroup.phase})` : "-",
      u.isActive ? "Aktif" : "Nonaktif",
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 28 },
    { wch: 22 },
    { wch: 18 },
    { wch: 26 },
    { wch: 26 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Data Guru & Staf");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

/**
 * Menghasilkan Berkas Template Excel (.xlsx) Kosong Siap Isi untuk Impor Data Guru & Staf
 */
export async function generateUsersTemplateXlsx(): Promise<Buffer> {
  const wb = XLSX.utils.book_new();

  const templateRows: (string | number)[][] = [
    [
      "Nama Lengkap",
      "Email",
      "NIP",
      "No Telepon",
      "Peran",
      "Kelompok Pengampu",
      "Status",
      "Password Awal",
    ],
    [
      "Agus Triyono, S.Pd.",
      "guru.a@sedaeng2.sch.id",
      "198603152010011008",
      "081234567891",
      "teacher",
      "group-a",
      "Aktif",
      "Sedaeng2#Tosari",
    ],
    [
      "Dewi Lestari, S.Pd.",
      "guru.b@sedaeng2.sch.id",
      "199004122015022003",
      "081234567892",
      "teacher",
      "group-b",
      "Aktif",
      "Sedaeng2#Tosari",
    ],
    [
      "Bambang Sutrisno, S.Pd., M.Pd.",
      "kepsek@sedaeng2.sch.id",
      "197508122000031002",
      "081234567890",
      "headmaster",
      "-",
      "Aktif",
      "Sedaeng2#Tosari",
    ],
  ];

  const wsTemplate = XLSX.utils.aoa_to_sheet(templateRows);
  wsTemplate["!cols"] = [
    { wch: 28 },
    { wch: 28 },
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 10 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTemplate, "Template GTK");

  const guideRows = [
    ["PANDUAN PENGISIAN DATA GURU DAN TENAGA KEPENDIDIKAN (XLSX)"],
    ["SDN SEDAENG II TOSARI"],
    ["=========================================================================================="],
    [],
    ["1. Kolom 'Nama Lengkap' (Wajib):", "Nama lengkap dan gelar pendidik / tenaga kependidikan."],
    ["2. Kolom 'Email' (Wajib):", "Alamat email resmi untuk akun login. Jika email sudah terdaftar, data profil akan diperbarui."],
    ["3. Kolom 'NIP' (Opsional):", "Nomor Induk Pegawai 18 digit (jika ada)."],
    ["4. Kolom 'No Telepon' (Opsional):", "Nomor telepon atau WhatsApp aktif."],
    ["5. Kolom 'Peran' (Wajib):", "Pilihan: 'teacher' (Guru), 'headmaster' (Kepala Sekolah), atau 'admin' (Administrator)."],
    ["6. Kolom 'Kelompok Pengampu':", "Wajib diisi jika Peran adalah 'teacher'. Pilihan: 'group-a' (Kelas 1-2), 'group-b' (Kelas 3-4), 'group-c' (Kelas 5-6)."],
    ["7. Kolom 'Status' (Opsional):", "Pilihan: 'Aktif' atau 'Nonaktif' (default: Aktif)."],
    ["8. Kolom 'Password Awal' (Opsional):", "Kata sandi awal akun baru (default aman jika kosong: Sedaeng2#Tosari)."],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide["!cols"] = [{ wch: 35 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, "Petunjuk Pengisian");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

/**
 * Membaca & Memvalidasi File Excel yang Diunggah untuk Impor Guru & Staf
 */
export function parseUsersXlsx(buffer: Buffer): { validRows: ParsedUserRow[]; errors: string[] } {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { validRows: [], errors: ["File Excel kosong atau tidak memiliki lembar kerja."] };
  }

  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  if (rawRows.length === 0) {
    return { validRows: [], errors: ["Lembar kerja Excel tidak berisi data guru."] };
  }

  const validRows: ParsedUserRow[] = [];
  const errors: string[] = [];

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2;

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

    const name = getField("Nama Lengkap", "nama", "name", "full_name", "nama_guru");
    const email = getField("Email", "email_address", "surel", "username").toLowerCase();
    const rawRole = getField("Peran", "role", "jabatan", "posisi").toLowerCase();
    const rawGroup = getField("Kelompok Pengampu", "kelompok", "assigned_group", "assignedgroupid", "group").toLowerCase();
    const nip = getField("NIP", "nip_guru", "nomor_induk");
    const phone = getField("No Telepon", "telepon", "phone", "wa", "whatsapp", "no_hp");
    const rawStatus = getField("Status", "status", "is_active", "status_akun");
    const initialPassword = getField("Password Awal", "password", "kata_sandi");

    // Skip empty row
    if (!name && !email) {
      return;
    }

    if (!name) {
      errors.push(`Baris ${rowNum}: 'Nama Lengkap' wajib diisi.`);
      return;
    }

    if (!email || !email.includes("@")) {
      errors.push(`Baris ${rowNum} (${name}): Format 'Email' tidak valid ('${email}').`);
      return;
    }

    // Role mapping
    let role: "admin" | "headmaster" | "teacher" = "teacher";
    if (rawRole.includes("admin") || rawRole.includes("operator")) {
      role = "admin";
    } else if (rawRole.includes("kepsek") || rawRole.includes("kepala") || rawRole.includes("headmaster")) {
      role = "headmaster";
    } else {
      role = "teacher";
    }

    // Group mapping
    let assignedGroupId: "group-a" | "group-b" | "group-c" | undefined = undefined;
    if (rawGroup.includes("group-a") || rawGroup === "a" || rawGroup.includes("kelompok a") || rawGroup.includes("1-2")) {
      assignedGroupId = "group-a";
    } else if (rawGroup.includes("group-b") || rawGroup === "b" || rawGroup.includes("kelompok b") || rawGroup.includes("3-4")) {
      assignedGroupId = "group-b";
    } else if (rawGroup.includes("group-c") || rawGroup === "c" || rawGroup.includes("kelompok c") || rawGroup.includes("5-6")) {
      assignedGroupId = "group-c";
    }

    const isActive = rawStatus.toLowerCase() !== "nonaktif" && rawStatus.toLowerCase() !== "false" && rawStatus.toLowerCase() !== "tidak aktif";

    validRows.push({
      name,
      email,
      role,
      assignedGroupId,
      nip: nip || undefined,
      phone: phone || undefined,
      isActive,
      initialPassword: initialPassword || undefined,
    });
  });

  return { validRows, errors };
}
