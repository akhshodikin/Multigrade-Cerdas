import React from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getAvailableProviders } from "@/lib/ai/provider-factory";
import { MaterialIntersectionWizard } from "@/components/curriculum/MaterialIntersectionWizard";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function NewMaterialIntersectionPage() {
  await requireAuth(["admin", "headmaster", "teacher"]);

  const [groups, subjects] = await Promise.all([
    db.select().from(schema.multigradeGroups).orderBy(schema.multigradeGroups.id),
    db.select().from(schema.subjects).orderBy(schema.subjects.name),
  ]);

  const providers = getAvailableProviders();

  return (
    <div className="py-2">
      <MaterialIntersectionWizard
        groups={groups}
        subjects={subjects}
        providers={providers}
      />
    </div>
  );
}
