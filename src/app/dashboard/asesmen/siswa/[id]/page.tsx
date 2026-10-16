import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { getStudentProgressProfile } from "@/lib/assessment/engine";
import { StudentProfileView } from "@/components/assessment/StudentProfileView";

export default async function SiswaProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  try {
    const [profile, school] = await Promise.all([
      getStudentProgressProfile(id),
      db.query.schoolProfile.findFirst(),
    ]);

    return <StudentProfileView profile={profile} school={school} />;
  } catch (err: any) {
    notFound();
  }
}
