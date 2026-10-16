import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await db.select().from(schema.schoolProfile).where(eq(schema.schoolProfile.id, 1));
  const schoolData = profile[0] || {
    name: "SDN SEDAENG II Tosari",
    activeAcademicYear: "2024/2025",
    activeSemester: "Ganjil",
  };

  return (
    <DashboardLayoutClient
      user={user}
      schoolName={schoolData.name}
      academicYear={schoolData.activeAcademicYear}
      semester={schoolData.activeSemester}
    >
      {children}
    </DashboardLayoutClient>
  );
}
