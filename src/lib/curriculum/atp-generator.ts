import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { detectPrerequisiteCycles } from "./validation-engine";

export interface AtpGenerationOptions {
  groupId: string; // "group-a" | "group-b" | "group-c"
  subjectId: string;
  academicYear?: string;
  semester?: "Semua" | "Ganjil" | "Genap";
  targetGrade?: number; // Optional: 1-6 for single class ATP
  customHoursPerWeek?: number;
  effectiveWeeksCount?: number; // default 18 per semester (36 for full year)
}

export interface GeneratedAtpItem {
  tpId: string;
  tpCode: string;
  tpCompetency: string;
  tpDescription: string;
  cpElement: string;
  targetGrade: number;
  semester: "Ganjil" | "Genap";
  sequenceOrder: number;
  allocatedHours: number;
  startWeek: number;
  endWeek: number;
  monthName: string;
  multigradeStrategy: "terpadu_sebagian" | "terpisah_paralel" | "terpadu_penuh" | "mandiri";
  multigradeNotes: string;
  pairedTpId?: string;
  pairedTpCode?: string;
  verificationStatus: string;
}

export interface MultigradeMasterSlot {
  slotNumber: number;
  semester: "Ganjil" | "Genap";
  startWeek: number;
  endWeek: number;
  monthName: string;
  sharedTheme: string;
  strategy: "terpadu_sebagian" | "terpisah_paralel" | "terpadu_penuh" | "mandiri";
  lowerGradeItem?: GeneratedAtpItem;
  higherGradeItem?: GeneratedAtpItem;
  classroomManagementNotes: string;
}

export interface TpCoverageItem {
  id: string;
  code: string;
  competency: string;
  contentScope: string;
  description: string;
  targetGrade: number;
  verificationStatus: string;
  isDraft: boolean;
  scheduledStatus: "ganjil" | "genap" | "in_use" | "unscheduled";
  scheduledPlanTitle?: string;
}

export interface ProtaEntry {
  no: number;
  semester: "Ganjil" | "Genap";
  element: string;
  grade: number;
  tpCode: string;
  competency: string;
  allocatedHours: number;
  notes: string;
}

export interface PromesWeekColumn {
  month: string;
  weekIndex: number; // 1 to 4/5
  globalWeekNumber: number; // 1 to 18
  isAssessmentWeek: boolean;
  label: string;
}

export interface PromesEntry {
  no: number;
  element: string;
  tpCode: string;
  competency: string;
  grade: number;
  allocatedHours: number;
  weeklyDistribution: Record<number, number>; // globalWeekNumber -> hours (e.g. {1: 4, 2: 4})
  notes: string;
}

export interface AtpGenerationResult {
  group: typeof schema.multigradeGroups.$inferSelect;
  subject: typeof schema.subjects.$inferSelect;
  academicYear: string;
  semester: "Semua" | "Ganjil" | "Genap";
  phase: string;
  grades: number[];
  isSingleGrade: boolean;
  targetGrade?: number;
  totalAllocatedHours: number;
  standardTargetHours: number;
  timeBudgetStatus: "sesuai" | "kurang" | "berlebih";
  timeBudgetDifference: number;
  hasUnverifiedTpsWarning: boolean;
  unverifiedTpsCount: number;
  prerequisiteIssues: string[];
  approvedMaterialMapUsed?: {
    id: string;
    theme: string;
    strategy: string;
  };
  coverageSummary: {
    totalTps: number;
    scheduledCount: number;
    unscheduledCount: number;
    lowerGradeUnscheduledCount: number;
    higherGradeUnscheduledCount: number;
  };
  coverageDetails: {
    lowerGradeTps: TpCoverageItem[];
    higherGradeTps: TpCoverageItem[];
  };
  generatedItems: GeneratedAtpItem[];
  lowerGradeTrack: GeneratedAtpItem[];
  higherGradeTrack: GeneratedAtpItem[];
  multigradeMasterSlots: MultigradeMasterSlot[];
  protaEntries: ProtaEntry[];
  promesWeeksGanjil: PromesWeekColumn[];
  promesWeeksGenap: PromesWeekColumn[];
  promesEntries: PromesEntry[];
}

