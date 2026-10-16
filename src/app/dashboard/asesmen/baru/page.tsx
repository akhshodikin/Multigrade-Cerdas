import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { CreateAssessmentForm } from "@/components/assessment/CreateAssessmentForm";

export default async function BaruAsesmenPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [classes, subjects, tps, groups, activeTerm] = await Promise.all([
    db.query.classes.findMany({ orderBy: (c, { asc }) => [asc(c.id)] }),
    db.query.subjects.findMany(),
    db.query.tujuanPembelajaran.findMany(),
    db.query.multigradeGroups.findMany(),
    db.query.academicTerms.findFirst({ where: (term, { eq }) => eq(term.isActive, true) }),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <CreateAssessmentForm
        classes={classes}
        subjects={subjects}
        tps={tps}
        groups={groups}
        activeTerm={activeTerm}
      />
    </div>
  );
}
