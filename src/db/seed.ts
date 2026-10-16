import { db } from "./index";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function runSeed() {
  console.log("Memulai pengisian data awal (seed sintetis) SDN SEDAENG II Tosari...");

  // 1. Profil Sekolah (Singleton id = 1)
  const existingProfile = await db.select().from(schema.schoolProfile).where(eq(schema.schoolProfile.id, 1));
  if (existingProfile.length === 0) {
    await db.insert(schema.schoolProfile).values({
      id: 1,
      npsn: "20519000",
      name: "SDN SEDAENG II Tosari",
      address: "Dusun Sedaeng, Desa Sedaeng, Kec. Tosari, Kab. Pasuruan, Jawa Timur 67177",
      headmasterName: "Bambang Sutrisno, S.Pd., M.Pd.",
      headmasterNip: "197508122000031002",
      phone: "081234567890",
      email: "sdnsedaeng2tosari@gmail.com",
      activeAcademicYear: "2024/2025",
      activeSemester: "Ganjil",
    });
    console.log("✓ Profil SDN SEDAENG II Tosari tersimpan.");
  }

  // 2. Tahun Ajaran & Semester
  const existingTerms = await db.select().from(schema.academicTerms);
  if (existingTerms.length === 0) {
    await db.insert(schema.academicTerms).values([
      {
        year: "2024/2025",
        semester: "Ganjil",
        isActive: true,
        startDate: "2024-07-15",
        endDate: "2024-12-20",
      },
      {
        year: "2024/2025",
        semester: "Genap",
        isActive: false,
        startDate: "2025-01-06",
        endDate: "2025-06-20",
      },
    ]);
    console.log("✓ Tahun ajaran 2024/2025 (Ganjil & Genap) tersimpan.");
  }

  // 3. Kelompok Belajar Multigrade
  const existingGroups = await db.select().from(schema.multigradeGroups);
  if (existingGroups.length === 0) {
    await db.insert(schema.multigradeGroups).values([
      {
        id: "group-a",
        name: "Kelompok A",
        phase: "Fase A",
        grades: "1,2",
        description: "Kelas rangkap untuk Kelas 1 dan Kelas 2 (Fase A) - Fokus Literasi & Numerasi Dasar",
      },
      {
        id: "group-b",
        name: "Kelompok B",
        phase: "Fase B",
        grades: "3,4",
        description: "Kelas rangkap untuk Kelas 3 dan Kelas 4 (Fase B) - Fokus Penguatan Konsep & IPAS",
      },
      {
        id: "group-c",
        name: "Kelompok C",
        phase: "Fase C",
        grades: "5,6",
        description: "Kelas rangkap untuk Kelas 5 dan Kelas 6 (Fase C) - Fokus Pemecahan Masalah & Tutor Sebaya",
      },
    ]);
    console.log("✓ 3 Kelompok Multigrade (A, B, C) tersimpan.");
  }

  // 4. Tingkatan Kelas (1 sampai 6)
  const existingClasses = await db.select().from(schema.classes);
  if (existingClasses.length === 0) {
    await db.insert(schema.classes).values([
      { id: 1, name: "Kelas 1", groupId: "group-a", phase: "Fase A" },
      { id: 2, name: "Kelas 2", groupId: "group-a", phase: "Fase A" },
      { id: 3, name: "Kelas 3", groupId: "group-b", phase: "Fase B" },
      { id: 4, name: "Kelas 4", groupId: "group-b", phase: "Fase B" },
      { id: 5, name: "Kelas 5", groupId: "group-c", phase: "Fase C" },
      { id: 6, name: "Kelas 6", groupId: "group-c", phase: "Fase C" },
    ]);
    console.log("✓ Kelas 1 s/d 6 tersimpan.");
  }

  // 5. Akun Pengguna (Admin, Kepala Sekolah, dan Guru Pengampu)
  const defaultPasswordHash = await bcrypt.hash("Sedaeng2#Tosari", 10);
  const existingUsers = await db.select().from(schema.users);
  
  let teacherAId: string | undefined;
  let teacherBId: string | undefined;
  let teacherCId: string | undefined;

  if (existingUsers.length === 0) {
    const insertedUsers = await db
      .insert(schema.users)
      .values([
        {
          name: "Administrator Sistem",
          email: "admin@sedaeng2.sch.id",
          passwordHash: defaultPasswordHash,
          role: "admin",
          nip: "198801012015011001",
          phone: "081234567801",
        },
        {
          name: "Bambang Sutrisno, S.Pd., M.Pd.",
          email: "kepsek@sedaeng2.sch.id",
          passwordHash: defaultPasswordHash,
          role: "headmaster",
          nip: "197508122000031002",
          phone: "081234567802",
        },
        {
          name: "Siti Rahayu, S.Pd.SD",
          email: "guru.a@sedaeng2.sch.id",
          passwordHash: defaultPasswordHash,
          role: "teacher",
          assignedGroupId: "group-a",
          nip: "198204152008012015",
          phone: "081234567803",
        },
        {
          name: "Joko Widodo, S.Pd.",
          email: "guru.b@sedaeng2.sch.id",
          passwordHash: defaultPasswordHash,
          role: "teacher",
          assignedGroupId: "group-b",
          nip: "198509202010011020",
          phone: "081234567804",
        },
        {
          name: "Nurul Hidayati, S.Pd.",
          email: "guru.c@sedaeng2.sch.id",
          passwordHash: defaultPasswordHash,
          role: "teacher",
          assignedGroupId: "group-c",
          nip: "199011052019032011",
          phone: "081234567805",
        },
      ])
      .returning();

    teacherAId = insertedUsers.find((u) => u.email === "guru.a@sedaeng2.sch.id")?.id;
    teacherBId = insertedUsers.find((u) => u.email === "guru.b@sedaeng2.sch.id")?.id;
    teacherCId = insertedUsers.find((u) => u.email === "guru.c@sedaeng2.sch.id")?.id;

    // Tautkan guru pengampu pada tabel multigrade_groups
    if (teacherAId) {
      await db.update(schema.multigradeGroups).set({ leadTeacherId: teacherAId }).where(eq(schema.multigradeGroups.id, "group-a"));
    }
    if (teacherBId) {
      await db.update(schema.multigradeGroups).set({ leadTeacherId: teacherBId }).where(eq(schema.multigradeGroups.id, "group-b"));
    }
    if (teacherCId) {
      await db.update(schema.multigradeGroups).set({ leadTeacherId: teacherCId }).where(eq(schema.multigradeGroups.id, "group-c"));
    }
    console.log("✓ Akun Pengguna (Admin, Kepala Sekolah, 3 Guru) tersimpan dan tertaut.");
  }

  // 6. Data 27 Siswa Sintetis SDN SEDAENG II Tosari
  const existingStudents = await db.select().from(schema.students);
  if (existingStudents.length === 0) {
    const syntheticStudentsData = [
      // Kelompok A - Kelas 1 (4 Siswa)
      { code: "SDN2-A-01", name: "Siswa A1-1 (Sintetis)", display: "A1-1", classId: 1, groupId: "group-a", gender: "L" as const },
      { code: "SDN2-A-02", name: "Siswa A1-2 (Sintetis)", display: "A1-2", classId: 1, groupId: "group-a", gender: "P" as const },
      { code: "SDN2-A-03", name: "Siswa A1-3 (Sintetis)", display: "A1-3", classId: 1, groupId: "group-a", gender: "L" as const },
      { code: "SDN2-A-04", name: "Siswa A1-4 (Sintetis)", display: "A1-4", classId: 1, groupId: "group-a", gender: "P" as const },

      // Kelompok A - Kelas 2 (5 Siswa)
      { code: "SDN2-A-05", name: "Siswa A2-1 (Sintetis)", display: "A2-1", classId: 2, groupId: "group-a", gender: "L" as const },
      { code: "SDN2-A-06", name: "Siswa A2-2 (Sintetis)", display: "A2-2", classId: 2, groupId: "group-a", gender: "P" as const },
      { code: "SDN2-A-07", name: "Siswa A2-3 (Sintetis)", display: "A2-3", classId: 2, groupId: "group-a", gender: "L" as const },
      { code: "SDN2-A-08", name: "Siswa A2-4 (Sintetis)", display: "A2-4", classId: 2, groupId: "group-a", gender: "P" as const },
      { code: "SDN2-A-09", name: "Siswa A2-5 (Sintetis)", display: "A2-5", classId: 2, groupId: "group-a", gender: "L" as const },

      // Kelompok B - Kelas 3 (5 Siswa)
      { code: "SDN2-B-01", name: "Siswa B3-1 (Sintetis)", display: "B3-1", classId: 3, groupId: "group-b", gender: "L" as const },
      { code: "SDN2-B-02", name: "Siswa B3-2 (Sintetis)", display: "B3-2", classId: 3, groupId: "group-b", gender: "P" as const },
      { code: "SDN2-B-03", name: "Siswa B3-3 (Sintetis)", display: "B3-3", classId: 3, groupId: "group-b", gender: "L" as const },
      { code: "SDN2-B-04", name: "Siswa B3-4 (Sintetis)", display: "B3-4", classId: 3, groupId: "group-b", gender: "P" as const },
      { code: "SDN2-B-05", name: "Siswa B3-5 (Sintetis)", display: "B3-5", classId: 3, groupId: "group-b", gender: "L" as const },

      // Kelompok B - Kelas 4 (4 Siswa)
      { code: "SDN2-B-06", name: "Siswa B4-1 (Sintetis)", display: "B4-1", classId: 4, groupId: "group-b", gender: "P" as const },
      { code: "SDN2-B-07", name: "Siswa B4-2 (Sintetis)", display: "B4-2", classId: 4, groupId: "group-b", gender: "L" as const },
      { code: "SDN2-B-08", name: "Siswa B4-3 (Sintetis)", display: "B4-3", classId: 4, groupId: "group-b", gender: "P" as const },
      { code: "SDN2-B-09", name: "Siswa B4-4 (Sintetis)", display: "B4-4", classId: 4, groupId: "group-b", gender: "L" as const },

      // Kelompok C - Kelas 5 (5 Siswa)
      { code: "SDN2-C-01", name: "Siswa C5-1 (Sintetis)", display: "C5-1", classId: 5, groupId: "group-c", gender: "L" as const },
      { code: "SDN2-C-02", name: "Siswa C5-2 (Sintetis)", display: "C5-2", classId: 5, groupId: "group-c", gender: "P" as const },
      { code: "SDN2-C-03", name: "Siswa C5-3 (Sintetis)", display: "C5-3", classId: 5, groupId: "group-c", gender: "L" as const },
      { code: "SDN2-C-04", name: "Siswa C5-4 (Sintetis)", display: "C5-4", classId: 5, groupId: "group-c", gender: "P" as const },
      { code: "SDN2-C-05", name: "Siswa C5-5 (Sintetis)", display: "C5-5", classId: 5, groupId: "group-c", gender: "L" as const },

      // Kelompok C - Kelas 6 (4 Siswa)
      { code: "SDN2-C-06", name: "Siswa C6-1 (Sintetis)", display: "C6-1", classId: 6, groupId: "group-c", gender: "P" as const },
      { code: "SDN2-C-07", name: "Siswa C6-2 (Sintetis)", display: "C6-2", classId: 6, groupId: "group-c", gender: "L" as const },
      { code: "SDN2-C-08", name: "Siswa C6-3 (Sintetis)", display: "C6-3", classId: 6, groupId: "group-c", gender: "P" as const },
      { code: "SDN2-C-09", name: "Siswa C6-4 (Sintetis)", display: "C6-4", classId: 6, groupId: "group-c", gender: "L" as const },
    ];

    await db.insert(schema.students).values(
      syntheticStudentsData.map((s) => ({
        studentCode: s.code,
        fullName: s.name,
        displayName: s.display,
        classId: s.classId,
        groupId: s.groupId,
        gender: s.gender,
        birthDate: "2015-05-10",
        guardianName: "Orang Tua Siswa (Sintetis)",
        isActive: true,
        notes: "Data sintetis untuk pengujian sistem kelas rangkap SDN SEDAENG II.",
      }))
    );
    console.log(`✓ 27 Siswa Sintetis terdaftar (4 di Kls 1, 5 di Kls 2, 5 di Kls 3, 4 di Kls 4, 5 di Kls 5, 4 di Kls 6).`);
  }

  console.log("Pengisian data awal (seed sintetis) selesai dengan sukses!");
}

if (process.argv[1]?.includes("seed")) {
  runSeed()
    .then(() => {
      console.log("Seed selesai.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Gagal menjalankan seed:", err);
      process.exit(1);
    });
}
