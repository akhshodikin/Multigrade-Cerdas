import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { getMultigradeGroupRecap } from "@/lib/assessment/engine";
import { MultigradeGroupRecapView } from "@/components/assessment/MultigradeGroupRecapView";

export default async function KelompokRecapPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { groupId } = await params;

  try {
    const [recap, school] = await Promise.all([
      getMultigradeGroupRecap(groupId),
      db.query.schoolProfile.findFirst(),
    ]);

    return <MultigradeGroupRecapView recap={recap} school={school} />;
  } catch (err: any) {
    notFound();
  }
}
