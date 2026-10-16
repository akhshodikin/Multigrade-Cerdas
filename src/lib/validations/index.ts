import { z } from "zod";

// Peran Pengguna
export const userRoleEnum = z.enum(["admin", "headmaster", "teacher"]);
export type UserRole = z.infer<typeof userRoleEnum>;

// Login Schema
export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});

// Profil Sekolah Schema
export const schoolProfileSchema = z.object({
  name: z.string().min(3, "Nama sekolah minimal 3 karakter"),
  npsn: z.string().min(8, "NPSN harus 8 karakter").max(8, "NPSN harus 8 karakter"),
  address: z.string().min(5, "Alamat minimal 5 karakter"),
  headmasterName: z.string().min(3, "Nama Kepala Sekolah minimal 3 karakter"),
  headmasterNip: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Format email sekolah tidak valid").optional().or(z.literal("")),
  activeAcademicYear: z.string().min(4, "Tahun ajaran tidak valid (contoh: 2024/2025)"),
  activeSemester: z.enum(["Ganjil", "Genap"]),
});

// Tahun Ajaran Schema
export const academicTermSchema = z.object({
  year: z.string().min(4, "Tahun ajaran tidak valid"),
  semester: z.enum(["Ganjil", "Genap"]),
  isActive: z.boolean().default(false),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
});

// Pengguna / Guru Schema
export const userSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter").optional().or(z.literal("")),
  role: userRoleEnum,
  nip: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  assignedGroupId: z.enum(["group-a", "group-b", "group-c"]).nullable().optional(),
  isActive: z.boolean().default(true),
});

// Siswa Schema (Data sintetis untuk SDN SEDAENG II Tosari)
export const studentSchema = z.object({
  studentCode: z.string().min(3, "Kode siswa minimal 3 karakter").max(30),
  displayName: z.string().min(2, "Nama panggilan minimal 2 karakter").max(50),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter").max(100),
  classId: z.coerce.number().int().min(1).max(6),
  groupId: z.enum(["group-a", "group-b", "group-c"]),
  gender: z.enum(["L", "P"]),
  birthDate: z.string().optional().or(z.literal("")),
  guardianName: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  notes: z.string().optional().or(z.literal("")),
});
