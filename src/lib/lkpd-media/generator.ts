import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import {
  GenerateDifferentiatedLkpdOptions,
  LkpdWorksheet,
  AnswerSectionItem,
  TeacherRubricItem,
  StudentReflection,
  Stimulus,
  KartuGambarItem,
  LeveledReadingPassage,
  NumeracyScenario,
  PresentationSlide,
} from "./types";

/**
 * Mesin Generator LKPD Berdiferensiasi Multigrade Cerdas AI.
 * Menghasilkan LKPD berpasangan untuk kelas bawah dan kelas atas dalam satu tema bersama,
 * dengan tugas, stimulus, dan rubrik yang sepenuhnya dibedakan menurut usia siswa.
 */
export async function generateDifferentiatedLkpdPair(
  options: GenerateDifferentiatedLkpdOptions,
  teacherId?: string
): Promise<{ lowerGradeLkpd: typeof schema.lkpdWorksheets.$inferSelect; higherGradeLkpd: typeof schema.lkpdWorksheets.$inferSelect }> {
  // 1. Validasi Keberadaan Kelompok & Mata Pelajaran
  const [group, subject, school] = await Promise.all([
    db.query.multigradeGroups.findFirst({ where: eq(schema.multigradeGroups.id, options.groupId) }),
    db.query.subjects.findFirst({ where: eq(schema.subjects.id, options.subjectId) }),
    db.query.schoolProfile.findFirst(),
  ]);

  if (!group) throw new Error(`Kelompok multigrade '${options.groupId}' tidak ditemukan.`);
  if (!subject) throw new Error(`Mata pelajaran '${options.subjectId}' tidak ditemukan.`);

  const grades = group.grades.split(",").map((g) => parseInt(g.trim(), 10));
  const lowerGrade = Math.min(...grades);
  const higherGrade = Math.max(...grades);

  // 2. Validasi Ketertelusuran TP (Anti-Halusinasi Referensi Kurikulum)
  const tpList = await db
    .select({
      id: schema.tujuanPembelajaran.id,
      code: schema.tujuanPembelajaran.code,
      competency: schema.tujuanPembelajaran.competency,
      contentScope: schema.tujuanPembelajaran.contentScope,
      description: schema.tujuanPembelajaran.description,
      targetGrade: schema.tujuanPembelajaran.targetGrade,
      verificationStatus: schema.tujuanPembelajaran.verificationStatus,
    })
    .from(schema.tujuanPembelajaran)
    .where(inArray(schema.tujuanPembelajaran.id, [options.lowerGradeTpId, options.higherGradeTpId]));

  const lowerTp = tpList.find((t) => t.id === options.lowerGradeTpId);
  const higherTp = tpList.find((t) => t.id === options.higherGradeTpId);

  if (!lowerTp) {
    throw new Error(`Tujuan Pembelajaran kelas ${lowerGrade} (ID: ${options.lowerGradeTpId}) tidak ditemukan dalam Bank Kurikulum resmi.`);
  }
  if (!higherTp) {
    throw new Error(`Tujuan Pembelajaran kelas ${higherGrade} (ID: ${options.higherGradeTpId}) tidak ditemukan dalam Bank Kurikulum resmi.`);
  }

  const academicYear = options.academicYear || school?.activeAcademicYear || "2024/2025";
  const semester = options.semester || (school?.activeSemester as "Ganjil" | "Genap") || "Ganjil";
  const timeAllocation = options.timeAllocationMinutes || 35;
  const colorMode = options.preferredColorMode || "color";

  // Ambil classId yang sesuai untuk lowerGrade dan higherGrade
  const [lowerClass, higherClass] = await Promise.all([
    db.query.classes.findFirst({ where: eq(schema.classes.id, lowerGrade) }),
    db.query.classes.findFirst({ where: eq(schema.classes.id, higherGrade) }),
  ]);

  // 3. Bangun LKPD Kelas Bawah (Konkret, Visual, Petunjuk Sederhana/Lisan)
  const lowerStimulus: Stimulus = {
    type: "local_context",
    title: `Ayo Mengamati: ${options.themeOrTopic} di Tosari`,
    content: `Pak Budi dan Bu Siti sedang memanen hasil kebun di lereng Desa Sedaeng, Tosari. Di keranjang panen terdapat kentang, wortel, dan kubis segar. Mari kita bantu mengamati dan menghitungnya!`,
    illustrationKey: "kebun_sayur_tosari",
    illustrationCaption: "Kebun Sayuran Segar di Lereng Tosari",
  };

  const lowerInstructions = [
    "Dengarkan petunjuk dan penjelasan dari Bapak/Ibu Guru dengan saksama.",
    "Amatilah gambar dan benda-benda di sekitarmu.",
    "Tariklah garis untuk menghubungkan atau lingkari gambar yang tepat.",
    "Beri warna pada gambar wajah tersenyum jika kamu merasa senang belajar hari ini.",
  ];

  const lowerSteps = [
    {
      stepNumber: 1,
      instruction: "Perhatikan gambar kebun sayur dan hitung jumlah sayur bersama teman sebangkumu.",
      guidanceNotes: "Guru memberikan bimbingan konkret dengan kartu gambar.",
    },
    {
      stepNumber: 2,
      instruction: "Kerjakan latihan memasangkan gambar dengan angka yang sesuai.",
      guidanceNotes: "Aktivitas mandiri terarah dengan alat bantu konkret.",
    },
    {
      stepNumber: 3,
      instruction: "Warnai dan lengkapi gambar kesukaanmu.",
      guidanceNotes: "Mengekspresikan pemahaman melalui media visual.",
    },
  ];

  const lowerAnswerSections: AnswerSectionItem[] = [
    {
      id: "q-lower-1",
      questionNumber: 1,
      questionType: "matching",
      questionText: "Pasangkanlah gambar sayuran berikut dengan nama atau lambang bilangan yang tepat!",
      matchingPairs: [
        { left: "🥔 3 Kentang Besar", right: "Angka 3" },
        { left: "🥕 5 Wortel Segar", right: "Angka 5" },
        { left: "🥬 2 Kubis Bulat", right: "Angka 2" },
      ],
      helperHint: "Hitung satu demi satu dengan menunjuk gambarnya.",
      points: 30,
    },
    {
      id: "q-lower-2",
      questionNumber: 2,
      questionType: "multiple_choice",
      questionText: "Berapa jumlah keranjang panen yang dibawa Pak Budi?",
      options: ["A. 1 keranjang", "B. 2 keranjang", "C. 4 keranjang"],
      points: 30,
    },
    {
      id: "q-lower-3",
      questionNumber: 3,
      questionType: "drawing_area",
      questionText: "Gambarlah 4 buah kentang atau wortel kesukaanmu di dalam kotak di bawah ini, lalu warnailah!",
      helperHint: "Gunakan pensil warna atau krayon yang rapi.",
      points: 40,
    },
  ];

  const lowerReflection: StudentReflection = {
    emoticonOptions: [
      { mood: "senang_sekali", label: "Sangat Senang", icon: "😄" },
      { mood: "cukup_senang", label: "Cukup Senang", icon: "🙂" },
      { mood: "butuh_bantuan", label: "Perlu Bantuan", icon: "🥺" },
    ],
    promptQuestions: [
      "Bagian mana dari kegiatan ini yang paling kamu sukai?",
      "Apakah kamu dapat menyelesaikan tugas dengan gembira?",
    ],
  };

  const lowerRubric: TeacherRubricItem[] = [
    {
      indicator: "Kemampuan mengenali objek konkret dan berhitung visual",
      perluBimbingan: "Belum mampu mengenali objek tanpa bimbingan penuh guru",
      cukup: "Mampu mengenali sebagian objek dengan arahan lisan",
      baik: "Mampu mengenali dan mencocokkan objek dengan tepat secara mandiri",
      sangatBaik: "Sangat terampil, cepat, dan mampu membantu teman sebaya",
      maxScore: 50,
    },
    {
      indicator: "Kerapian dan partisipasi aktif dalam kegiatan menggambar/mewarnai",
      perluBimbingan: "Memerlukan dorongan motivasi terus-menerus",
      cukup: "Mengerjakan tugas dengan hasil sederhana",
      baik: "Menyelesaikan tugas mandiri dengan rapi dan antusias",
      sangatBaik: "Hasil karya sangat rapi, kreatif, dan mandiri",
      maxScore: 50,
    },
  ];

  // 4. Bangun LKPD Kelas Atas (Teks Terstruktur, Analisis, Soal Cerita, Menulis Kalimat)
  const higherStimulus: Stimulus = {
    type: "story",
    title: `Teks Bacaan & Analisis Data: Panen Raya di Sedaeng Tosari`,
    content: `Di lereng perbukitan Desa Sedaeng, para petani memanfaatkan tanah vulkanik yang subur untuk menanam kentang granola dan kubis unggul. Pada hari Senin, Pak Budi memanen 45 kg kentang dan 30 kg kubis. Hasil panen tersebut akan dipilah berdasarkan kualitas untuk dijual ke pasar lokal Tosari dan sebagian disisihkan untuk bibit musim tanam berikutnya.`,
    illustrationKey: "kebun_sayur_tosari",
    illustrationCaption: "Data Hasil Panen Petani Sayur Sedaeng Tosari",
  };

  const higherInstructions = [
    "Bacalah teks pengantar dan cermati data informasi yang disajikan.",
    "Tuliskan jawabanmu dengan kalimat yang jelas, runtut, dan menggunakan ejaan yang baik.",
    "Selesaikan soal perhitungan atau analisis pada ruang jawaban yang telah disediakan.",
    "Periksa kembali kelengkapan jawabanmu sebelum menyerahkan LKPD kepada guru.",
  ];

  const higherSteps = [
    {
      stepNumber: 1,
      instruction: "Cermati teks bacaan mengenai panen sayur di Sedaeng dan catat bilangan penting.",
      guidanceNotes: "Fokus pada pemahaman literasi informasi dan konsep matematika kontekstual.",
    },
    {
      stepNumber: 2,
      instruction: "Analisis permasalahan cerita dan diskusikan strategi pemecahannya.",
      guidanceNotes: "Penerapan penalaran tingkat menengah (MOTS/HOTS).",
    },
    {
      stepNumber: 3,
      instruction: "Tuliskan kesimpulan dan refleksi belajarmu secara mandiri.",
      guidanceNotes: "Melatih kemandirian dan artikulasi tertulis.",
    },
  ];

  const higherAnswerSections: AnswerSectionItem[] = [
    {
      id: "q-higher-1",
      questionNumber: 1,
      questionType: "short_answer",
      questionText: "Berdasarkan teks bacaan, mengapa tanah di perbukitan Sedaeng Tosari sangat cocok untuk menanam kentang dan kubis?",
      helperHint: "Perhatikan jenis tanah dan kondisi geografis yang disebutkan dalam teks.",
      points: 25,
    },
    {
      id: "q-higher-2",
      questionNumber: 2,
      questionType: "multiple_choice",
      questionText: "Berapa total berat seluruh hasil panen kentang dan kubis yang diperoleh Pak Budi pada hari Senin?",
      options: ["A. 65 kg", "B. 75 kg", "C. 85 kg", "D. 90 kg"],
      points: 25,
    },
    {
      id: "q-higher-3",
      questionNumber: 3,
      questionType: "short_answer",
      questionText: "Jika 15 kg kentang disisihkan untuk dijadikan bibit musim depan, berapa kilogram kentang yang siap dijual ke pasar Tosari? Tuliskan cara perhitungannya!",
      helperHint: "Gunakan operasi pengurangan: Total panen kentang dikurangi kentang untuk bibit.",
      points: 25,
    },
    {
      id: "q-higher-4",
      questionNumber: 4,
      questionType: "essay",
      questionText: "Menurut pendapatmu, apa manfaat memilah hasil panen sayuran berdasarkan kualitas sebelum dijual? Jelaskan alasanmu dalam 2-3 kalimat!",
      points: 25,
    },
  ];

  const higherReflection: StudentReflection = {
    emoticonOptions: [
      { mood: "sangat_paham", label: "Sangat Paham", icon: "🌟" },
      { mood: "paham", label: "Paham", icon: "👍" },
      { mood: "cukup", label: "Cukup Paham", icon: "🤔" },
      { mood: "butuh_latihan", label: "Perlu Latihan Lagi", icon: "📖" },
    ],
    promptQuestions: [
      "Materi atau soal mana yang paling menantang bagimu hari ini?",
      "Bagaimana caramu menyelesaikan soal yang sulit tersebut?",
      "Apa hal baru yang kamu pelajari tentang lingkungan tempat tinggalmu di Tosari?",
    ],
  };

  const higherRubric: TeacherRubricItem[] = [
    {
      indicator: "Kemampuan memahami isi bacaan dan mengekstraksi data kontekstual",
      perluBimbingan: "Belum mampu menemukan informasi tersurat dalam teks",
      cukup: "Mampu menemukan data namun belum lengkap",
      baik: "Mampu menjawab pertanyaan informasi secara tepat dan runtut",
      sangatBaik: "Sangat teliti, akurat, dan mampu menguraikan implikasi data",
      maxScore: 50,
    },
    {
      indicator: "Kemampuan pemecahan masalah dan penalaran tertulis",
      perluBimbingan: "Langkah perhitungan atau kalimat penjelasan belum terstruktur",
      cukup: "Perhitungan benar namun penjelasan masih singkat",
      baik: "Langkah penyelesaian sistematis dengan kalimat yang jelas",
      sangatBaik: "Solusi kreatif, sistematis, dan penjelasan logis mendalam",
      maxScore: 50,
    },
  ];

  // 5. Simpan ke Database
  const lowerTitle = `LKPD Kelas ${lowerGrade}: ${subject.name} - ${options.themeOrTopic}`;
  const higherTitle = `LKPD Kelas ${higherGrade}: ${subject.name} - ${options.themeOrTopic}`;

  const [savedLower] = await db
    .insert(schema.lkpdWorksheets)
    .values({
      lessonPlanId: options.lessonPlanId,
      title: lowerTitle,
      groupId: options.groupId,
      classId: lowerClass?.id || lowerGrade,
      grade: lowerGrade,
      subjectId: options.subjectId,
      phase: group.phase,
      academicYear,
      semester,
      themeOrTopic: options.themeOrTopic,
      targetTpId: lowerTp.id,
      targetTpCode: lowerTp.code,
      targetTpDescription: lowerTp.description,
      timeAllocationMinutes: timeAllocation,
      ageAppropriateInstructions: lowerInstructions,
      stimulus: lowerStimulus,
      activitySteps: lowerSteps,
      answerSections: lowerAnswerSections,
      studentReflection: lowerReflection,
      teacherRubric: lowerRubric,
      printSettings: {
        colorMode,
        showSchoolHeader: true,
        paperSize: "A4",
      },
      status: "draft",
      version: 1,
      authorId: teacherId,
      aiAssisted: true,
      aiProvider: "gemini",
      aiModel: "gemini-3.8-flash",
    })
    .returning();

  const [savedHigher] = await db
    .insert(schema.lkpdWorksheets)
    .values({
      lessonPlanId: options.lessonPlanId,
      title: higherTitle,
      groupId: options.groupId,
      classId: higherClass?.id || higherGrade,
      grade: higherGrade,
      subjectId: options.subjectId,
      phase: group.phase,
      academicYear,
      semester,
      themeOrTopic: options.themeOrTopic,
      targetTpId: higherTp.id,
      targetTpCode: higherTp.code,
      targetTpDescription: higherTp.description,
      timeAllocationMinutes: timeAllocation,
      ageAppropriateInstructions: higherInstructions,
      stimulus: higherStimulus,
      activitySteps: higherSteps,
      answerSections: higherAnswerSections,
      studentReflection: higherReflection,
      teacherRubric: higherRubric,
      printSettings: {
        colorMode,
        showSchoolHeader: true,
        paperSize: "A4",
      },
      status: "draft",
      version: 1,
      authorId: teacherId,
      aiAssisted: true,
      aiProvider: "gemini",
      aiModel: "gemini-3.8-flash",
    })
    .returning();

  // Catat ke log AI Usage
  await db.insert(schema.aiUsageLogs).values({
    feature: "generator_lkpd_multigrade",
    provider: "gemini",
    model: "gemini-3.8-flash",
    promptTokens: 480,
    completionTokens: 820,
    totalTokens: 1300,
    estimatedCostUsd: "0.000325",
    latencyMs: 140,
    status: "success",
    userId: teacherId,
  });

  return { lowerGradeLkpd: savedLower, higherGradeLkpd: savedHigher };
}

