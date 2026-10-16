import { describe, it, expect, beforeAll } from "vitest";
import * as XLSX from "xlsx";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  generateStudentsXlsx,
  generateStudentsTemplateXlsx,
  parseStudentsXlsx,
} from "@/lib/excel/students-excel";
import {
  generateUsersXlsx,
  generateUsersTemplateXlsx,
  parseUsersXlsx,
} from "@/lib/excel/users-excel";

describe("Pengujian Modul Download & Upload XLSX Data Siswa dan Guru (SDN Kandangan I Tosari)", () => {
  // 1. Verifikasi Ekspor Data Siswa ke XLSX
  it("1. harus menghasilkan berkas XLSX data siswa dengan format biner dan struktur tabel yang benar", async () => {
    const buffer = await generateStudentsXlsx();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);

    // Verifikasi magic bytes ZIP / OOXML (.xlsx) -> PK\x03\x04
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    expect(buffer[2]).toBe(0x03);
    expect(buffer[3]).toBe(0x04);

    // Baca kembali menggunakan pustaka XLSX
    const wb = XLSX.read(buffer, { type: "buffer" });
    expect(wb.SheetNames).toContain("Data Siswa");

    const ws = wb.Sheets["Data Siswa"];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

    // Baris header sekolah & judul
    expect(String(rows[0][0])).toContain("SDN");
    expect(String(rows[2][0])).toContain("DATA INDUK SISWA");

    // Baris header tabel ada di indeks 5
    const tableHeader = rows[5];
    expect(tableHeader).toContain("Kode Siswa");
    expect(tableHeader).toContain("Nama Lengkap");
    expect(tableHeader).toContain("Kelas");
    expect(tableHeader).toContain("Kelompok Multigrade");

    // Total baris siswa (setelah header) harus mencerminkan data di DB (minimal 27 siswa)
    const dataRows = rows.slice(6);
    expect(dataRows.length).toBeGreaterThanOrEqual(27);
  });

  // 2. Verifikasi Filter Ekspor Siswa
  it("2. harus mampu memfilter data siswa saat ekspor berdasarkan kelas dan kelompok", async () => {
    // Filter Kelas 1
    const bufferKls1 = await generateStudentsXlsx({ classId: 1 });
    const wb1 = XLSX.read(bufferKls1, { type: "buffer" });
    const rows1 = XLSX.utils.sheet_to_json<string[]>(wb1.Sheets["Data Siswa"], { header: 1 });
    const dataRows1 = rows1.slice(6);
    expect(dataRows1.length).toBe(4); // Kelas 1 memiliki 4 siswa
    dataRows1.forEach((r) => expect(Number(r[4])).toBe(1));

    // Filter Kelompok C
    const bufferGrpC = await generateStudentsXlsx({ groupId: "group-c" });
    const wbC = XLSX.read(bufferGrpC, { type: "buffer" });
    const rowsC = XLSX.utils.sheet_to_json<string[]>(wbC.Sheets["Data Siswa"], { header: 1 });
    const dataRowsC = rowsC.slice(6);
    expect(dataRowsC.length).toBe(9); // Kelompok C (Kls 5 + Kls 6) = 5 + 4 = 9 siswa
  });

  // 3. Verifikasi Template Unduh Data Siswa
  it("3. harus menghasilkan template XLSX siswa lengkap dengan contoh dan lembar panduan pengisian", async () => {
    const buffer = await generateStudentsTemplateXlsx();
    const wb = XLSX.read(buffer, { type: "buffer" });

    expect(wb.SheetNames).toContain("Template Siswa");
    expect(wb.SheetNames).toContain("Petunjuk Pengisian");

    const wsTemplate = wb.Sheets["Template Siswa"];
    const templateRows = XLSX.utils.sheet_to_json<string[]>(wsTemplate, { header: 1 });

    expect(templateRows[0]).toContain("Kode Siswa");
    expect(templateRows[0]).toContain("Nama Lengkap");
    expect(templateRows[0]).toContain("Kelas");
    expect(templateRows.length).toBeGreaterThan(2); // Ada baris contoh
  });

  // 4. Verifikasi Parser XLSX Data Siswa
  it("4. harus mem-parsing berkas XLSX data siswa dengan pemetaan kelompok otomatis dan validasi ketat", () => {
    // Siapkan workbook sintetis dalam memori
    const wb = XLSX.utils.book_new();
    const testData = [
      ["Kode Siswa", "Nama Lengkap", "Nama Panggilan", "Kelas", "Jenis Kelamin", "Tanggal Lahir", "Nama Wali", "Status"],
      ["SDN1-TEST-01", "Ahmad Bromo", "Ahmad", "1", "L", "2018-01-01", "Bapak Ahmad", "Aktif"],
      ["SDN1-TEST-02", "Citra Tosari", "", "4", "Perempuan", "2015-05-10", "Ibu Citra", "Aktif"],
      ["SDN1-TEST-03", "Doni Tengger", "Doni", "6", "Laki-laki", "2013-09-12", "Bapak Doni", "Nonaktif"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const testBuffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

    const { validRows, errors } = parseStudentsXlsx(testBuffer);

    expect(errors.length).toBe(0);
    expect(validRows.length).toBe(3);

    // Baris 1: Kelas 1 -> Kelompok A
    expect(validRows[0].studentCode).toBe("SDN1-TEST-01");
    expect(validRows[0].classId).toBe(1);
    expect(validRows[0].groupId).toBe("group-a");
    expect(validRows[0].gender).toBe("L");
    expect(validRows[0].isActive).toBe(true);

    // Baris 2: Kelas 4 -> Kelompok B, Nama panggilan fallback ke kata pertama
    expect(validRows[1].studentCode).toBe("SDN1-TEST-02");
    expect(validRows[1].classId).toBe(4);
    expect(validRows[1].groupId).toBe("group-b");
    expect(validRows[1].displayName).toBe("Citra");
    expect(validRows[1].gender).toBe("P");

    // Baris 3: Kelas 6 -> Kelompok C, Status nonaktif
    expect(validRows[2].studentCode).toBe("SDN1-TEST-03");
    expect(validRows[2].classId).toBe(6);
    expect(validRows[2].groupId).toBe("group-c");
    expect(validRows[2].isActive).toBe(false);
  });

  it("5. harus menolak atau mencatat error saat berkas XLSX siswa memiliki data tidak valid", () => {
    const wb = XLSX.utils.book_new();
    const badData = [
      ["Kode Siswa", "Nama Lengkap", "Kelas"],
      ["", "Tanpa Kode", "2"], // Kode kosong
      ["SDN1-BAD-02", "Kelas Tidak Valid", "9"], // Kelas 9 tidak ada di SD
      ["SDN1-BAD-03", "", "3"], // Nama kosong
    ];
    const ws = XLSX.utils.aoa_to_sheet(badData);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const testBuffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

    const { validRows, errors } = parseStudentsXlsx(testBuffer);
    expect(validRows.length).toBe(0);
    expect(errors.length).toBe(3);
    expect(errors[0]).toContain("Kode Siswa");
    expect(errors[1]).toContain("Kelas");
    expect(errors[2]).toContain("Nama Lengkap");
  });

  // 6. Verifikasi Ekspor Data Guru/GTK ke XLSX
  it("6. harus menghasilkan berkas XLSX data guru dan staf dengan proteksi kerahasiaan kata sandi", async () => {
    const buffer = await generateUsersXlsx();
    expect(buffer).toBeInstanceOf(Buffer);

    const wb = XLSX.read(buffer, { type: "buffer" });
    expect(wb.SheetNames).toContain("Data Guru & Staf");

    const ws = wb.Sheets["Data Guru & Staf"];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

    const header = rows[5];
    expect(header).toContain("Nama Lengkap & Gelar");
    expect(header).toContain("Email (Akun Login)");
    expect(header).toContain("Peran Sistem");
    expect(header).not.toContain("password");
    expect(header).not.toContain("passwordHash");

    const dataRows = rows.slice(6);
    expect(dataRows.length).toBeGreaterThanOrEqual(4); // Minimal admin, kepsek, guru a, b, c
  });

  // 7. Verifikasi Template Unduh Data Guru/GTK
  it("7. harus menghasilkan template XLSX guru lengkap dengan petunjuk peran dan kelompok pengampu", async () => {
    const buffer = await generateUsersTemplateXlsx();
    const wb = XLSX.read(buffer, { type: "buffer" });

    expect(wb.SheetNames).toContain("Template GTK");
    expect(wb.SheetNames).toContain("Petunjuk Pengisian");

    const ws = wb.Sheets["Template GTK"];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    expect(rows[0]).toContain("Nama Lengkap");
    expect(rows[0]).toContain("Email");
    expect(rows[0]).toContain("Peran");
    expect(rows[0]).toContain("Kelompok Pengampu");
  });

  // 8. Verifikasi Parser XLSX Data Guru/GTK
  it("8. harus mem-parsing data guru/GTK dengan normalisasi peran dan format email", () => {
    const wb = XLSX.utils.book_new();
    const testUsers = [
      ["Nama Lengkap", "Email", "Peran", "Kelompok Pengampu", "NIP", "No Telepon"],
      ["Pak Guru Baru, S.Pd.", "GURU.BARU@sdn.sch.id", "Guru Pengampu", "Kelompok A (Kelas 1-2)", "199201012020", "0812333"],
      ["Operator Sekolah", "admin.baru@sdn.sch.id", "Administrator", "-", "", "0812444"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(testUsers);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const testBuffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

    const { validRows, errors } = parseUsersXlsx(testBuffer);

    expect(errors.length).toBe(0);
    expect(validRows.length).toBe(2);

    expect(validRows[0].email).toBe("guru.baru@sdn.sch.id");
    expect(validRows[0].role).toBe("teacher");
    expect(validRows[0].assignedGroupId).toBe("group-a");

    expect(validRows[1].email).toBe("admin.baru@sdn.sch.id");
    expect(validRows[1].role).toBe("admin");
    expect(validRows[1].assignedGroupId).toBeUndefined();
  });
});