// Standard Jam Pelajaran (JP) per pekan menurut pedoman Kurikulum Merdeka SD
const SUBJECT_HOURS_MAP: Record<string, { hoursPerWeek: number; annualTarget: number }> = {
  "bahasa-indonesia": { hoursPerWeek: 6, annualTarget: 216 },
  matematika: { hoursPerWeek: 4, annualTarget: 144 },
  ipas: { hoursPerWeek: 5, annualTarget: 180 },
  "pendidikan-pancasila": { hoursPerWeek: 4, annualTarget: 144 },
  pjok: { hoursPerWeek: 3, annualTarget: 108 },
  "seni-rupa": { hoursPerWeek: 3, annualTarget: 108 },
  "bahasa-inggris": { hoursPerWeek: 2, annualTarget: 72 },
  "muatan-lokal": { hoursPerWeek: 2, annualTarget: 72 },
};

const MONTH_NAMES_GANJIL = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTH_NAMES_GENAP = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];

/**
 * Menghasilkan pekan efektif bulanan untuk Kalender Pembelajaran & Promes.
 */
export function buildPromesCalendarWeeks(semester: "Ganjil" | "Genap"): PromesWeekColumn[] {
  const months = semester === "Ganjil" ? MONTH_NAMES_GANJIL : MONTH_NAMES_GENAP;
  const weeks: PromesWeekColumn[] = [];
  let globalWeekNumber = 1;

  months.forEach((month, mIdx) => {
    // 3 pekan per bulan rata-rata untuk mencapai total 18 pekan efektif
    const weeksInMonth = (mIdx === 1 || mIdx === 3 || mIdx === 4) ? 3 : 3;
    for (let w = 1; w <= weeksInMonth; w++) {
      if (globalWeekNumber > 18) break;

      const isAssessmentWeek =
        (semester === "Ganjil" && (globalWeekNumber === 9 || globalWeekNumber === 18)) ||
        (semester === "Genap" && (globalWeekNumber === 9 || globalWeekNumber === 18));

      let label = `Mg ${w}`;
      if (semester === "Ganjil" && globalWeekNumber === 9) label = "STS";
      if (semester === "Ganjil" && globalWeekNumber === 18) label = "SAS";
      if (semester === "Genap" && globalWeekNumber === 9) label = "STS";
      if (semester === "Genap" && globalWeekNumber === 18) label = "SAS";

      weeks.push({
        month,
        weekIndex: w,
        globalWeekNumber,
        isAssessmentWeek,
        label,
      });

      globalWeekNumber++;
    }
  });

  return weeks;
}

/**
 * Mesin Generator ATP Multigrade SDN Sedaeng II Tosari.
 */
