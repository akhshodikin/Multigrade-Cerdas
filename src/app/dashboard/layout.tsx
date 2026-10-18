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

  let schoolData = {
    name: "SDN SEDAENG II Tosari",
    activeAcademicYear: "2024/2025",
    activeSemester: "Ganjil",
  };
  try {
    const profile = await db.select().from(schema.schoolProfile).where(eq(schema.schoolProfile.id, 1));
    if (profile[0]) {
      schoolData = profile[0];
    }
  } catch (err) {
    console.warn("[DashboardLayout] Could not fetch school profile from DB:", err);
  }

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