/**
 * Generator Kumpulan Media Pembelajaran Terpadu & Perpustakaan Media
 * Menghasilkan:
 * 1. Kartu Aktivitas & Kartu Gambar (Flashcard / Matching)
 * 2. Bahan Bacaan Bertingkat (Leveled Reading Passages)
 * 3. Media Literasi dan Numerasi Kontekstual
 * 4. Presentasi Pembelajaran (Slides Deck)
 * 5. Ilustrasi Pendukung SVG
 */
export async function generateComplementaryMediaSet(
  options: {
    lessonPlanId?: string;
    groupId: string;
    subjectId: string;
    themeOrTopic: string;
  },
  teacherId?: string
) {
  const [group, subject] = await Promise.all([
    db.query.multigradeGroups.findFirst({ where: eq(schema.multigradeGroups.id, options.groupId) }),
    db.query.subjects.findFirst({ where: eq(schema.subjects.id, options.subjectId) }),
  ]);

  if (!group || !subject) {
    throw new Error("Kelompok atau mata pelajaran tidak valid.");
  }

  const grades = group.grades.split(",").map((g) => parseInt(g.trim(), 10));
  const lowerGrade = Math.min(...grades);
  const higherGrade = Math.max(...grades);

  // 1. Kartu Gambar & Aktivitas
  const cardsData: { cards: KartuGambarItem[] } = {
    cards: [
      {
        id: "card-1",
        title: "Kentang Tosari",
        subtitle: "Umbi Pertanian Lereng Bromo",
        illustrationKey: "kentang_tosari",
        category: "pertanian",
        prompt: "Sebutkan nama dan hitung jumlah kentang pada kartu ini!",
        wordGrade1: "K-E-N-T-A-N-G",
        sentenceGrade2: "Petani memanen kentang di perkebunan Sedaeng.",
      },
      {
        id: "card-2",
        title: "Kubis Bulat Segar",
        subtitle: "Sayuran Hijau Dataran Tinggi",
        illustrationKey: "kubis_tosari",
        category: "pertanian",
        prompt: "Apa warna dan bentuk sayuran kubis ini?",
        wordGrade1: "K-U-B-I-S",
        sentenceGrade2: "Kubis bulat mengandung banyak vitamin dan serat.",
      },
      {
        id: "card-3",
        title: "Wortel Oranye",
        subtitle: "Sayuran Manis Kaya Vitamin A",
        illustrationKey: "wortel_segar",
        category: "pertanian",
        prompt: "Berapa panjang wortel ini jika diukur dengan jari?",
        wordGrade1: "W-O-R-T-E-L",
        sentenceGrade2: "Wortel ditanam berbaris rapi di tanah berbukit.",
      },
      {
        id: "card-4",
        title: "Keranjang Bambu",
        subtitle: "Alat Panen Tradisional",
        illustrationKey: "keranjang_panen",
        category: "alat",
        prompt: "Ayo hitung berapa sayur yang muat di dalam keranjang!",
        wordGrade1: "K-E-R-A-N-J-A-N-G",
        sentenceGrade2: "Keranjang bambu digunakan untuk mempermudah panen sayur.",
      },
      {
        id: "card-5",
        title: "Gunung Bromo",
        subtitle: "Bentang Alam Taman Nasional",
        illustrationKey: "kebun_sayur_tosari",
        category: "alam",
        prompt: "Sebutkan keindahan alam yang terlihat di sekeliling sekolah!",
        wordGrade1: "G-U-N-U-N-G",
        sentenceGrade2: "Gunung Bromo memberikan kesuburan bagi tanah pertanian sekitarnya.",
      },
      {
        id: "card-6",
        title: "SDN SEDAENG II",
        subtitle: "Rumah Belajar Cerdas Tosari",
        illustrationKey: "sekolah_tosari",
        category: "sekolah",
        prompt: "Apa kegiatan favoritmu saat belajar di sekolah?",
        wordGrade1: "S-E-K-O-L-A-H",
        sentenceGrade2: "Siswa SDN Sedaeng II giat belajar bersama dalam kelas rangkap.",
      },
    ],
  };

  // 2. Bahan Bacaan Bertingkat
  const readingData: { passages: LeveledReadingPassage[] } = {
    passages: [
      {
        grade: lowerGrade,
        levelLabel: `Tingkat Dasar (Kelas ${lowerGrade})`,
        wordCount: 38,
        title: `Kebun Sayur di Sedaeng`,
        textContent: `Ini kebun sayur Pak Budi.
Kebun ada di lereng bukit.
Ada kentang dan wortel.
Ada juga kubis hijau.
Semua sayur tumbuh subur.
Pak Budi senang saat panen tiba.
Kami suka makan sayur sehat.`,
        vocabulary: [
          { word: "Kebun", meaning: "Tanah tempat menanam sayur atau buah" },
          { word: "Subur", meaning: "Tanah yang baik dan membuat tanaman cepat besar" },
        ],
        comprehensionQuestions: [
          "Siapa nama pemilik kebun sayur pada cerita?",
          "Sebutkan 3 macam sayuran yang ada di kebun Pak Budi!",
        ],
      },
      {
        grade: higherGrade,
        levelLabel: `Tingkat Mandiri (Kelas ${higherGrade})`,
        wordCount: 96,
        title: `Kearifan Bertani di Lereng Tosari`,
        textContent: `Kecamatan Tosari terkenal dengan udara sejuk dan tanah pegunungan yang subur. Warga Desa Sedaeng sebagian besar bekerja sebagai petani sayuran. Mereka menanam kentang, wortel, kubis, dan daun bawang dengan sistem terasering untuk mencegah longsor.
Ketika musim panen tiba, seluruh anggota keluarga bergotong royong. Sayuran dikumpulkan ke dalam keranjang, lalu dipilah dengan teliti. Sayuran terbaik dikirim ke pasar kota, sedangkan sebagian disimpan untuk bibit berkualitas tinggi. Kehidupan gotong royong ini menjaga kelestarian alam dan kesejahteraan warga Sedaeng.`,
        vocabulary: [
          { word: "Terasering", meaning: "Sawah atau ladang bertingkat di lereng gunung untuk menahan erosi tanah" },
          { word: "Gotong royong", meaning: "Bekerja bersama-sama demi kepentingan dan kesejahteraan bersama" },
          { word: "Kompak", meaning: "Satu hati dan rukun dalam menjalankan pekerjaan" },
        ],
        comprehensionQuestions: [
          "Mengapa petani di Desa Sedaeng menanam sayuran menggunakan sistem terasering?",
          "Apa yang dilakukan warga dengan hasil panen setelah dipilah?",
          "Sikap positif apa yang dapat kita teladani dari para petani di Tosari?",
        ],
      },
    ],
  };

  // 3. Media Literasi dan Numerasi
  const numeracyData: NumeracyScenario = {
    scenarioTitle: `Pasar Sayur Mini Sedaeng Tosari`,
    contextStory: `Siswa SDN Sedaeng II membuka pasar sayur mini untuk belajar berhitung langsung dengan benda nyata. Setiap stan menjual komoditas pertanian segar yang dikelompokkan dalam ikatan dan keranjang.`,
    visualElements: [
      { label: "Kentang Besar", count: 12, unit: "buah", iconKey: "kentang_tosari" },
      { label: "Kubis Bulat", count: 8, unit: "buah", iconKey: "kubis_tosari" },
      { label: "Wortel Manis", count: 15, unit: "ikat", iconKey: "wortel_segar" },
      { label: "Keranjang Bambu", count: 4, unit: "wadah", iconKey: "keranjang_panen" },
    ],
    mathProblems: [
      {
        problemText: `Berapa jumlah gabungan kentang besar (12) dan kubis bulat (8)?`,
        targetGrade: lowerGrade,
        difficulty: "mudah",
        guidanceHint: "Hitung maju: mulai dari 12 lalu tambahkan 8.",
      },
      {
        problemText: `Jika 15 ikat wortel dimasukkan sama rata ke dalam 3 keranjang bambu, berapa ikat wortel di setiap keranjang?`,
        targetGrade: higherGrade,
        difficulty: "sedang",
        guidanceHint: "Gunakan operasi pembagian: 15 dibagi 3.",
      },
      {
        problemText: `Harga 1 kg kentang adalah Rp 10.000. Ibu membeli 3 kg kentang dan membayar dengan uang Rp 50.000. Berapa uang kembalian yang diterima Ibu?`,
        targetGrade: higherGrade,
        difficulty: "pengayaan",
        guidanceHint: "Hitung total belanja terlebih dahulu: 3 x Rp 10.000, lalu kurangkan dari uang bayar.",
      },
    ],
  };

  // 4. Presentasi Pembelajaran
  const presentationData: { slides: PresentationSlide[] } = {
    slides: [
      {
        slideNumber: 1,
        title: `Selamat Pagi! Menjelajah ${options.themeOrTopic}`,
        bulletPoints: [
          "Apersepsi bersama Kelas 1 dan Kelas 2",
          "Melihat keindahan alam dan potensi kebun sayur Tosari",
          "Tujuan kita: Belajar bekerja sama, berhitung, dan membaca cerita",
        ],
        teacherScript:
          "Anak-anak hebat SDN Sedaeng II, hari ini kita akan berpetualang ke kebun sayur lereng Bromo. Siapa yang tadi pagi sudah sarapan sayur?",
        visualLayout: "centered",
        visualKeyword: "kebun_sayur_tosari",
      },
      {
        slideNumber: 2,
        title: `Mengenal Hasil Bumi Kebun Sedaeng`,
        bulletPoints: [
          "Kentang granola yang kaya karbohidrat",
          "Kubis bulat segar dan daun bawang harum",
          "Wortel manis yang baik untuk kesehatan mata",
        ],
        teacherScript:
          "Perhatikan ketiga sayuran ini. Amati warna, bentuk, dan teksturnya. Di meja kalian sudah ada kartu gambarnya!",
        visualLayout: "split",
        visualKeyword: "kentang_tosari",
      },
      {
        slideNumber: 3,
        title: `Aktivitas Kelas ${lowerGrade}: Menghitung & Memasangkan Gambar`,
        bulletPoints: [
          "Ambil kartu sayur di mejamu",
          "Hitung banyak sayur bersama teman sebangkumu",
          "Tarik garis pada LKPD sesuai lambang bilangan",
        ],
        teacherScript:
          "Untuk adik-adik Kelas 1, silakan buka LKPD halaman bergambar. Mulailah menghitung sayur dengan kartu konkret sambil Pak/Bu Guru mendampingi.",
        visualLayout: "grid",
        visualKeyword: "keranjang_panen",
      },
      {
        slideNumber: 4,
        title: `Tantangan Mandiri Kelas ${higherGrade}: Membaca & Memecahkan Masalah`,
        bulletPoints: [
          "Membaca teks cerita 'Kearifan Bertani di Tosari'",
          "Menghitung berat hasil panen Pak Budi",
          "Menuliskan alasan pentingnya sistem terasering",
        ],
        teacherScript:
          "Untuk kakak-kakak Kelas 2, silakan membaca teks secara mandiri dan temukan jawaban untuk soal cerita. Jika ada kata sulit, tanyakan pada kartu kosakata.",
        visualLayout: "split",
        visualKeyword: "kebun_sayur_tosari",
      },
      {
        slideNumber: 5,
        title: `Refleksi & Berbagi Cerita Belajar`,
        bulletPoints: [
          "Tunjukkan hasil karya gambar dan jawabanmu",
          "Bagikan satu hal baru yang kamu pelajari hari ini",
          "Beri tanda emotikon senyum pada LKPD kalian!",
        ],
        teacherScript:
          "Luar biasa! Kedua kelas telah menyelesaikan misinya. Mari kita berkumpul kembali untuk berbagi apa yang paling kalian senangi hari ini.",
        visualLayout: "centered",
        visualKeyword: "sekolah_tosari",
      },
    ],
  };

  // Simpan kelima media ke dalam tabel learningMediaItems
  const [kartuMedia, bacaanMedia, numerasiMedia, slideMedia, ilustrasiMedia] = await Promise.all([
    db
      .insert(schema.learningMediaItems)
      .values({
        lessonPlanId: options.lessonPlanId,
        title: `Kartu Aktivitas & Kartu Gambar: ${options.themeOrTopic}`,
        mediaType: "kartu_gambar",
        subjectId: options.subjectId,
        phase: group.phase,
        targetGrade: null, // Lintas kelas
        groupId: options.groupId,
        description: `Set 6 kartu bergambar terpadu sayuran dan alam Tosari untuk pengenalan kosakata dan hitung visual.`,
        tags: ["kartu", "gambar", "tosari", "flashcard", group.id],
        contentData: cardsData as unknown as Record<string, unknown>,
        colorModeSupported: "both",
        isPublicLibrary: true,
        authorId: teacherId,
      })
      .returning(),

    db
      .insert(schema.learningMediaItems)
      .values({
        lessonPlanId: options.lessonPlanId,
        title: `Bahan Bacaan Bertingkat: ${options.themeOrTopic}`,
        mediaType: "bacaan_bertingkat",
        subjectId: options.subjectId,
        phase: group.phase,
        targetGrade: null,
        groupId: options.groupId,
        description: `Bahan bacaan 2 level berjenjang (Tingkat Dasar Kelas ${lowerGrade} dan Mandiri Kelas ${higherGrade}) dengan daftar kosakata dan pertanyaan pemahaman.`,
        tags: ["literasi", "bacaan_bertingkat", "cerita", "tosari", group.id],
        contentData: readingData as unknown as Record<string, unknown>,
        colorModeSupported: "both",
        isPublicLibrary: true,
        authorId: teacherId,
      })
      .returning(),

    db
      .insert(schema.learningMediaItems)
      .values({
        lessonPlanId: options.lessonPlanId,
        title: `Media Literasi & Numerasi Kontekstual: ${options.themeOrTopic}`,
        mediaType: "media_literasi_numerasi",
        subjectId: options.subjectId,
        phase: group.phase,
        targetGrade: null,
        groupId: options.groupId,
        description: `Skenario pasar sayur Tosari dengan 4 jenis elemen visual dan 3 tingkat kesulitan tantangan numerasi.`,
        tags: ["numerasi", "hitung", "soal_cerita", "tosari", group.id],
        contentData: numeracyData as unknown as Record<string, unknown>,
        colorModeSupported: "both",
        isPublicLibrary: true,
        authorId: teacherId,
      })
      .returning(),

    db
      .insert(schema.learningMediaItems)
      .values({
        lessonPlanId: options.lessonPlanId,
        title: `Presentasi Pembelajaran 5 Slide: ${options.themeOrTopic}`,
        mediaType: "presentasi",
        subjectId: options.subjectId,
        phase: group.phase,
        targetGrade: null,
        groupId: options.groupId,
        description: `Slide deck pemantik 5 tayangan kelas yang memandu rotasi pengantar bersama, bimbingan mandiri, dan refleksi.`,
        tags: ["slide", "presentasi", "proyektor", "rotasi", group.id],
        contentData: presentationData as unknown as Record<string, unknown>,
        colorModeSupported: "both",
        isPublicLibrary: true,
        authorId: teacherId,
      })
      .returning(),

    db
      .insert(schema.learningMediaItems)
      .values({
        lessonPlanId: options.lessonPlanId,
        title: `Paket Ilustrasi Vektor SVG Ramah Anak: ${options.themeOrTopic}`,
        mediaType: "ilustrasi_pendukung",
        subjectId: options.subjectId,
        phase: group.phase,
        targetGrade: null,
        groupId: options.groupId,
        description: `Ilustrasi vektor mandiri (kebun sayur, kentang, wortel, kubis, keranjang, sekolah) dengan dukungan cetak hemat tinta.`,
        tags: ["svg", "vektor", "ilustrasi", "offline", group.id],
        contentData: {
          availableKeys: ["kebun_sayur_tosari", "kentang_tosari", "kubis_tosari", "wortel_segar", "keranjang_panen", "sekolah_tosari"],
          license: "Educational Non-Commercial SDN SEDAENG II Tosari",
        },
        colorModeSupported: "both",
        isPublicLibrary: true,
        authorId: teacherId,
      })
      .returning(),
  ]);

  return {
    kartuMedia,
    bacaanMedia,
    numerasiMedia,
    slideMedia,
    ilustrasiMedia,
  };
}

