import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { MediaLibraryView } from "@/components/lkpd/MediaLibraryView";

export default async function MediaPembelajaranPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [items, subjects, groups] = await Promise.all([
    db
      .select({
        id: schema.learningMediaItems.id,
        title: schema.learningMediaItems.title,
        mediaType: schema.learningMediaItems.mediaType,
        subjectId: schema.learningMediaItems.subjectId,
        subjectName: schema.subjects.name,
        phase: schema.learningMediaItems.phase,
        targetGrade: schema.learningMediaItems.targetGrade,
        groupId: schema.learningMediaItems.groupId,
        description: schema.learningMediaItems.description,
        tags: schema.learningMediaItems.tags,
        contentData: schema.learningMediaItems.contentData,
        colorModeSupported: schema.learningMediaItems.colorModeSupported,
        isPublicLibrary: schema.learningMediaItems.isPublicLibrary,
        createdAt: schema.learningMediaItems.createdAt,
        authorName: schema.users.name,
      })
      .from(schema.learningMediaItems)
      .leftJoin(schema.subjects, eq(schema.learningMediaItems.subjectId, schema.subjects.id))
      .leftJoin(schema.users, eq(schema.learningMediaItems.authorId, schema.users.id))
      .orderBy(desc(schema.learningMediaItems.createdAt)),

    db.query.subjects.findMany(),
    db.query.multigradeGroups.findMany(),
  ]);

  return (
    <MediaLibraryView
      initialItems={items}
      subjects={subjects}
      groups={groups}
    />
  );
}
