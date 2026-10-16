import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { getLkpdDetailsAction } from "@/app/actions/lkpd-media";
import { LkpdDetailView } from "@/components/lkpd/LkpdDetailView";

export default async function LkpdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const res = await getLkpdDetailsAction(id);

  if (!res.success || !res.data) {
    notFound();
  }

  const { lkpd, school, subject, group, authorName, approverName, relatedMedia } = res.data;

  return (
    <LkpdDetailView
      initialLkpd={lkpd}
      school={school}
      subject={subject}
      group={group}
      userRole={user.role}
      authorName={authorName}
      approverName={approverName}
      relatedMedia={relatedMedia}
    />
  );
}
