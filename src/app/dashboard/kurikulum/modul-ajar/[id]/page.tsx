import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getModulAjarFullDetailsAction } from "@/app/actions/modul-ajar";
import { ArrowLeft, Sparkles, Plus } from "lucide-react";
import { ModulAjarDetailView } from "@/components/curriculum/ModulAjarDetailView";

export const dynamic = "force-dynamic";

export default async function ModulAjarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const details = await getModulAjarFullDetailsAction(id);
  if (!details || !details.plan) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <Link
          href="/dashboard/kurikulum/modul-ajar"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali ke Daftar Modul Ajar
        </Link>
        <Link
          href="/dashboard/kurikulum/modul-ajar/baru"
          className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition border border-purple-200"
        >
          <Plus className="w-3.5 h-3.5 text-purple-600" /> Buat Modul Ajar Baru
        </Link>
      </div>

      {/* Comprehensive Workspace Component */}
      <ModulAjarDetailView
        data={{
          ...details,
          plan: {
            ...details.plan,
            learningObjectives: details.plan.learningObjectives,
            curriculumReferences: details.plan.curriculumReferences,
            mediaAndResources: details.plan.mediaAndResources,
            teachingSteps: details.plan.teachingSteps,
            differentiation: details.plan.differentiation,
            assessments: details.plan.assessments,
            reflections: details.plan.reflections,
            remedialAndEnrichment: details.plan.remedialAndEnrichment,
          },
        }}
        currentUser={{
          id: user.id,
          name: user.name,
          role: user.role,
        }}
      />
    </div>
  );
}
