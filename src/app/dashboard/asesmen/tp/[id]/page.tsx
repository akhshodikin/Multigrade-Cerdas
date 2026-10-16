import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { getTpAssessmentRecap } from "@/lib/assessment/engine";
import { TpRecapView } from "@/components/assessment/TpRecapView";

export default async function TpRecapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  try {
    const [recap, school] = await Promise.all([
      getTpAssessmentRecap(id),
      db.query.schoolProfile.findFirst(),
    ]);

    return <TpRecapView recap={recap} school={school} />;
  } catch (err: any) {
    notFound();
  }
}
