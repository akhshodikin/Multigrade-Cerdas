import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { AssessmentEntryWorkspace } from "@/components/assessment/AssessmentEntryWorkspace";

export default async function AsesmenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const assessment = await db.query.assessments.findFirst({
    where: eq(schema.assessments.id, id),
  });

  if (!assessment) notFound();

  const [subject, targetClass, group, tp, students, existingResults] = await Promise.all([
    db.query.subjects.findFirst({ where: eq(schema.subjects.id, assessment.subjectId) }),
    db.query.classes.findFirst({ where: eq(schema.classes.id, assessment.classId) }),
    assessment.groupId ? db.query.multigradeGroups.findFirst({ where: eq(schema.multigradeGroups.id, assessment.groupId) }) : null,
    assessment.tpId ? db.query.tujuanPembelajaran.findFirst({ where: eq(schema.tujuanPembelajaran.id, assessment.tpId) }) : null,
    db.query.students.findMany({
      where: eq(schema.students.classId, assessment.classId),
      orderBy: (s, { asc }) => [asc(s.studentCode)],
    }),
    db.query.studentAssessmentResults.findMany({
      where: eq(schema.studentAssessmentResults.assessmentId, id),
    }),
  ]);

  return (
    <AssessmentEntryWorkspace
      assessment={assessment}
      subject={subject}
      targetClass={targetClass}
      group={group}
      tp={tp}
      students={students}
      initialResults={existingResults}
    />
  );
}
