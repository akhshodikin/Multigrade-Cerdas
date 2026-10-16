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

  // 7. Mata Pelajaran Resmi SD Kurikulum Merdeka
  const existingSubjects = await db.select().from(schema.subjects);
  if (existingSubjects.length === 0) {
    await db.insert(schema.subjects).values([
      { id: "bahasa-indonesia", name: "Bahasa Indonesia", category: "wajib", targetPhases: "Fase A, Fase B, Fase C" },
      { id: "matematika", name: "Matematika", category: "wajib", targetPhases: "Fase A, Fase B, Fase C" },
      { id: "pendidikan-pancasila", name: "Pendidikan Pancasila", category: "wajib", targetPhases: "Fase A, Fase B, Fase C" },
      { id: "ipas", name: "Ilmu Pengetahuan Alam dan Sosial (IPAS)", category: "wajib", targetPhases: "Fase B, Fase C" },
      { id: "pendidikan-agama", name: "Pendidikan Agama dan Budi Pekerti", category: "wajib", targetPhases: "Fase A, Fase B, Fase C" },
      { id: "pjok", name: "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)", category: "wajib", targetPhases: "Fase A, Fase B, Fase C" },
      { id: "seni-budaya", name: "Seni Budaya", category: "wajib", targetPhases: "Fase A, Fase B, Fase C" },
      { id: "bahasa-inggris", name: "Bahasa Inggris", category: "pilihan", targetPhases: "Fase B, Fase C" },
      { id: "muatan-lokal", name: "Muatan Lokal (Bahasa Daerah Jawa)", category: "muatan-lokal", targetPhases: "Fase A, Fase B, Fase C" },
    ]);
    console.log("✓ 9 Mata Pelajaran Resmi SD Kurikulum Merdeka tersimpan.");
  }

  // 8. Dokumen Sumber Resmi Kurikulum Merdeka
  const existingSources = await db.select().from(schema.curriculumSources);
  let bskapDocId: string | undefined;

  if (existingSources.length === 0) {
    const adminUser = (await db.select().from(schema.users).where(eq(schema.users.role, "admin")))[0];
    const kepsekUser = (await db.select().from(schema.users).where(eq(schema.users.role, "headmaster")))[0];

    const [sourceDoc] = await db
      .insert(schema.curriculumSources)
      .values({
        title: "Keputusan Kepala BSKAP No. 032/H/KR/2024 tentang Capaian Pembelajaran pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah pada Kurikulum Merdeka",
        documentNumber: "032/H/KR/2024",
        issuingAuthority: "Badan Standar, Kurikulum, dan Asesmen Pendidikan Kemendikbudristek",
        publicationYear: 2024,
        fileType: "pdf",
        fileName: "Keputusan_BSKAP_032_H_KR_2024_Capaian_Pembelajaran.pdf",
        fileSize: 15420000,
        needsManualReview: false,
        status: "verified",
        version: "v1.0 (BSKAP 2024)",
        uploadedById: adminUser?.id,
        verifiedById: kepsekUser?.id,
        verifiedAt: new Date(),
      })
      .returning();

    bskapDocId = sourceDoc.id;
    console.log("✓ Dokumen Sumber Resmi BSKAP No. 032/H/KR/2024 tersimpan dan terverifikasi.");
  } else {
    bskapDocId = existingSources[0].id;
  }

  // 9. Capaian Pembelajaran (CP) dan Elemen CP Sah & Verbatim
  const existingCp = await db.select().from(schema.capaianPembelajaran);
  let cpMatBId: string | undefined;

  if (existingCp.length === 0 && bskapDocId) {
    const kepsekUser = (await db.select().from(schema.users).where(eq(schema.users.role, "headmaster")))[0];

    const crypto = await import("crypto");
    const hash = (t: string) => crypto.createHash("sha256").update(t.toLowerCase().trim()).digest("hex");

    const authenticCps = [
      // Matematika - Fase A - Bilangan
      {
        subjectId: "matematika",
        phase: "Fase A" as const,
        element: "Bilangan",
        sourcePage: "Hal. 142",
        sourceSection: "Lampiran I - Capaian Pembelajaran Matematika Fase A",
        text: "Pada akhir fase A, peserta didik menunjukkan pemahaman dan memiliki intuisi bilangan (number sense) pada bilangan cacah sampai 100. Peserta didik dapat membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, serta melakukan komposisi (menyusun) dan dekomposisi (mengurai) bilangan. Peserta didik dapat melakukan operasi penjumlahan dan pengurangan menggunakan benda-benda konkret yang banyaknya sampai 20.",
        status: "approved" as const,
      },
      // Matematika - Fase B - Bilangan
      {
        subjectId: "matematika",
        phase: "Fase B" as const,
        element: "Bilangan",
        sourcePage: "Hal. 143",
        sourceSection: "Lampiran I - Capaian Pembelajaran Matematika Fase B",
        text: "Pada akhir fase B, peserta didik menunjukkan pemahaman dan intuisi bilangan (number sense) pada bilangan cacah sampai 10.000. Mereka dapat membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, menggunakan nilai tempat, melakukan komposisi dan dekomposisi bilangan tersebut. Mereka juga dapat menyelesaikan masalah berkaitan dengan uang menggunakan ribuan sebagai satuan. Mereka dapat melakukan operasi penjumlahan dan pengurangan bilangan cacah sampai 1.000.",
        status: "approved" as const,
      },
      // Matematika - Fase C - Bilangan
      {
        subjectId: "matematika",
        phase: "Fase C" as const,
        element: "Bilangan",
        sourcePage: "Hal. 144",
        sourceSection: "Lampiran I - Capaian Pembelajaran Matematika Fase C",
        text: "Pada akhir fase C, peserta didik dapat menunjukkan pemahaman dan intuisi bilangan (number sense) pada bilangan cacah sampai 1.000.000. Mereka dapat membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, melakukan komposisi dan dekomposisi bilangan tersebut. Mereka juga dapat menyelesaikan masalah yang berkaitan dengan uang. Mereka dapat melakukan operasi penjumlahan, pengurangan, perkalian, dan pembagian bilangan cacah sampai 100.000.",
        status: "approved" as const,
      },
      // Bahasa Indonesia - Fase A - Menyimak
      {
        subjectId: "bahasa-indonesia",
        phase: "Fase A" as const,
        element: "Menyimak",
        sourcePage: "Hal. 29",
        sourceSection: "Lampiran I - Capaian Pembelajaran Bahasa Indonesia Fase A",
        text: "Peserta didik mampu bersikap menjadi pendengar yang penuh perhatian. Peserta didik menunjukkan minat pada tuturan yang didengar serta mampu memahami pesan lisan dan informasi dari media audio, teks aural (teks yang dibacakan dan/atau didengar), instruksi lisan, dan percakapan yang berkaitan dengan diri, keluarga, dan/atau lingkungan.",
        status: "approved" as const,
      },
      // Bahasa Indonesia - Fase B - Menyimak
      {
        subjectId: "bahasa-indonesia",
        phase: "Fase B" as const,
        element: "Menyimak",
        sourcePage: "Hal. 30",
        sourceSection: "Lampiran I - Capaian Pembelajaran Bahasa Indonesia Fase B",
        text: "Peserta didik mampu memahami ide pokok (gagasan) suatu pesan lisan, informasi dari media audio, teks aural (teks yang dibacakan dan/atau didengar), dan instruksi lisan yang berkaitan dengan diri, keluarga, dan/atau lingkungan. Peserta didik mampu mengidentifikasi dan memahami pesan lisan yang disampaikan secara langsung atau melalui media audio.",
        status: "approved" as const,
      },
      // IPAS - Fase B - Pemahaman IPAS
      {
        subjectId: "ipas",
        phase: "Fase B" as const,
        element: "Pemahaman IPAS (Sains dan Sosial)",
        sourcePage: "Hal. 185",
        sourceSection: "Lampiran I - Capaian Pembelajaran IPAS Fase B",
        text: "Peserta didik memahami bentuk dan fungsi panca indra; siklus hidup makhluk hidup; wujud zat dan perubahannya; bentuk serta sumber energi dan perubahannya; gejala kemagnetan dalam kehidupan sehari-hari; jenis gaya dan pengaruhnya terhadap arah, gerak, dan bentuk benda; peran, tugas, dan tanggung jawab serta interaksi sosial yang terjadi di sekitar tempat tinggal dan sekolah; mengenal letak kota/kabupaten dan provinsi tempat tinggalnya melalui peta konvensional/digital; ragam bentang alam serta keterkaitannya dengan profesi masyarakat; keanekaragaman hayati, kearifan lokal, sejarah keluarga dan masyarakat tempat tinggalnya, serta nilai-nilai kearifan lokal yang berlaku di lingkungannya.",
        status: "approved" as const,
      },
    ];

    const insertedCps = await db
      .insert(schema.capaianPembelajaran)
      .values(
        authenticCps.map((cp) => ({
          subjectId: cp.subjectId,
          phase: cp.phase,
          element: cp.element,
          sourceDocumentId: bskapDocId,
          sourcePage: cp.sourcePage,
          sourceSection: cp.sourceSection,
          originalSourceText: cp.text,
          aiInterpretation: null,
          duplicateHash: hash(`${cp.subjectId}:${cp.phase}:${cp.element}:${cp.text}`),
          verificationStatus: cp.status,
          approvedById: kepsekUser?.id,
          approvedAt: new Date(),
        }))
      )
      .returning();

    cpMatBId = insertedCps.find((c) => c.subjectId === "matematika" && c.phase === "Fase B")?.id;
    console.log(`✓ ${insertedCps.length} Capaian Pembelajaran Verbatim BSKAP 032/H/KR/2024 tersimpan.`);
  }

  // 10. Contoh Tujuan Pembelajaran (TP) & Alur Tujuan Pembelajaran (ATP)
  const existingTp = await db.select().from(schema.tujuanPembelajaran);
  if (existingTp.length === 0 && cpMatBId) {
    const teacherB = (await db.select().from(schema.users).where(eq(schema.users.email, "guru.b@sedaeng2.sch.id")))[0];
    const kepsekUser = (await db.select().from(schema.users).where(eq(schema.users.role, "headmaster")))[0];

    const [tp1] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId: cpMatBId,
        subjectId: "matematika",
        phase: "Fase B",
        targetGrade: 3,
        code: "TP-MAT-B.3-01",
        competency: "Membaca dan menulis bilangan cacah",
        contentScope: "Bilangan cacah sampai 1.000",
        description: "Peserta didik dapat membaca dan menulis bilangan cacah sampai dengan 1.000 menggunakan benda konkret dan simbol angka.",
        sourceType: "derived_teacher",
        verificationStatus: "approved",
        createdById: teacherB?.id,
        approvedById: kepsekUser?.id,
        approvedAt: new Date(),
      })
      .returning();

    const [tp2] = await db
      .insert(schema.tujuanPembelajaran)
      .values({
        cpId: cpMatBId,
        subjectId: "matematika",
        phase: "Fase B",
        targetGrade: 3,
        code: "TP-MAT-B.3-02",
        competency: "Menentukan nilai tempat dan membandingkan",
        contentScope: "Nilai tempat ratusan, puluhan, dan satuan",
        description: "Peserta didik dapat menentukan nilai tempat dan membandingkan dua bilangan cacah sampai dengan 1.000.",
        sourceType: "derived_teacher",
        verificationStatus: "approved",
        createdById: teacherB?.id,
        approvedById: kepsekUser?.id,
        approvedAt: new Date(),
      })
      .returning();

    // Prasyarat: TP-MAT-B.3-02 mensyaratkan TP-MAT-B.3-01
    await db.insert(schema.tpPrerequisites).values({
      tpId: tp2.id,
      prerequisiteTpId: tp1.id,
      prerequisiteType: "wajib",
      notes: "Penguasaan membaca simbol angka sampai 1.000 wajib sebelum menentukan nilai tempat.",
    });

    // Rencana ATP
    const [atp] = await db
      .insert(schema.atpPlans)
      .values({
        title: "ATP Matematika Fase B (Kelas 3 & 4) SDN SEDAENG II",
        subjectId: "matematika",
        phase: "Fase B",
        academicYear: "2024/2025",
        totalHours: 72,
        status: "approved",
        authorId: teacherB?.id,
        approvedById: kepsekUser?.id,
        approvedAt: new Date(),
      })
      .returning();

    await db.insert(schema.atpItems).values([
      {
        atpPlanId: atp.id,
        tpId: tp1.id,
        sequenceOrder: 1,
        allocatedHours: 6,
        targetGrade: 3,
        semester: "Ganjil",
        multigradeNotes: "Siswa kelas 3 latihan bilangan konkret saat kelas 4 mengerjakan proyek bilangan ribuan.",
      },
      {
        atpPlanId: atp.id,
        tpId: tp2.id,
        sequenceOrder: 2,
        allocatedHours: 8,
        targetGrade: 3,
        semester: "Ganjil",
        multigradeNotes: "Tutor sebaya dengan siswa kelas 4 untuk permainan kartu nilai tempat.",
      },
    ]);

    console.log("✓ Tujuan Pembelajaran (TP) & Alur Tujuan Pembelajaran (ATP) terpadu tersimpan.");
  }

  console.log("Pengisian data awal (seed sintetis & bank kurikulum) selesai dengan sukses!");
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
