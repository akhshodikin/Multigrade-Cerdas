import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  OFFICIAL_SUBJECTS,
  OFFICIAL_CPS,
  OFFICIAL_TPS,
  TpItem,
} from "@/data/curriculum/tp-atp-dataset";

export interface ImportTpAtpResult {
  subjectsAdded: number;
  cpsAdded: number;
  tpsAdded: number;
  tpsUpdated: number;
  atpPlansCreated: number;
  atpItemsCreated: number;
}

/**
 * Memuat dan mengintegrasikan 309 Tujuan Pembelajaran (TP) & Alur Tujuan Pembelajaran (ATP)
 * resmi BSKAP No. 032/H/KR/2024 untuk Kelas 1 s/d 6 ke dalam database SDN SEDAENG II TOSARI.
 */
export async function loadOfficialTpAndAtpData(): Promise<ImportTpAtpResult> {
  let subjectsAdded = 0;
  let cpsAdded = 0;
  let tpsAdded = 0;
  let tpsUpdated = 0;
  let atpPlansCreated = 0;
  let atpItemsCreated = 0;

  // 1. Ambil akun acuan (Guru A, Guru B, Guru C, dan Kepala Sekolah)
  const teachers = await db.query.users.findMany();
  const teacherA = teachers.find((u) => u.assignedGroupId === "group-a") || teachers[0];
  const teacherB = teachers.find((u) => u.assignedGroupId === "group-b") || teachers[0];
  const teacherC = teachers.find((u) => u.assignedGroupId === "group-c") || teachers[0];
  const headmaster = teachers.find((u) => u.role === "headmaster") || teachers[0];

  const getTeacherForGroup = (groupId: string) => {
    if (groupId === "group-a") return teacherA;
    if (groupId === "group-b") return teacherB;
    if (groupId === "group-c") return teacherC;
    return teacherA;
  };

  // 2. Ambil dokumen sumber BSKAP 032/H/KR/2024
  const sourceDoc = await db.query.curriculumSources.findFirst({
    where: eq(schema.curriculumSources.documentNumber, "032/H/KR/2024"),
  });

  // 3. Sinkronisasi Mata Pelajaran (Subjects)
  const existingSubjects = await db.select().from(schema.subjects);
  const existingSubjectIds = new Set(existingSubjects.map((s) => s.id));

  for (const s of OFFICIAL_SUBJECTS) {
    if (!existingSubjectIds.has(s.id)) {
      await db.insert(schema.subjects).values({
        id: s.id,
        name: s.name,
        category: s.category,
        targetPhases: s.targetPhases,
      });
      existingSubjectIds.add(s.id);
      subjectsAdded++;
    }
  }

  // 4. Sinkronisasi Capaian Pembelajaran (CP Elements)
  const existingCps = await db.select().from(schema.capaianPembelajaran);
  const cpLookup = new Map<string, string>(); // key -> id

  for (const cp of existingCps) {
    const key = `${cp.subjectId}|${cp.phase}|${cp.element}`;
    cpLookup.set(key, cp.id);
  }

  for (const cp of OFFICIAL_CPS) {
    const key = `${cp.subjectId}|${cp.phase}|${cp.element}`;
    if (!cpLookup.has(key)) {
      const [inserted] = await db
        .insert(schema.capaianPembelajaran)
        .values({
          subjectId: cp.subjectId,
          phase: cp.phase,
          element: cp.element,
          sourceDocumentId: sourceDoc?.id,
          sourcePage: "BSKAP No. 032/H/KR/2024 Lampiran II",
          sourceSection: `Elemen ${cp.element}`,
          originalSourceText: cp.originalSourceText,
          duplicateHash: cp.duplicateHash,
          version: 1,
          verificationStatus: "approved",
          approvedById: headmaster?.id,
          approvedAt: new Date(),
        })
        .returning();
      if (inserted) {
        cpLookup.set(key, inserted.id);
        cpsAdded++;
      }
    }
  }

  // 5. Sinkronisasi Tujuan Pembelajaran (309 TP)
  const existingTps = await db.select().from(schema.tujuanPembelajaran);
  const tpCodeMap = new Map<string, typeof schema.tujuanPembelajaran.$inferSelect>();
  for (const tp of existingTps) {
    tpCodeMap.set(tp.code, tp);
  }

  const insertedTpRecords: Array<typeof schema.tujuanPembelajaran.$inferSelect> = [];

  for (const tp of OFFICIAL_TPS) {
    const author = getTeacherForGroup(tp.multigradeGroup);
    const cpKey = `${tp.subjectId}|${tp.phase}|${tp.element}`;
    const cpId = cpLookup.get(cpKey) || null;

    const existing = tpCodeMap.get(tp.tpCode);
    if (!existing) {
      const [created] = await db
        .insert(schema.tujuanPembelajaran)
        .values({
          cpId,
          subjectId: tp.subjectId,
          phase: tp.phase,
          targetGrade: tp.targetGrade,
          code: tp.tpCode,
          competency: tp.competency,
          contentScope: tp.contentScope,
          description: tp.description,
          sourceType: "derived_teacher",
          version: 1,
          verificationStatus: "approved",
          createdById: author?.id,
          approvedById: headmaster?.id,
          approvedAt: new Date(),
        })
        .returning();

      if (created) {
        tpCodeMap.set(tp.tpCode, created);
        insertedTpRecords.push(created);
        tpsAdded++;
      }
    } else {
      // Update with latest enriched description if draft
      insertedTpRecords.push(existing);
      tpsUpdated++;
    }
  }

  // 6. Buat / Sinkronkan Alur Tujuan Pembelajaran (ATP Plans & ATP Items)
  // A. Rencana ATP Multigrade per Kelompok & Mapel (e.g. Kelompok A Matematika: Kelas 1 & 2)
  const groups = [
    { id: "group-a", name: "Kelompok A", grades: [1, 2], phase: "Fase A" as const },
    { id: "group-b", name: "Kelompok B", grades: [3, 4], phase: "Fase B" as const },
    { id: "group-c", name: "Kelompok C", grades: [5, 6], phase: "Fase C" as const },
  ];

  // Group TPs by subjectId and group
  const mapSubjectGroupTps = new Map<string, TpItem[]>();
  for (const tp of OFFICIAL_TPS) {
    const key = `${tp.multigradeGroup}|${tp.subjectId}`;
    if (!mapSubjectGroupTps.has(key)) {
      mapSubjectGroupTps.set(key, []);
    }
    mapSubjectGroupTps.get(key)!.push(tp);
  }

  for (const group of groups) {
    const author = getTeacherForGroup(group.id);

    for (const subject of OFFICIAL_SUBJECTS) {
      const key = `${group.id}|${subject.id}`;
      const groupTps = mapSubjectGroupTps.get(key) || [];
      if (groupTps.length === 0) continue;

      // Check if plan already exists
      const existingPlan = await db.query.atpPlans.findFirst({
        where: and(
          eq(schema.atpPlans.groupId, group.id),
          eq(schema.atpPlans.subjectId, subject.id)
        ),
      });

      if (!existingPlan) {
        // Alokasi jam pelajaran standar: 4 JP per butir TP
        const totalHours = groupTps.length * 4;

        const [plan] = await db
          .insert(schema.atpPlans)
          .values({
            title: `ATP ${subject.name} ${group.name} (${group.phase}) SDN SEDAENG II TOSARI`,
            subjectId: subject.id,
            phase: group.phase,
            groupId: group.id,
            targetGrade: null, // Multigrade
            semester: "Semua",
            academicYear: "2024/2025",
            totalHours,
            effectiveWeeks: 36,
            description: `Alur Tujuan Pembelajaran terintegrasi kelas rangkap untuk ${subject.name} ${group.name} (Kelas ${group.grades.join(" & ")}) berdasarkan BSKAP No. 032/H/KR/2024.`,
            status: "approved",
            authorId: author?.id,
            approvedById: headmaster?.id,
            approvedAt: new Date(),
          })
          .returning();

        if (plan) {
          atpPlansCreated++;

          // Insert items
          let seq = 1;
          for (const tp of groupTps) {
            const tpRecord = tpCodeMap.get(tp.tpCode);
            if (!tpRecord) continue;

            // Semester: first half of grade is Ganjil, second half is Genap
            const gradeTps = groupTps.filter((g) => g.targetGrade === tp.targetGrade);
            const idxInGrade = gradeTps.findIndex((g) => g.tpCode === tp.tpCode);
            const isGanjil = idxInGrade < Math.ceil(gradeTps.length / 2);
            const semester = isGanjil ? "Ganjil" : "Genap";

            await db.insert(schema.atpItems).values({
              atpPlanId: plan.id,
              tpId: tpRecord.id,
              sequenceOrder: seq++,
              allocatedHours: 4,
              targetGrade: tp.targetGrade,
              semester,
              startWeek: (seq * 2) % 18 + 1,
              endWeek: (seq * 2) % 18 + 2,
              monthName: isGanjil ? "Semester 1 (Juli-Desember)" : "Semester 2 (Januari-Juni)",
              multigradeStrategy: "terpadu_sebagian",
              multigradeNotes: tp.sequenceNotes || `Pola rotasi staggered instruction untuk Kelas ${tp.targetGrade}`,
            });
            atpItemsCreated++;
          }
        }
      }
    }
  }

  // B. Rencana ATP Kelas Tunggal (Single Grade 1 s/d 6)
  const gradeDefs = [
    { grade: 1, groupId: "group-a", phase: "Fase A" as const },
    { grade: 2, groupId: "group-a", phase: "Fase A" as const },
    { grade: 3, groupId: "group-b", phase: "Fase B" as const },
    { grade: 4, groupId: "group-b", phase: "Fase B" as const },
    { grade: 5, groupId: "group-c", phase: "Fase C" as const },
    { grade: 6, groupId: "group-c", phase: "Fase C" as const },
  ];

  for (const gd of gradeDefs) {
    const author = getTeacherForGroup(gd.groupId);

    for (const subject of OFFICIAL_SUBJECTS) {
      const singleGradeTps = OFFICIAL_TPS.filter(
        (t) => t.targetGrade === gd.grade && t.subjectId === subject.id
      );
      if (singleGradeTps.length === 0) continue;

      const existingSinglePlan = await db.query.atpPlans.findFirst({
        where: and(
          eq(schema.atpPlans.targetGrade, gd.grade),
          eq(schema.atpPlans.subjectId, subject.id)
        ),
      });

      if (!existingSinglePlan) {
        const totalHours = singleGradeTps.length * 4;

        const [plan] = await db
          .insert(schema.atpPlans)
          .values({
            title: `ATP ${subject.name} Kelas ${gd.grade} (${gd.phase}) SDN SEDAENG II TOSARI`,
            subjectId: subject.id,
            phase: gd.phase,
            groupId: gd.groupId,
            targetGrade: gd.grade,
            semester: "Semua",
            academicYear: "2024/2025",
            totalHours,
            effectiveWeeks: 36,
            description: `Alur Tujuan Pembelajaran resmi Kelas ${gd.grade} untuk ${subject.name} (${gd.phase}) berdasarkan BSKAP No. 032/H/KR/2024.`,
            status: "approved",
            authorId: author?.id,
            approvedById: headmaster?.id,
            approvedAt: new Date(),
          })
          .returning();

        if (plan) {
          atpPlansCreated++;

          let seq = 1;
          for (const tp of singleGradeTps) {
            const tpRecord = tpCodeMap.get(tp.tpCode);
            if (!tpRecord) continue;

            const isGanjil = seq <= Math.ceil(singleGradeTps.length / 2);
            const semester = isGanjil ? "Ganjil" : "Genap";

            await db.insert(schema.atpItems).values({
              atpPlanId: plan.id,
              tpId: tpRecord.id,
              sequenceOrder: seq++,
              allocatedHours: 4,
              targetGrade: gd.grade,
              semester,
              startWeek: (seq * 2) % 18 + 1,
              endWeek: (seq * 2) % 18 + 2,
              monthName: isGanjil ? "Semester 1 (Juli-Desember)" : "Semester 2 (Januari-Juni)",
              multigradeStrategy: "mandiri",
              multigradeNotes: tp.sequenceNotes || `Target penguasaan kompetensi mandiri Kelas ${gd.grade}`,
            });
            atpItemsCreated++;
          }
        }
      }
    }
  }

  // 7. Catat ke Audit Logs
  try {
    await db.insert(schema.auditLogs).values({
      userId: headmaster?.id,
      userName: headmaster?.name || "Bambang Sutrisno, S.Pd., M.Pd.",
      userRole: headmaster?.role || "headmaster",
      action: "IMPORT_OFFICIAL_TP_ATP",
      targetEntity: "tujuan_pembelajaran",
      details: {
        tpsImported: tpsAdded,
        cpsImported: cpsAdded,
        atpPlansCreated,
        atpItemsCreated,
        source: "Keputusan Kepala BSKAP No. 032/H/KR/2024 Lampiran II",
      },
    });
  } catch (err) {
    console.warn("Audit log notice:", err);
  }

  return {
    subjectsAdded,
    cpsAdded,
    tpsAdded,
    tpsUpdated,
    atpPlansCreated,
    atpItemsCreated,
  };
}
