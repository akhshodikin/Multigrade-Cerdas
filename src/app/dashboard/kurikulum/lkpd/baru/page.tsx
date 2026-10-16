import React from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LkpdGeneratorWizard } from "@/components/lkpd/LkpdGeneratorWizard";

export default async function BaruLkpdPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [groups, subjects, tps, lessonPlans, currentTerm] = await Promise.all([
    db.query.multigradeGroups.findMany(),
    db.query.subjects.findMany(),
    db.query.tujuanPembelajaran.findMany(),
    db.query.multigradeLessonPlans.findMany(),
    db.query.academicTerms.findFirst({ where: (term, { eq }) => eq(term.isActive, true) }),
  ]);

  return (
    <LkpdGeneratorWizard
      groups={groups}
      subjects={subjects}
      tps={tps}
      lessonPlans={lessonPlans}
      currentTerm={currentTerm}
    />
  );
}
