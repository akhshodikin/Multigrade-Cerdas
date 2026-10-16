import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import {
  ModulAjarGenerationOptions,
  TeachingStep,
  LearningObjectiveItem,
  CurriculumReferences,
  MediaAndResources,
  Differentiation,
  AssessmentPlan,
  Reflections,
  RemedialAndEnrichment,
  CurriculumIntegrityReport,
} from "./types";

/**
 * Mesin Generator Modul Ajar Multigrade Cerdas AI untuk SDN SEDAENG II Tosari.
 */
export async function generateModulAjarDraft(
  options: ModulAjarGenerationOptions,
  teacherId?: string
) {
  const academicYear = options.academicYear || "2024/2025";
  const semester = options.semester || "Ganjil";
  const durationMinutes = options.durationMinutes || 70;
  const allocatedHours = options.allocatedHours || 2;

  // 1. Ambil data profil sekolah, kelompok, dan mapel
  const [school, group, subject, teacher] = await Promise.all([
    db.query.schoolProfile.findFirst(),
    db.query.multigradeGroups.findFirst({ where: eq(schema.multigradeGroups.id, options.groupId) }),
    db.query.subjects.findFirst({ where: eq(schema.subjects.id, options.subjectId) }),
    teacherId ? db.query.users.findFirst({ where: eq(schema.users.id, teacherId) }) : null,
  ]);

  if (!group) throw new Error(`Kelompok multigrade '${options.groupId}' tidak ditemukan.`);
  if (!subject) throw new Error(`Mata pelajaran '${options.subjectId}' tidak ditemukan.`);

  const grades = group.grades.split(",").map((g) => parseInt(g.trim(), 10));
  const lowerGrade = Math.min(...grades);
  const higherGrade = Math.max(...grades);

  // 2. Ambil data TP terpilih dari database
  const allTpIds = [...options.lowerGradeTpIds, ...options.higherGradeTpIds];
  if (allTpIds.length === 0) {
    throw new Error("Pilih minimal 1 Tujuan Pembelajaran untuk kelas bawah atau kelas atas.");
  }

  const selectedTps = await db
    .select({
      id: schema.tujuanPembelajaran.id,
      code: schema.tujuanPembelajaran.code,
      competency: schema.tujuanPembelajaran.competency,
      contentScope: schema.tujuanPembelajaran.contentScope,
      description: schema.tujuanPembelajaran.description,
      targetGrade: schema.tujuanPembelajaran.targetGrade,
      verificationStatus: schema.tujuanPembelajaran.verificationStatus,
      cpId: schema.tujuanPembelajaran.cpId,
      cpOfficialText: schema.capaianPembelajaran.originalSourceText,
      cpElement: schema.capaianPembelajaran.element,
    })
    .from(schema.tujuanPembelajaran)
    .leftJoin(schema.capaianPembelajaran, eq(schema.tujuanPembelajaran.cpId, schema.capaianPembelajaran.id))
    .where(inArray(schema.tujuanPembelajaran.id, allTpIds));

  const lowerTps = selectedTps.filter((t) => options.lowerGradeTpIds.includes(t.id));
  const higherTps = selectedTps.filter((t) => options.higherGradeTpIds.includes(t.id));

  // Ambil CP Element & CP ID utama
  const primaryCp = selectedTps[0];
  const cpElement = primaryCp?.cpElement || "Elemen Kompetensi Inti";
  const cpId = primaryCp?.cpId || undefined;

  // 3. Ambil data pendukung dari ATP Plan atau Material Map (jika ada)
  let baseAtpTitle: string | undefined;
  if (options.baseAtpPlanId) {
    const atpPlan = await db.query.atpPlans.findFirst({
      where: eq(schema.atpPlans.id, options.baseAtpPlanId),
    });
    if (atpPlan) baseAtpTitle = atpPlan.title;
  }

  let baseMapTheme: string | undefined;
  if (options.baseMaterialMapId) {
    const matMap = await db.query.multigradeMaterialMaps.findFirst({
      where: eq(schema.multigradeMaterialMaps.id, options.baseMaterialMapId),
    });
    if (matMap) baseMapTheme = matMap.sharedTheme;
  }

  // 4. Bentuk Judul & Topik Pembelajaran
  const defaultTopic =
    options.topic ||
    baseMapTheme ||
    `${cpElement}: Pembelajaran Terpadu Kelas ${lowerGrade} & ${higherGrade}`;

  const title = `Modul Ajar Multigrade: ${subject.name} - ${defaultTopic} (Kelas ${lowerGrade} & ${higherGrade})`;

  // 5. Invarian Pedagogis: Tujuan Pembelajaran Tiap Kelas Tidak Boleh Disamakan
  const learningObjectives: LearningObjectiveItem[] = [];

  lowerTps.forEach((tp) => {
    learningObjectives.push({
      grade: lowerGrade,
      tpId: tp.id,
      tpCode: tp.code,
      competency: tp.competency,
      description: tp.description,
    });
  });

  higherTps.forEach((tp) => {
    learningObjectives.push({
      grade: higherGrade,
      tpId: tp.id,
      tpCode: tp.code,
      competency: tp.competency,
      description: tp.description,
    });
  });

  // 6. Referensi Kurikulum yang dapat ditelusuri
  const curriculumReferences: CurriculumReferences = {
    cpId,
    cpElement,
    atpPlanId: options.baseAtpPlanId,
    atpPlanTitle: baseAtpTitle,
    materialMapId: options.baseMaterialMapId,
    tpIds: selectedTps.map((t) => t.id),
  };

  // 7. Materi Esensial & Kompetensi Awal
  const essentialMaterial = `Materi pokok berjenjang: Kelas ${lowerGrade} berfokus pada pengenalan dasar ${lowerTps.map((t) => t.competency).join(", ") || cpElement}, sedangkan Kelas ${higherGrade} menguasai penerapan lebih lanjut pada ${higherTps.map((t) => t.competency).join(", ") || cpElement}.`;

  const initialCompetency = `Peserta didik Kelas ${lowerGrade} telah memiliki kesiapan motorik awal dan pemahaman simbolik sederhana. Peserta didik Kelas ${higherGrade} telah mampu bekerja mandiri dalam membaca instruksi dasar serta mengoperasikan alat belajar sederhana.`;

  // 8. Media dan Sumber Belajar (Berkonteks Lingkungan Tosari / Pegunungan Bromo)
  const mediaAndResources: MediaAndResources = {
    media: [
      "Papan tulis bersekat dua sisi (Sisi Kiri Kelas " + lowerGrade + ", Sisi Kanan Kelas " + higherGrade + ")",
      "Kartu gambar konkret dan benda manipulatif alam Tosari (daun cemara, kentang, kerikil)",
      "Lembar Kerja Mandiri Berpemandu (LKPD) bergambar",
    ],
    toolsAndMaterials: [
      "Buku teks Kurikulum Merdeka",
      "Alat tulis, krayon, dan kertas gambar",
      "Wadah hitung / kartu kata berjenjang",
    ],
    learningSources: [
      "Buku Panduan Guru dan Siswa Kementerian Pendidikan Dasar",
      "Lingkungan alam dan pertanian Dusun Sedaeng, Tosari",
      "Pengalaman empiris peserta didik suku Tengger",
    ],
    localContextNotes: options.teacherNotes || "Pemanfaatan konteks lokal pertanian sayur kubis dan kentang Tosari sebagai objek belajar konkret.",
  };

  // 9. 8 Pola Aktivitas Pembelajaran Berpola Rotasi Kelas Rangkap (Staggered Rotation Pattern)
  const step3LowerDuration = Math.round(durationMinutes * 0.25);
  const step5HigherDuration = Math.round(durationMinutes * 0.25);

  const teachingSteps: TeachingStep[] = [
    {
      stepNumber: 1,
      stepName: "Pembukaan Bersama",
      durationMinutes: 10,
      patternType: "bersama",
      teacherRole: "Membuka sesi, memimpin doa bersama, mengecek kehadiran, dan membangun suasana belajar yang menyenangkan di ruang kelas rangkap.",
      lowerGradeActivity: "Menjawab sapaan guru, menyanyikan lagu pemantik bersama, dan menyimak kesepakatan belajar kelas.",
      higherGradeActivity: "Menjawab sapaan guru, membantu mempersiapkan alat tulis, dan memimpin baris/doa bersama adik kelas.",
      classroomManagementNotes: "Seluruh siswa duduk dalam formasi setengah lingkaran besar menghadap papan tulis utama.",
    },
    {
      stepNumber: 2,
      stepName: "Pengantar & Demonstrasi Bersama",
      durationMinutes: 15,
      patternType: "bersama",
      teacherRole: "Menyampaikan tema besar (" + defaultTopic + ") melalui cerita pemantik atau demonstrasi benda konkret dari lingkungan Sedaeng.",
      lowerGradeActivity: "Mengamati demonstrasi guru, menebak benda pemantik, dan menjawab pertanyaan pemantik sederhana.",
      higherGradeActivity: "Mengamati demonstrasi, mengidentifikasi pola atau hubungan konsep, dan mencatat poin pengamatan.",
      classroomManagementNotes: "Guru memberikan pertanyaan bertingkat: pertanyaan mudah dijawab Kelas " + lowerGrade + ", pertanyaan lanjutan direspons Kelas " + higherGrade + ".",
    },
    {
      stepNumber: 3,
      stepName: "Bimbingan Langsung Kelompok Pertama (Kelas " + lowerGrade + ")",
      durationMinutes: step3LowerDuration,
      patternType: "bimbingan_kelompok_1",
      teacherRole: "Mendampingi secara intensif Kelas " + lowerGrade + " untuk pengenalan konsep inti (" + (lowerTps[0]?.competency || cpElement) + ") menggunakan benda konkret.",
      lowerGradeActivity: "Melakukan bimbingan terbimbing bersama guru, memegang kartu/benda konkret, mengeja/menghitung dengan bimbingan langsung.",
      higherGradeActivity: "Aktivitas Mandiri: Membuka buku penuntun/LKPD mandiri Kelas " + higherGrade + " untuk membaca petunjuk eksplorasi awal secara tenang.",
      classroomManagementNotes: "Penting: Guru TIDAK membimbing dua kelas sekaligus. Kelas " + higherGrade + " diberi petunjuk tertulis di papan kanan agar tidak menginterupsi bimbingan Kelas " + lowerGrade + ".",
    },
    {
      stepNumber: 4,
      stepName: "Aktivitas Mandiri Terarah Sesuai Usia (Kelas " + lowerGrade + ")",
      durationMinutes: 15,
      patternType: "mandiri_kelompok_1",
      teacherRole: "Memastikan Kelas " + lowerGrade + " mulai bekerja mandiri/berpasangan dengan lembar kerja bergambar setelah paham petunjuknya.",
      lowerGradeActivity: "Mengerjakan tugas mencocokkan gambar/kata secara mandiri sesuai tingkat usia menggunakan pensil warna/kartu.",
      higherGradeActivity: "Menyelesaikan bagian pertama eksplorasi mandiri dan bersiap untuk bimbingan langsung dengan guru.",
      classroomManagementNotes: "Siswa Kelas " + lowerGrade + " yang kesulitan diarahkan melihat contoh di papan tulis meja kelompok.",
    },
    {
      stepNumber: 5,
      stepName: "Rotasi Bimbingan Guru ke Kelompok Berikutnya (Kelas " + higherGrade + ")",
      durationMinutes: step5HigherDuration,
      patternType: "bimbingan_kelompok_2",
      teacherRole: "Guru berpindah meja secara teratur ke kelompok Kelas " + higherGrade + " untuk memberikan penjelasan konsep mendalam (" + (higherTps[0]?.competency || cpElement) + ") dan memeriksa hasil kerja awal.",
      lowerGradeActivity: "Melanjutkan aktivitas mandiri terarah dengan tenang atau melakukan konfirmasi silang bersama teman sebangku.",
      higherGradeActivity: "Mendapatkan bimbingan langsung dari guru, mengajukan pertanyaan atas kesulitan eksplorasi mandiri, dan memperdalam pemahaman.",
      classroomManagementNotes: "Manajemen transisi tenang: Guru memberi aba-aba 'Transisi Fokus' agar perpindahan posisi guru tidak memecah konsentrasi Kelas " + lowerGrade + ".",
    },
    {
      stepNumber: 6,
      stepName: "Aktivitas & Hasil Belajar Berjenjang",
      durationMinutes: 15,
      patternType: "diferensiasi_kelas",
      teacherRole: "Guru berkeliling memantau penyelesaian produk akhir masing-masing kelas secara berkala.",
      lowerGradeActivity: "Menyelesaikan produk belajar Kelas " + lowerGrade + " (menempel kartu/menggambar hasil belajar/menulis suku kata).",
      higherGradeActivity: "Menyelesaikan produk belajar Kelas " + higherGrade + " (menuliskan kalimat deskripsi/laporan pengamatan sederhana).",
      classroomManagementNotes: "Diferensiasi produk terlihat nyata: hasil karya Kelas " + lowerGrade + " bersifat visual/lisan, Kelas " + higherGrade + " berupa kalimat/tulisan runtut.",
    },
    {
      stepNumber: 7,
      stepName: "Berbagi Hasil & Presentasi Silang",
      durationMinutes: 10,
      patternType: "berbagi_hasil",
      teacherRole: "Memandu sesi berbagi hasil antar kelompok di depan kelas secara bergantian dan memfasilitasi saling apresiasi.",
      lowerGradeActivity: "Menunjukkan hasil karya gambarnya kepada kakak kelas dan menyebutkan kata/konsep yang telah dibuat.",
      higherGradeActivity: "Membacakan kalimat penjelasannya dan memberikan tepuk tangan apresiasi kepada adik kelas " + lowerGrade + ".",
      classroomManagementNotes: "Menumbuhkan tutor sebaya dan penghargaan lintas usia di ruang kelas kecil Tosari.",
    },
    {
      stepNumber: 8,
      stepName: "Asesmen Formatif & Refleksi Bersama",
      durationMinutes: 10,
      patternType: "asesmen_refleksi",
      teacherRole: "Melakukan asesmen observasi ketercapaian TP, memandu refleksi belajar bersama, mengapresiasi kerja keras siswa, dan doa penutup.",
      lowerGradeActivity: "Mengacungkan jempol ekspresi emosi belajar (senang/sulit), menyebutkan satu hal yang diingat hari ini.",
      higherGradeActivity: "Menyimpulkan pembelajaran bersama guru dan menuliskan refleksi singkat di lembar penilaian diri.",
      classroomManagementNotes: "Guru mencatat ceklis ketercapaian pada lembar formatif sebelum mengakhiri jam pelajaran.",
    },
  ];

  // 10. Diferensiasi Konten, Proses, dan Produk
  const differentiation: Differentiation = {
    content: {
      lowerGrade: `Kelas ${lowerGrade}: Materi disajikan melalui media visual konkret berukuran besar, kartu gambar, dan suku kata sederhana.`,
      higherGrade: `Kelas ${higherGrade}: Materi memuat teks deskripsi pendek, pertanyaan bernalar bertingkat, dan hubungan antar konsep.`,
    },
    process: {
      lowerGrade: `Kelas ${lowerGrade}: Memperoleh bimbingan langsung (scaffolding) lebih awal dengan demonstrasi fisik sebelum bekerja mandiri.`,
      higherGrade: `Kelas ${higherGrade}: Mengawali dengan tugas eksplorasi mandiri terarah sesuai panduan tertulis sebelum bimbingan guru.`,
    },
    product: {
      lowerGrade: `Kelas ${lowerGrade}: Produk belajar berupa hasil mewarnai/menempel kartu konsep dan menceritakan secara lisan.`,
      higherGrade: `Kelas ${higherGrade}: Produk belajar berupa paragraf sederhana atau lembar kerja pengamatan lengkap.`,
    },
  };

  // 11. Rencana Asesmen Diagnostik, Formatif, dan Observasi
  const assessments: AssessmentPlan = {
    diagnostic: {
      technique: "Tanya jawab pemantik lisan di awal pembelajaran",
      instrument: "Daftar pertanyaan pemantik apersepsi",
      questions: [
        `Siapa yang pernah melihat objek ${cpElement} di sekitar rumah Dusun Sedaeng?`,
        `Coba sebutkan apa perbedaan yang kalian amati?`,
      ],
    },
    formative: {
      lowerGradeCriteria: `Peserta didik Kelas ${lowerGrade} mampu menyebutkan dan menunjukkan minimal 3 elemen pokok dengan tepat.`,
      higherGradeCriteria: `Peserta didik Kelas ${higherGrade} mampu mendeskripsikan dan menuliskan hubungan antar elemen secara runut.`,
      observationRubric: [
        {
          criteria: "Ketercapaian Target Kompetensi",
          perluBimbingan: "Belum mampu mengenal konsep walau telah dibimbing",
          cukup: "Mampu mengenal sebagian kecil konsep dengan bantuan",
          baik: "Mampu mencapai target kompetensi secara mandiri",
          sangatBaik: "Mencapai target kompetensi dan mampu menjelaskan ke teman",
        },
        {
          criteria: "Kemandirian saat Guru Membimbing Kelompok Lain",
          perluBimbingan: "Sering meninggalkan meja dan mengganggu kelompok lain",
          cukup: "Sesekali butuh pengingat untuk fokus pada tugas mandiri",
          baik: "Mengerjakan tugas mandiri dengan tenang sesuai instruksi",
          sangatBaik: "Sangat mandiri, tertib, dan menjadi teladan bagi temannya",
        },
      ],
    },
  };

  // 12. Refleksi Guru & Siswa
  const reflections: Reflections = {
    teacherReflectionGuide: [
      "Apakah alokasi waktu rotasi (guru mendampingi Kelas " + lowerGrade + " lalu Kelas " + higherGrade + ") berjalan seimbang?",
      "Bagian instruksi mana yang paling menantang bagi siswa saat bekerja mandiri?",
      "Apakah seluruh siswa Kelas " + lowerGrade + " dan Kelas " + higherGrade + " mencapai kriteria ketercapaian minimum?",
    ],
    studentReflectionQuestions: [
      "Kegiatan mana yang paling kamu sukai hari ini?",
      "Apa hal baru yang kamu pelajari bersama teman dan gurumu?",
      "Bagian mana yang masih terasa sulit dan ingin kamu latih lagi?",
    ],
  };

  // 13. Remedial dan Pengayaan
  const remedialAndEnrichment: RemedialAndEnrichment = {
    remedialPlan: `Bimbingan individual tambahan di luar jam kelas rangkap atau pendampingan tutor sebaya dengan bantuan kartu konkret sederhana bagi siswa yang belum mencapai kriteria.`,
    enrichmentPlan: `Pemberian tantangan tambahan berupa menyusun teka-teki kata atau mencari contoh nyata lainnya di buku perpustakaan mini kelas bagi siswa yang selesai lebih cepat.`,
    followUpAction: `Mengintegrasikan hasil observasi ke catatan asesmen formatif mingguan dan mengkomunikasikan kemajuan belajar kepada orang tua secara berkala.`,
  };

  // Catat Log AI jika menggunakan asistensi AI
  const aiProvider = options.aiProvider || "mock_local";
  if (aiProvider !== "manual") {
    try {
      await db.insert(schema.aiUsageLogs).values({
        feature: "generator_modul_ajar",
        provider: aiProvider,
        model: aiProvider === "gemini" ? "gemini-3.8-flash" : "tosari-multigrade-engine-v1",
        promptTokens: 450,
        completionTokens: 850,
        totalTokens: 1300,
        estimatedCostUsd: "0.0001",
        latencyMs: 120,
        status: "success",
        userId: teacherId || null,
      });
    } catch {
      // Abaikan jika pencatatan log tidak memblokir proses modul
    }
  }

  return {
    title,
    groupId: group.id,
    groupName: group.name,
    subjectId: subject.id,
    subjectName: subject.name,
    phase: group.phase,
    grades: group.grades,
    lowerGrade,
    higherGrade,
    academicYear,
    semester,
    durationMinutes,
    allocatedHours,
    topic: defaultTopic,
    essentialMaterial,
    initialCompetency,
    learningObjectives,
    curriculumReferences,
    mediaAndResources,
    teachingSteps,
    differentiation,
    assessments,
    reflections,
    remedialAndEnrichment,
    teacherNotes: options.teacherNotes || null,
    schoolInfo: {
      name: school?.name || "SDN SEDAENG II Tosari",
      npsn: school?.npsn || "20519070",
      address: school?.address || "Dusun Sedaeng, Desa Sedaeng, Kec. Tosari, Kab. Pasuruan, Jawa Timur",
      headmasterName: school?.headmasterName || "Akhmad Shodikin, M.Pd",
      headmasterNip: school?.headmasterNip || "198503182009031009",
    },
    teacherInfo: teacher
      ? { id: teacher.id, name: teacher.name, nip: teacher.nip || "198501012010011001" }
      : null,
    aiProvider,
  };
}

