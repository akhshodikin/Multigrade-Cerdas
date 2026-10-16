import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export interface ValidationRuleConfig {
  checkOrphanTp: boolean;
  checkCpPhaseSubject: boolean;
  checkAtpSequential: boolean;
  checkPrerequisites: boolean;
  checkPrerequisiteCycles: boolean;
  checkTimeAllocation: boolean;
  maxHoursDeviationPercent: number; // default: 20%
  checkSourceAttribution: boolean;
  checkTargetGradePhaseAlignment: boolean;
}

export const DEFAULT_VALIDATION_CONFIG: ValidationRuleConfig = {
  checkOrphanTp: true,
  checkCpPhaseSubject: true,
  checkAtpSequential: true,
  checkPrerequisites: true,
  checkPrerequisiteCycles: true,
  checkTimeAllocation: true,
  maxHoursDeviationPercent: 20,
  checkSourceAttribution: true,
  checkTargetGradePhaseAlignment: true,
};

export const PEDAGOGICAL_DISCLAIMER =
  "Hasil validasi otomatis hanya memverifikasi kelengkapan struktural, integritas referensi, dan konsistensi alur teknis. Kelayakan pedagogis, kedalaman materi, dan kesesuaian konteks kelas rangkap SDN SEDAENG II Tosari tetap memerlukan pertimbangan profesional pendidik dan persetujuan Kepala Sekolah.";

export interface ValidationIssueItem {
  ruleCode: string;
  title: string;
  severity: "kritis" | "peringatan" | "info";
  sourceLocation: string;
  entityType: "cp" | "tp" | "atp_plan" | "atp_item" | "prerequisite";
  entityId: string;
  description: string;
  recommendation: string;
}

export interface ValidationReportResult {
  targetType: "atp_plan" | "curriculum_bank" | "tp";
  targetId: string;
  title: string;
  summary: string;
  isValidTechnically: boolean;
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  pedagogicalDisclaimer: string;
  issues: ValidationIssueItem[];
  reportId?: string;
}

/**
 * Deteksi siklus sirkular dalam graf ketergantungan prasyarat (Directed Graph Cycle Detection via DFS).
 */
