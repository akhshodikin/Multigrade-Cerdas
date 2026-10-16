import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export interface RecordVersionParams {
  entityType: "source_doc" | "cp" | "tp" | "atp";
  entityId: string;
  versionNumber: number;
  changeType: "created" | "updated" | "status_changed" | "restored";
  changedById?: string | null;
  changedByName?: string | null;
  previousSnapshot?: Record<string, unknown> | null;
  currentSnapshot?: Record<string, unknown> | null;
  changeReason?: string | null;
}

export async function recordCurriculumVersion(params: RecordVersionParams) {
  try {
    await db.insert(schema.curriculumVersions).values({
      entityType: params.entityType,
      entityId: params.entityId,
      versionNumber: params.versionNumber,
      changeType: params.changeType,
      changedById: params.changedById || null,
      changedByName: params.changedByName || "Sistem",
      previousSnapshot: params.previousSnapshot || null,
      currentSnapshot: params.currentSnapshot || null,
      changeReason: params.changeReason || null,
    });
  } catch (error) {
    console.error("Gagal mencatat versi kurikulum:", error);
  }
}

export async function getEntityVersionHistory(
  entityType: "source_doc" | "cp" | "tp" | "atp",
  entityId: string
) {
  return db
    .select()
    .from(schema.curriculumVersions)
    .where(
      and(
        eq(schema.curriculumVersions.entityType, entityType),
        eq(schema.curriculumVersions.entityId, entityId)
      )
    )
    .orderBy(desc(schema.curriculumVersions.versionNumber));
}

export function compareSnapshots(
  previous?: Record<string, unknown> | null,
  current?: Record<string, unknown> | null
): Array<{ field: string; previousValue: unknown; currentValue: unknown }> {
  if (!previous || !current) return [];

  const allKeys = Array.from(new Set([...Object.keys(previous), ...Object.keys(current)]));
  const differences: Array<{ field: string; previousValue: unknown; currentValue: unknown }> = [];

  for (const key of allKeys) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      differences.push({
        field: key,
        previousValue: previous[key],
        currentValue: current[key],
      });
    }
  }

  return differences;
}