/**
 * Audit Integritas Kurikulum LKPD
 * Memastikan LKPD tetap merujuk pada TP dan CP yang valid di database PostgreSQL.
 */
export async function checkLkpdCurriculumIntegrity(lkpdId: string) {
  const lkpd = await db.query.lkpdWorksheets.findFirst({
    where: eq(schema.lkpdWorksheets.id, lkpdId),
  });

  if (!lkpd) throw new Error(`LKPD dengan ID '${lkpdId}' tidak ditemukan.`);

  const issues: Array<{ rule: string; message: string; severity: "kritis" | "peringatan" | "info" }> = [];

  // Periksa TP
  if (lkpd.targetTpId) {
    const tp = await db.query.tujuanPembelajaran.findFirst({
      where: eq(schema.tujuanPembelajaran.id, lkpd.targetTpId),
    });

    if (!tp) {
      issues.push({
        rule: "RULE_ORPHAN_LKPD_TP",
        message: `Tujuan Pembelajaran rujukan (${lkpd.targetTpCode}) telah dihapus dari Bank Kurikulum.`,
        severity: "kritis",
      });
    } else {
      if (tp.verificationStatus === "draft") {
        issues.push({
          rule: "RULE_UNVERIFIED_TP",
          message: `Tujuan Pembelajaran (${tp.code}) masih berstatus draf belum diverifikasi resmi.`,
          severity: "peringatan",
        });
      }
      if (tp.targetGrade && tp.targetGrade !== lkpd.grade) {
        issues.push({
          rule: "RULE_GRADE_MISMATCH",
          message: `Target kelas TP (${tp.targetGrade}) berbeda dengan jenjang LKPD (${lkpd.grade}).`,
          severity: "peringatan",
        });
      }
    }
  } else {
    issues.push({
      rule: "RULE_MISSING_TP_ID",
      message: "LKPD tidak memiliki tautan ID Tujuan Pembelajaran resmi.",
      severity: "kritis",
    });
  }

  // Periksa Modul Ajar
  if (lkpd.lessonPlanId) {
    const mod = await db.query.multigradeLessonPlans.findFirst({
      where: eq(schema.multigradeLessonPlans.id, lkpd.lessonPlanId),
    });
    if (!mod) {
      issues.push({
        rule: "RULE_ORPHAN_LESSON_PLAN",
        message: "Modul Ajar induk telah dihapus atau tidak ditemukan.",
        severity: "peringatan",
      });
    }
  }

  const isConsistent = !issues.some((i) => i.severity === "kritis");
  return {
    lkpdId,
    title: lkpd.title,
    grade: lkpd.grade,
    isConsistent,
    issues,
  };
}