export function detectPrerequisiteCycles(
  prerequisites: { tpId: string; prerequisiteTpId: string }[]
): { hasCycle: boolean; cyclePath?: string[] } {
  const adj = new Map<string, string[]>();

  for (const edge of prerequisites) {
    if (!adj.has(edge.tpId)) {
      adj.set(edge.tpId, []);
    }
    adj.get(edge.tpId)!.push(edge.prerequisiteTpId);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(curr: string): boolean {
    visited.add(curr);
    recStack.add(curr);
    path.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        path.push(neighbor);
        return true;
      }
    }

    recStack.delete(curr);
    path.pop();
    return false;
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) {
        return { hasCycle: true, cyclePath: path };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Validasi mendalam untuk satu Alur Tujuan Pembelajaran (ATP).
 */
export async function validateAtpPlan(
  atpPlanId: string,
  userConfig?: Partial<ValidationRuleConfig>,
  persistReport: boolean = false,
  reviewer?: { id?: string; name?: string }
): Promise<ValidationReportResult> {
  const config: ValidationRuleConfig = { ...DEFAULT_VALIDATION_CONFIG, ...userConfig };
  const issues: ValidationIssueItem[] = [];

  // 1. Ambil data ATP Plan
  const plans = await db.select().from(schema.atpPlans).where(eq(schema.atpPlans.id, atpPlanId));
  if (plans.length === 0) {
    throw new Error(`ATP Plan dengan ID ${atpPlanId} tidak ditemukan.`);
  }
  const plan = plans[0];

  // 2. Ambil butir-butir ATP (items)
  const items = await db
    .select()
    .from(schema.atpItems)
    .where(eq(schema.atpItems.atpPlanId, atpPlanId));

  // Sort items by sequenceOrder
  items.sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  // 3. Ambil data TP terkait
  const tpIds = items.map((i) => i.tpId);
  const tps = tpIds.length > 0 ? await db.select().from(schema.tujuanPembelajaran).where(inArray(schema.tujuanPembelajaran.id, tpIds)) : [];
  const tpMap = new Map(tps.map((t) => [t.id, t]));

  // 4. Ambil data CP terkait
  const cpIds = tps.map((t) => t.cpId).filter((id): id is string => Boolean(id));
  const cps = cpIds.length > 0 ? await db.select().from(schema.capaianPembelajaran).where(inArray(schema.capaianPembelajaran.id, cpIds)) : [];
  const cpMap = new Map(cps.map((c) => [c.id, c]));

  // 5. Ambil prasyarat dari seluruh TP dalam ATP
  const prereqs = tpIds.length > 0
    ? await db
        .select()
        .from(schema.tpPrerequisites)
        .where(inArray(schema.tpPrerequisites.tpId, tpIds))
    : [];

  // === RULE 1: ATP Harus Memiliki Butir TP ===
  if (config.checkAtpSequential && items.length === 0) {
    issues.push({
      ruleCode: "RULE_ATP_EMPTY",
      title: "Alur ATP Kosong",
      severity: "kritis",
      sourceLocation: `ATP: ${plan.title}`,
      entityType: "atp_plan",
      entityId: plan.id,
      description: "Alur Tujuan Pembelajaran belum memiliki butir TP yang dirangkai.",
      recommendation: "Tambahkan butir-butir Tujuan Pembelajaran ke dalam alur ATP ini.",
    });
  }

  // === RULE 2: Urutan Sekuensial ATP Tanpa Celah & Tanpa Duplikasi ===
  if (config.checkAtpSequential && items.length > 0) {
    const sequenceNumbers = items.map((i) => i.sequenceOrder);
    const seenSequences = new Set<number>();
    let hasDuplicateSeq = false;

    for (const seq of sequenceNumbers) {
      if (seenSequences.has(seq)) {
        hasDuplicateSeq = true;
      }
      seenSequences.add(seq);
    }

    if (hasDuplicateSeq) {
      issues.push({
        ruleCode: "RULE_ATP_DUPLICATE_SEQUENCE",
        title: "Nomor Urut Ganda dalam ATP",
        severity: "kritis",
        sourceLocation: `ATP: ${plan.title}`,
        entityType: "atp_plan",
        entityId: plan.id,
        description: "Ditemukan butir ATP dengan nomor urut yang sama.",
        recommendation: "Sesuaikan nomor urut butir ATP agar berurutan secara unik (1, 2, 3, ...).",
      });
    }

    // Cek urutan bolong / gap
    const sortedSeqs = [...sequenceNumbers].sort((a, b) => a - b);
    for (let i = 0; i < sortedSeqs.length; i++) {
      const expected = i + 1;
      if (sortedSeqs[i] !== expected) {
        issues.push({
          ruleCode: "RULE_ATP_SEQUENCE_GAP",
          title: "Urutan ATP Memiliki Celah atau Tidak Dimulai dari 1",
          severity: "peringatan",
          sourceLocation: `ATP: ${plan.title} (Urutan ${sortedSeqs[i]}, diharapkan ${expected})`,
          entityType: "atp_plan",
          entityId: plan.id,
          description: `Urutan butir ATP tidak berurutan rapat dari 1. Ditemukan urutan ke-${sortedSeqs[i]} pada indeks ke-${expected}.`,
          recommendation: "Susun ulang nomor urut agar berurutan 1, 2, 3 tanpa celah.",
        });
        break; // laporkan satu peringatan celah
      }
    }
  }

  // Map TP ID ke sequenceOrder dalam ATP ini
  const tpSequenceMap = new Map<string, number>();
  for (const item of items) {
    tpSequenceMap.set(item.tpId, item.sequenceOrder);
  }

  // Periksa setiap butir ATP
  let totalAllocatedHours = 0;

  for (const item of items) {
    totalAllocatedHours += item.allocatedHours;
    const tp = tpMap.get(item.tpId);

    // === RULE 3: TP Terhubung ke CP yang Sah (Orphan TP Check) ===
    if (!tp) {
      issues.push({
        ruleCode: "RULE_TP_NOT_FOUND",
        title: "Tujuan Pembelajaran Tidak Ditemukan",
        severity: "kritis",
        sourceLocation: `Butir ATP Urutan ${item.sequenceOrder}`,
        entityType: "atp_item",
        entityId: item.id,
        description: `Butir ATP merujuk ke ID TP yang tidak ada di basis data (${item.tpId}).`,
        recommendation: "Hapus butir ATP ini atau kaitkan dengan TP yang valid.",
      });
      continue;
    }

    if (config.checkOrphanTp) {
      if (!tp.cpId) {
        issues.push({
          ruleCode: "RULE_TP_ORPHAN",
          title: "TP Tidak Memiliki Dasar CP Resmi",
          severity: "kritis",
          sourceLocation: `TP: ${tp.code} (${tp.competency})`,
          entityType: "tp",
          entityId: tp.id,
          description: `Tujuan Pembelajaran ${tp.code} tidak memiliki referensi Capaian Pembelajaran (CP) induk yang dapat ditelusuri.`,
          recommendation: "Hubungkan TP ini ke Capaian Pembelajaran (CP) resmi sesuai fase dan elemen mata pelajaran.",
        });
      } else {
        const cp = cpMap.get(tp.cpId);
        if (!cp) {
          issues.push({
            ruleCode: "RULE_CP_NOT_FOUND",
            title: "CP Induk Tidak Ditemukan",
            severity: "kritis",
            sourceLocation: `TP: ${tp.code}`,
            entityType: "tp",
            entityId: tp.id,
            description: `CP induk dengan ID ${tp.cpId} tidak ada di basis data.`,
            recommendation: "Perbarui referensi CP induk TP ini.",
          });
        } else {
          // === RULE 4: CP Memiliki Fase dan Mapel yang Sesuai dengan ATP ===
          if (config.checkCpPhaseSubject) {
            if (cp.subjectId !== plan.subjectId) {
              issues.push({
                ruleCode: "RULE_SUBJECT_MISMATCH",
                title: "Ketidaksesuaian Mata Pelajaran CP dan ATP",
                severity: "kritis",
                sourceLocation: `TP: ${tp.code} (CP: ${cp.element})`,
                entityType: "cp",
                entityId: cp.id,
                description: `CP induk mata pelajaran (${cp.subjectId}) berbeda dengan mata pelajaran ATP (${plan.subjectId}).`,
                recommendation: "Gunakan CP dari mata pelajaran yang sama dengan ATP.",
              });
            }
            if (cp.phase !== plan.phase) {
              issues.push({
                ruleCode: "RULE_PHASE_MISMATCH",
                title: "Ketidaksesuaian Fase CP dan ATP",
                severity: "kritis",
                sourceLocation: `TP: ${tp.code} (CP: ${cp.element})`,
                entityType: "cp",
                entityId: cp.id,
                description: `CP induk (${cp.phase}) tidak cocok dengan fase ATP (${plan.phase}).`,
                recommendation: "Pastikan seluruh TP dan CP dalam ATP berada pada fase yang sama.",
              });
            }
          }
        }
      }
    }

    // === RULE 5: Kesesuaian Target Kelas dengan Fase ===
    if (config.checkTargetGradePhaseAlignment) {
      const allowedGrades = plan.phase === "Fase A" ? [1, 2] : plan.phase === "Fase B" ? [3, 4] : [5, 6];
      if (!allowedGrades.includes(item.targetGrade)) {
        issues.push({
          ruleCode: "RULE_GRADE_OUT_OF_PHASE",
          title: "Target Kelas Di Luar Cakupan Fase",
          severity: "peringatan",
          sourceLocation: `Butir ATP Urutan ${item.sequenceOrder} (Kelas ${item.targetGrade})`,
          entityType: "atp_item",
          entityId: item.id,
          description: `Kelas ${item.targetGrade} tidak berada dalam rentang ${plan.phase} (${allowedGrades.join(" atau ")}).`,
          recommendation: `Sesuaikan target kelas ke ${allowedGrades.join(" atau ")} sesuai fase kelompok multigrade.`,
        });
      }
    }

    // === RULE 6: Alokasi Jam Pelajaran (JP) Harus Positif ===
    if (item.allocatedHours <= 0) {
      issues.push({
        ruleCode: "RULE_HOURS_INVALID",
        title: "Alokasi Jam Belajar Tidak Valid",
        severity: "kritis",
        sourceLocation: `Butir ATP Urutan ${item.sequenceOrder}`,
        entityType: "atp_item",
        entityId: item.id,
        description: `Alokasi waktu ${item.allocatedHours} JP tidak valid (harus lebih dari 0).`,
        recommendation: "Tentukan alokasi waktu JP realistis (misal: 2 s/d 6 JP per TP).",
      });
    }

    // === RULE 7: Penandaan Asal Data (Verbatim Sumber vs Guru vs AI) ===
    if (config.checkSourceAttribution && tp.sourceType === "ai_assisted") {
      issues.push({
        ruleCode: "RULE_AI_REVIEW_NEEDED",
        title: "TP Dibantu AI Memerlukan Review Guru",
        severity: "info",
        sourceLocation: `TP: ${tp.code}`,
        entityType: "tp",
        entityId: tp.id,
        description: "TP ini dibuat dengan bantuan AI. Periksa kembali rumusan kompetensi agar sesuai dengan karakter siswa SDN Sedaeng II.",
        recommendation: "Tinjau rumusan TP dan tandai sebagai disetujui setelah disesuaikan.",
      });
    }
  }

  // === RULE 8: Pemeriksaan Keterpenuhan Prasyarat (Prerequisite Sequence) ===
  if (config.checkPrerequisites) {
    for (const prereq of prereqs) {
      const targetSeq = tpSequenceMap.get(prereq.tpId);
      const prereqSeq = tpSequenceMap.get(prereq.prerequisiteTpId);
      const targetTp = tpMap.get(prereq.tpId);
      const prereqTp = tpMap.get(prereq.prerequisiteTpId);

      const targetLabel = targetTp ? `${targetTp.code} (${targetTp.competency})` : prereq.tpId;
      const prereqLabel = prereqTp ? `${prereqTp.code} (${prereqTp.competency})` : prereq.prerequisiteTpId;

      if (targetSeq !== undefined && prereqSeq !== undefined) {
        if (prereqSeq >= targetSeq) {
          issues.push({
            ruleCode: "RULE_PREREQ_VIOLATION",
            title: "Pelanggaran Urutan Prasyarat Belajar",
            severity: prereq.prerequisiteType === "wajib" ? "kritis" : "peringatan",
            sourceLocation: `Urutan ATP ${targetSeq} (${targetLabel})`,
            entityType: "prerequisite",
            entityId: prereq.id,
            description: `TP [${targetLabel}] di urutan ke-${targetSeq} memerlukan prasyarat [${prereqLabel}], namun prasyarat tersebut diajarkan di urutan yang sama atau sesudahnya (urutan ke-${prereqSeq}).`,
            recommendation: `Pindahkan [${prereqLabel}] ke urutan sebelum ke-${targetSeq} agar siswa telah menguasai kompetensi dasar sebelumnya.`,
          });
        }
      } else if (targetSeq !== undefined && prereqSeq === undefined) {
        // Prasyarat tidak disertakan dalam ATP ini
        issues.push({
          ruleCode: "RULE_PREREQ_MISSING_IN_ATP",
          title: "Prasyarat Wajib Tidak Termasuk dalam Alur",
          severity: prereq.prerequisiteType === "wajib" ? "peringatan" : "info",
          sourceLocation: `TP: ${targetLabel}`,
          entityType: "prerequisite",
          entityId: prereq.id,
          description: `TP [${targetLabel}] memiliki prasyarat [${prereqLabel}] yang belum dimasukkan ke dalam alur ATP ini.`,
          recommendation: `Pastikan kompetensi prasyarat telah diajarkan pada alur/semester sebelumnya atau masukkan ke dalam ATP ini.`,
        });
      }
    }
  }

  // === RULE 9: Deteksi Siklus Sirkular Prasyarat ===
  if (config.checkPrerequisiteCycles && prereqs.length > 0) {
    const cycleCheck = detectPrerequisiteCycles(prereqs);
    if (cycleCheck.hasCycle) {
      issues.push({
        ruleCode: "RULE_PREREQ_CIRCULAR",
        title: "Siklus Prasyarat Sirkular Terdeteksi",
        severity: "kritis",
        sourceLocation: `ATP: ${plan.title}`,
        entityType: "prerequisite",
        entityId: plan.id,
        description: `Terdeteksi ketergantungan melingkar antarprasyarat: ${cycleCheck.cyclePath?.join(" → ")}. Siswa tidak akan pernah dapat memulai topik ini karena saling mengunci.`,
        recommendation: "Putus salah satu relasi prasyarat melingkar agar membentuk alur maju (*directed acyclic graph*).",
      });
    }
  }

  // === RULE 10: Tinjauan Alokasi Waktu Total Guru vs Target Jam ===
  if (config.checkTimeAllocation && plan.totalHours > 0 && items.length > 0) {
    const deviation = Math.abs(totalAllocatedHours - plan.totalHours);
    const deviationPercent = (deviation / plan.totalHours) * 100;

    if (deviationPercent > config.maxHoursDeviationPercent) {
      issues.push({
        ruleCode: "RULE_HOURS_VARIANCE",
        title: "Penyimpangan Alokasi Jam Pelajaran (JP)",
        severity: "peringatan",
        sourceLocation: `ATP: ${plan.title} (Total: ${totalAllocatedHours} JP, Target: ${plan.totalHours} JP)`,
        entityType: "atp_plan",
        entityId: plan.id,
        description: `Total jam yang dialokasikan (${totalAllocatedHours} JP) menyimpang sebesar ${deviationPercent.toFixed(1)}% dari target tahunan (${plan.totalHours} JP). Batas toleransi adalah ${config.maxHoursDeviationPercent}%.`,
        recommendation: `Sesuaikan alokasi waktu pada tiap butir TP agar mendekati target ${plan.totalHours} JP.`,
      });
    }
  }

  // Hitung jumlah masalah per tingkat keparahan
  const criticalCount = issues.filter((i) => i.severity === "kritis").length;
  const warningCount = issues.filter((i) => i.severity === "peringatan").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;
  const totalIssues = issues.length;
  const isValidTechnically = criticalCount === 0;

  const summary = isValidTechnically
    ? `ATP lolos pemeriksaan teknis otomatis dengan ${warningCount} catatan peringatan dan ${infoCount} info saran.`
    : `ATP memiliki ${criticalCount} masalah kritis yang wajib diperbaiki sebelum dapat disetujui atau digunakan.`;

  let reportId: string | undefined;

  // Simpan laporan ke database jika persistReport diaktifkan
  if (persistReport) {
    const [savedReport] = await db
      .insert(schema.validationReports)
      .values({
        targetType: "atp_plan",
        targetId: plan.id,
        title: `Laporan Validasi ATP: ${plan.title}`,
        summary,
        totalIssues,
        criticalCount,
        warningCount,
        infoCount,
        pedagogicalDisclaimer: PEDAGOGICAL_DISCLAIMER,
        reviewedById: reviewer?.id,
        reviewedByName: reviewer?.name,
        approvedAt: isValidTechnically && plan.status === "approved" ? new Date() : null,
      })
      .returning({ id: schema.validationReports.id });

    reportId = savedReport.id;

    if (issues.length > 0) {
      await db.insert(schema.validationIssues).values(
        issues.map((i) => ({
          reportId: savedReport.id,
          ruleCode: i.ruleCode,
          title: i.title,
          severity: i.severity,
          sourceLocation: i.sourceLocation,
          entityType: i.entityType,
          entityId: i.entityId,
          description: i.description,
          recommendation: i.recommendation,
          resolutionStatus: "terbuka" as const,
        }))
      );
    }
  }

  return {
    targetType: "atp_plan",
    targetId: plan.id,
    title: `Laporan Validasi: ${plan.title}`,
    summary,
    isValidTechnically,
    totalIssues,
    criticalCount,
    warningCount,
    infoCount,
    pedagogicalDisclaimer: PEDAGOGICAL_DISCLAIMER,
    issues,
    reportId,
  };
}

/**
 * Validasi cepat untuk satu TP terhadap kelengkapan CP dan prasyaratnya.
 */
export async function validateSingleTp(tpId: string): Promise<ValidationIssueItem[]> {
  const issues: ValidationIssueItem[] = [];

  const tps = await db.select().from(schema.tujuanPembelajaran).where(eq(schema.tujuanPembelajaran.id, tpId));
  if (tps.length === 0) {
    return [{
      ruleCode: "RULE_TP_NOT_FOUND",
      title: "TP Tidak Ditemukan",
      severity: "kritis",
      sourceLocation: `TP ID: ${tpId}`,
      entityType: "tp",
      entityId: tpId,
      description: "TP tidak terdaftar di database.",
      recommendation: "Pilih TP yang valid.",
    }];
  }

  const tp = tps[0];

  // 1. Cek CP Induk
  if (!tp.cpId) {
    issues.push({
      ruleCode: "RULE_TP_ORPHAN",
      title: "TP Tidak Memiliki Dasar CP",
      severity: "kritis",
      sourceLocation: `TP: ${tp.code}`,
      entityType: "tp",
      entityId: tp.id,
      description: "Tujuan Pembelajaran belum dikaitkan dengan Capaian Pembelajaran (CP) induk.",
      recommendation: "Pilih Capaian Pembelajaran resmi yang mendasari tujuan ini.",
    });
  } else {
    const cps = await db.select().from(schema.capaianPembelajaran).where(eq(schema.capaianPembelajaran.id, tp.cpId));
    if (cps.length === 0) {
      issues.push({
        ruleCode: "RULE_CP_NOT_FOUND",
        title: "CP Induk Terhapus / Tidak Valid",
        severity: "kritis",
        sourceLocation: `TP: ${tp.code}`,
        entityType: "tp",
        entityId: tp.id,
        description: `CP dengan ID ${tp.cpId} tidak ditemukan.`,
        recommendation: "Tautkan ke CP aktif.",
      });
    } else {
      const cp = cps[0];
      if (cp.phase !== tp.phase) {
        issues.push({
          ruleCode: "RULE_PHASE_MISMATCH",
          title: "Ketidaksesuaian Fase TP dan CP",
          severity: "kritis",
          sourceLocation: `TP: ${tp.code}`,
          entityType: "tp",
          entityId: tp.id,
          description: `Fase TP (${tp.phase}) tidak cocok dengan Fase CP (${cp.phase}).`,
          recommendation: "Sesuaikan pilihan Fase TP agar identik dengan CP.",
        });
      }
    }
  }

  // 2. Cek Prasyarat Siklis
  const prereqs = await db.select().from(schema.tpPrerequisites).where(eq(schema.tpPrerequisites.tpId, tpId));
  for (const p of prereqs) {
    if (p.prerequisiteTpId === tpId) {
      issues.push({
        ruleCode: "RULE_SELF_PREREQUISITE",
        title: "Prasyarat Merujuk ke Diri Sendiri",
        severity: "kritis",
        sourceLocation: `TP: ${tp.code}`,
        entityType: "prerequisite",
        entityId: p.id,
        description: "Tujuan Pembelajaran tidak boleh mensyaratkan dirinya sendiri.",
        recommendation: "Hapus relasi prasyarat ke diri sendiri.",
      });
    }
  }

  return issues;
}