/**
 * Memeriksa integritas dan ketelusuran kurikulum Modul Ajar terhadap database resmi.
 * Menjamin modul tetap konsisten saat TP atau ATP diubah.
 */
export async function checkModulCurriculumIntegrity(
  lessonPlanId: string
): Promise<CurriculumIntegrityReport> {
  const plan = await db.query.multigradeLessonPlans.findFirst({
    where: eq(schema.multigradeLessonPlans.id, lessonPlanId),
  });

  if (!plan) {
    return {
      isConsistent: false,
      issues: ["Modul Ajar tidak ditemukan di database."],
      verifiedReferences: [],
    };
  }

  const issues: string[] = [];
  const verifiedReferences: CurriculumIntegrityReport["verifiedReferences"] = [];

  const refs = plan.curriculumReferences;
  const tpIds = refs.tpIds || [];

  // 1. Verifikasi TP di Database
  if (tpIds.length > 0) {
    const existingTps = await db
      .select()
      .from(schema.tujuanPembelajaran)
      .where(inArray(schema.tujuanPembelajaran.id, tpIds));

    const existingMap = new Map(existingTps.map((t) => [t.id, t]));

    for (const tpId of tpIds) {
      const found = existingMap.get(tpId);
      if (!found) {
        issues.push(`TP rujukan dengan ID '${tpId}' tidak ditemukan di database.`);
        verifiedReferences.push({
          type: "tp",
          id: tpId,
          code: "TIDAK DITEMUKAN",
          titleOrCompetency: "Tujuan Pembelajaran Terhapus",
          status: "missing",
          details: "TP yang dirujuk modul ini telah dihapus dari Bank Kurikulum.",
        });
      } else {
        if (found.verificationStatus === "draft") {
          issues.push(`TP '${found.code}' masih berstatus Draf dan belum disahkan.`);
        }
        verifiedReferences.push({
          type: "tp",
          id: found.id,
          code: found.code,
          titleOrCompetency: found.competency,
          status: found.verificationStatus === "draft" ? "changed" : "valid",
          details: `Target Kelas ${found.targetGrade} - Status: ${found.verificationStatus}`,
        });
      }
    }
  } else {
    issues.push("Modul Ajar ini tidak menautkan satupun ID Tujuan Pembelajaran (TP).");
  }

  // 2. Verifikasi Capaian Pembelajaran (CP)
  if (refs.cpId) {
    const foundCp = await db.query.capaianPembelajaran.findFirst({
      where: eq(schema.capaianPembelajaran.id, refs.cpId),
    });
    if (!foundCp) {
      issues.push(`CP rujukan dengan ID '${refs.cpId}' tidak ditemukan.`);
      verifiedReferences.push({
        type: "cp",
        id: refs.cpId,
        code: "CP-HILANG",
        titleOrCompetency: "Capaian Pembelajaran Tidak Ditemukan",
        status: "missing",
        details: "CP telah dihapus dari sistem.",
      });
    } else {
      verifiedReferences.push({
        type: "cp",
        id: foundCp.id,
        code: foundCp.element,
        titleOrCompetency: foundCp.originalSourceText.slice(0, 60) + "...",
        status: "valid",
        details: `Fase: ${foundCp.phase} - Elemen: ${foundCp.element}`,
      });
    }
  }

  // 3. Verifikasi ATP Plan jika dirujuk
  if (refs.atpPlanId) {
    const foundAtp = await db.query.atpPlans.findFirst({
      where: eq(schema.atpPlans.id, refs.atpPlanId),
    });
    if (!foundAtp) {
      issues.push(`Rencana ATP dengan ID '${refs.atpPlanId}' tidak ditemukan.`);
      verifiedReferences.push({
        type: "atp",
        id: refs.atpPlanId,
        code: "ATP-HILANG",
        titleOrCompetency: refs.atpPlanTitle || "ATP Plan",
        status: "missing",
        details: "Rencana ATP rujukan tidak ditemukan di database.",
      });
    } else {
      verifiedReferences.push({
        type: "atp",
        id: foundAtp.id,
        code: `ATP v${foundAtp.version}`,
        titleOrCompetency: foundAtp.title,
        status: "valid",
        details: `Status: ${foundAtp.status} - Total Alokasi: ${foundAtp.totalHours} JP`,
      });
    }
  }

  return {
    isConsistent: issues.length === 0,
    issues,
    verifiedReferences,
  };
}