export async function generateMultigradeAtp(
  options: AtpGenerationOptions
): Promise<AtpGenerationResult> {
  const academicYear = options.academicYear || "2024/2025";
  const semesterChoice = options.semester || "Semua";

  // 1. Ambil data kelompok dan mata pelajaran
  const [group, subject] = await Promise.all([
    db.query.multigradeGroups.findFirst({
      where: eq(schema.multigradeGroups.id, options.groupId),
    }),
    db.query.subjects.findFirst({
      where: eq(schema.subjects.id, options.subjectId),
    }),
  ]);

  if (!group || !subject) {
    throw new Error("Kelompok multigrade atau mata pelajaran tidak ditemukan.");
  }

  const grades = group.grades.split(",").map((g) => parseInt(g.trim(), 10));
  const lowerGrade = Math.min(...grades);
  const higherGrade = Math.max(...grades);
  const isSingleGrade = Boolean(options.targetGrade && grades.includes(options.targetGrade));

  // 2. Ambil seluruh TP untuk subjek dan fase ini
  const rawTps = await db
    .select({
      id: schema.tujuanPembelajaran.id,
      code: schema.tujuanPembelajaran.code,
      competency: schema.tujuanPembelajaran.competency,
      contentScope: schema.tujuanPembelajaran.contentScope,
      description: schema.tujuanPembelajaran.description,
      targetGrade: schema.tujuanPembelajaran.targetGrade,
      cpId: schema.tujuanPembelajaran.cpId,
      verificationStatus: schema.tujuanPembelajaran.verificationStatus,
      element: schema.capaianPembelajaran.element,
    })
    .from(schema.tujuanPembelajaran)
    .leftJoin(
      schema.capaianPembelajaran,
      eq(schema.tujuanPembelajaran.cpId, schema.capaianPembelajaran.id)
    )
    .where(
      and(
        eq(schema.tujuanPembelajaran.subjectId, subject.id),
        eq(schema.tujuanPembelajaran.phase, group.phase as "Fase A" | "Fase B" | "Fase C")
      )
    )
    .orderBy(asc(schema.tujuanPembelajaran.code));

  // 3. Ambil data prasyarat
  const allTpIds = rawTps.map((t) => t.id);
  const prerequisites = allTpIds.length > 0
    ? await db
        .select()
        .from(schema.tpPrerequisites)
        .where(
          and(
            inArray(schema.tpPrerequisites.tpId, allTpIds),
            inArray(schema.tpPrerequisites.prerequisiteTpId, allTpIds)
          )
        )
    : [];

  // 4. Ambil TP yang sudah dijadwalkan pada ATP plan aktif lain
  const existingItems = allTpIds.length > 0
    ? await db
        .select({
          tpId: schema.atpItems.tpId,
          planTitle: schema.atpPlans.title,
          planStatus: schema.atpPlans.status,
          planSemester: schema.atpItems.semester,
        })
        .from(schema.atpItems)
        .leftJoin(schema.atpPlans, eq(schema.atpItems.atpPlanId, schema.atpPlans.id))
        .where(inArray(schema.atpItems.tpId, allTpIds))
    : [];

  const existingUsageMap = new Map<string, { title: string; semester: string; status: string }>();
  existingItems.forEach((item) => {
    if (item.planStatus === "in_use" || item.planStatus === "approved") {
      existingUsageMap.set(item.tpId, {
        title: item.planTitle || "ATP Aktif",
        semester: item.planSemester || "Ganjil",
        status: item.planStatus,
      });
    }
  });

  // 5. Ambil approved material map jika ada (untuk sinkronisasi tema bersama)
  const approvedMap = await db.query.multigradeMaterialMaps.findFirst({
    where: and(
      eq(schema.multigradeMaterialMaps.groupId, group.id),
      eq(schema.multigradeMaterialMaps.subjectId, subject.id),
      eq(schema.multigradeMaterialMaps.status, "approved")
    ),
  });

  // 6. Pisahkan TP per tingkatan kelas
  const lowerGradeTpsRaw = rawTps.filter(
    (t) => t.targetGrade === lowerGrade || (t.targetGrade === null && !isSingleGrade)
  );
  const higherGradeTpsRaw = rawTps.filter(
    (t) => t.targetGrade === higherGrade || (t.targetGrade === null && !isSingleGrade)
  );

  let unverifiedCount = 0;

  const mapToCoverageItem = (t: typeof rawTps[0]): TpCoverageItem => {
    const isDraft = t.verificationStatus !== "approved" && t.verificationStatus !== "in_use";
    if (isDraft) unverifiedCount++;

    const usage = existingUsageMap.get(t.id);
    let scheduledStatus: TpCoverageItem["scheduledStatus"] = "unscheduled";

    if (usage) {
      if (usage.status === "in_use") scheduledStatus = "in_use";
      else if (usage.semester === "Ganjil") scheduledStatus = "ganjil";
      else scheduledStatus = "genap";
    }

    return {
      id: t.id,
      code: t.code,
      competency: t.competency,
      contentScope: t.contentScope,
      description: t.description,
      targetGrade: t.targetGrade ?? lowerGrade,
      verificationStatus: t.verificationStatus,
      isDraft,
      scheduledStatus,
      scheduledPlanTitle: usage?.title,
    };
  };

  const lowerCoverageList = lowerGradeTpsRaw.map(mapToCoverageItem);
  const higherCoverageList = higherGradeTpsRaw.map(mapToCoverageItem);

  // 7. Hitung jam standar
  const standardConfig = SUBJECT_HOURS_MAP[subject.id] || { hoursPerWeek: 4, annualTarget: 144 };
  const hoursPerWeek = options.customHoursPerWeek || standardConfig.hoursPerWeek;
  const targetPerSemester = (standardConfig.annualTarget / 2);
  const standardTargetHours =
    semesterChoice === "Semua" ? standardConfig.annualTarget : targetPerSemester;

  const defaultHoursPerTp = 4; // Rata-rata 4 JP per TP

  // 8. Pembuatan Alur TP Per Kelas & Alur Sinkronisasi Multigrade
  const generatedItems: GeneratedAtpItem[] = [];
  const lowerGradeTrack: GeneratedAtpItem[] = [];
  const higherGradeTrack: GeneratedAtpItem[] = [];
  const multigradeMasterSlots: MultigradeMasterSlot[] = [];

  // Tentukan semester filter
  const targetSemesters: ("Ganjil" | "Genap")[] =
    semesterChoice === "Semua" ? ["Ganjil", "Genap"] : [semesterChoice];

  let globalSequence = 1;
  let lowerSequence = 1;
  let higherSequence = 1;

  // Prerequisite topological sort helper
  const prereqMap = new Map<string, string[]>();
  prerequisites.forEach((p) => {
    const existing = prereqMap.get(p.tpId) || [];
    existing.push(p.prerequisiteTpId);
    prereqMap.set(p.tpId, existing);
  });

  const prerequisiteIssues: string[] = [];

  // Urutkan TP dengan memperhatikan prasyarat
  const sortTpsByPrerequisites = (tps: typeof rawTps) => {
    const sorted = [...tps];
    sorted.sort((a, b) => {
      // Jika b adalah prasyarat a, maka b harus sebelum a
      if (prereqMap.get(a.id)?.includes(b.id)) return 1;
      if (prereqMap.get(b.id)?.includes(a.id)) return -1;
      return a.code.localeCompare(b.code);
    });
    return sorted;
  };

  const sortedLowerTps = sortTpsByPrerequisites(lowerGradeTpsRaw);
  const sortedHigherTps = sortTpsByPrerequisites(higherGradeTpsRaw);

  targetSemesters.forEach((sem) => {
    // 18 pekan per semester
    let currentWeekLower = 1;
    let currentWeekHigher = 1;

    // Bagi TP per semester jika semesterChoice === "Semua"
    const lowerForSem =
      semesterChoice === "Semua"
        ? sortedLowerTps.filter((_, idx) => (sem === "Ganjil" ? idx % 2 === 0 : idx % 2 === 1))
        : sortedLowerTps;

    const higherForSem =
      semesterChoice === "Semua"
        ? sortedHigherTps.filter((_, idx) => (sem === "Ganjil" ? idx % 2 === 0 : idx % 2 === 1))
        : sortedHigherTps;

    const maxItems = Math.max(lowerForSem.length, higherForSem.length);

    for (let i = 0; i < maxItems; i++) {
      const lowerTp = lowerForSem[i];
      const higherTp = higherForSem[i];

      const monthLower =
        sem === "Ganjil"
          ? MONTH_NAMES_GANJIL[Math.min(Math.floor((currentWeekLower - 1) / 3), 5)]
          : MONTH_NAMES_GENAP[Math.min(Math.floor((currentWeekLower - 1) / 3), 5)];

      const monthHigher =
        sem === "Ganjil"
          ? MONTH_NAMES_GANJIL[Math.min(Math.floor((currentWeekHigher - 1) / 3), 5)]
          : MONTH_NAMES_GENAP[Math.min(Math.floor((currentWeekHigher - 1) / 3), 5)];

      let lowerItem: GeneratedAtpItem | undefined;
      let higherItem: GeneratedAtpItem | undefined;

      // Lower Grade Item
      if (lowerTp && (!options.targetGrade || options.targetGrade === lowerGrade)) {
        const startW = currentWeekLower;
        const endW = Math.min(startW + 1, 18);

        lowerItem = {
          tpId: lowerTp.id,
          tpCode: lowerTp.code,
          tpCompetency: lowerTp.competency,
          tpDescription: lowerTp.description,
          cpElement: lowerTp.element || "Materi Pokok",
          targetGrade: lowerGrade,
          semester: sem,
          sequenceOrder: lowerSequence++,
          allocatedHours: defaultHoursPerTp,
          startWeek: startW,
          endWeek: endW,
          monthName: monthLower,
          multigradeStrategy: higherTp ? "terpadu_sebagian" : "mandiri",
          multigradeNotes: higherTp
            ? `Pendampingan langsung bertahap guru untuk Kelas ${lowerGrade} sementara Kelas ${higherGrade} berkegiatan mandiri.`
            : `Kegiatan terarah kelas ${lowerGrade}.`,
          pairedTpId: higherTp?.id,
          pairedTpCode: higherTp?.code,
          verificationStatus: lowerTp.verificationStatus,
        };

        lowerGradeTrack.push(lowerItem);
        generatedItems.push(lowerItem);
        currentWeekLower = endW + 1;
      }

      // Higher Grade Item
      if (higherTp && (!options.targetGrade || options.targetGrade === higherGrade)) {
        const startW = currentWeekHigher;
        const endW = Math.min(startW + 1, 18);

        higherItem = {
          tpId: higherTp.id,
          tpCode: higherTp.code,
          tpCompetency: higherTp.competency,
          tpDescription: higherTp.description,
          cpElement: higherTp.element || "Materi Pokok",
          targetGrade: higherGrade,
          semester: sem,
          sequenceOrder: higherSequence++,
          allocatedHours: defaultHoursPerTp,
          startWeek: startW,
          endWeek: endW,
          monthName: monthHigher,
          multigradeStrategy: lowerTp ? "terpadu_sebagian" : "mandiri",
          multigradeNotes: lowerTp
            ? `Eksplorasi mandiri dan tugas pemecahan masalah untuk Kelas ${higherGrade} saat guru membimbing Kelas ${lowerGrade}.`
            : `Kegiatan mandiri kelas ${higherGrade}.`,
          pairedTpId: lowerTp?.id,
          pairedTpCode: lowerTp?.code,
          verificationStatus: higherTp.verificationStatus,
        };

        higherGradeTrack.push(higherItem);
        generatedItems.push(higherItem);
        currentWeekHigher = endW + 1;
      }

      // Unified Master Slot (for the multigrade classroom schedule)
      if (lowerItem || higherItem) {
        const slotStrategy =
          lowerItem && higherItem
            ? approvedMap?.mappingStrategy || "terpadu_sebagian"
            : "mandiri";

        const sharedTheme = approvedMap
          ? approvedMap.sharedTheme
          : lowerItem && higherItem
          ? `Tema Terpadu: ${lowerItem.cpElement} & ${higherItem.cpElement}`
          : (lowerItem?.cpElement || higherItem?.cpElement || "Pembelajaran Spesifik");

        multigradeMasterSlots.push({
          slotNumber: globalSequence++,
          semester: sem,
          startWeek: Math.min(lowerItem?.startWeek || 18, higherItem?.startWeek || 18),
          endWeek: Math.max(lowerItem?.endWeek || 1, higherItem?.endWeek || 1),
          monthName: lowerItem?.monthName || higherItem?.monthName || "Juli",
          sharedTheme,
          strategy: slotStrategy as MultigradeMasterSlot["strategy"],
          lowerGradeItem: lowerItem,
          higherGradeItem: higherItem,
          classroomManagementNotes:
            slotStrategy === "terpisah_paralel"
              ? "Rotasi Bergiliran: Guru memberi pengantar terpisah, lalu memandu kelas rendah sementara kelas tinggi mengerjakan LKS eksplorasi."
              : "Pengantar Konteks Bersama: Guru membuka dengan apersepsi kontekstual kearifan lokal Tosari, kemudian membagikan penugasan berjenjang.",
        });
      }
    }
  });

  // 9. Cek Prasyarat & Urutan
  const itemSeqMap = new Map<string, number>();
  generatedItems.forEach((item) => itemSeqMap.set(item.tpId, item.sequenceOrder));

  prerequisites.forEach((p) => {
    const targetSeq = itemSeqMap.get(p.tpId);
    const prereqSeq = itemSeqMap.get(p.prerequisiteTpId);
    if (targetSeq !== undefined && prereqSeq !== undefined) {
      if (prereqSeq >= targetSeq) {
        prerequisiteIssues.push(
          `Benturan Urutan: TP ${p.tpId} dijadwalkan pada urutan #${targetSeq}, namun prasyaratnya TP ${p.prerequisiteTpId} berada di urutan #${prereqSeq}.`
        );
      }
    }
  });

  // 10. Perhitungan Alokasi Waktu
  const totalAllocatedHours = generatedItems.reduce((acc, curr) => acc + curr.allocatedHours, 0);
  const timeBudgetDifference = totalAllocatedHours - standardTargetHours;
  let timeBudgetStatus: AtpGenerationResult["timeBudgetStatus"] = "sesuai";
  if (Math.abs(timeBudgetDifference) > (standardTargetHours * 0.2)) {
    timeBudgetStatus = timeBudgetDifference > 0 ? "berlebih" : "kurang";
  }

  // 11. Susun Program Tahunan (Prota) Entries
  const protaEntries: ProtaEntry[] = generatedItems.map((item, idx) => ({
    no: idx + 1,
    semester: item.semester,
    element: item.cpElement,
    grade: item.targetGrade,
    tpCode: item.tpCode,
    competency: item.tpCompetency,
    allocatedHours: item.allocatedHours,
    notes: item.multigradeNotes,
  }));

  // 12. Susun Program Semester (Promes) Matrices
  const promesWeeksGanjil = buildPromesCalendarWeeks("Ganjil");
  const promesWeeksGenap = buildPromesCalendarWeeks("Genap");

  const promesEntries: PromesEntry[] = generatedItems.map((item, idx) => {
    const weeklyDistribution: Record<number, number> = {};
    const weeksList = item.semester === "Ganjil" ? promesWeeksGanjil : promesWeeksGenap;

    const span = Math.max(1, item.endWeek - item.startWeek + 1);
    const hoursPerWeekAlloc = Math.round(item.allocatedHours / span) || hoursPerWeek;

    for (let w = item.startWeek; w <= item.endWeek; w++) {
      weeklyDistribution[w] = hoursPerWeekAlloc;
    }

    return {
      no: idx + 1,
      element: item.cpElement,
      tpCode: item.tpCode,
      competency: item.tpCompetency,
      grade: item.targetGrade,
      allocatedHours: item.allocatedHours,
      weeklyDistribution,
      notes: item.multigradeNotes,
    };
  });

  // 13. Rekap Cakupan TP
  const scheduledTpIds = new Set(generatedItems.map((i) => i.tpId));
  const lowerUnscheduled = lowerCoverageList.filter((t) => !scheduledTpIds.has(t.id));
  const higherUnscheduled = higherCoverageList.filter((t) => !scheduledTpIds.has(t.id));

  // Update status in coverage lists
  lowerCoverageList.forEach((t) => {
    if (scheduledTpIds.has(t.id)) {
      const item = generatedItems.find((i) => i.tpId === t.id);
      t.scheduledStatus = item?.semester === "Ganjil" ? "ganjil" : "genap";
    }
  });

  higherCoverageList.forEach((t) => {
    if (scheduledTpIds.has(t.id)) {
      const item = generatedItems.find((i) => i.tpId === t.id);
      t.scheduledStatus = item?.semester === "Ganjil" ? "ganjil" : "genap";
    }
  });

  return {
    group,
    subject,
    academicYear,
    semester: semesterChoice,
    phase: group.phase,
    grades,
    isSingleGrade,
    targetGrade: options.targetGrade,
    totalAllocatedHours,
    standardTargetHours,
    timeBudgetStatus,
    timeBudgetDifference,
    hasUnverifiedTpsWarning: unverifiedCount > 0,
    unverifiedTpsCount: unverifiedCount,
    prerequisiteIssues,
    approvedMaterialMapUsed: approvedMap
      ? {
          id: approvedMap.id,
          theme: approvedMap.sharedTheme,
          strategy: approvedMap.mappingStrategy,
        }
      : undefined,
    coverageSummary: {
      totalTps: rawTps.length,
      scheduledCount: scheduledTpIds.size,
      unscheduledCount: lowerUnscheduled.length + higherUnscheduled.length,
      lowerGradeUnscheduledCount: lowerUnscheduled.length,
      higherGradeUnscheduledCount: higherUnscheduled.length,
    },
    coverageDetails: {
      lowerGradeTps: lowerCoverageList,
      higherGradeTps: higherCoverageList,
    },
    generatedItems,
    lowerGradeTrack,
    higherGradeTrack,
    multigradeMasterSlots,
    protaEntries,
    promesWeeksGanjil,
    promesWeeksGenap,
    promesEntries,
  };
}
