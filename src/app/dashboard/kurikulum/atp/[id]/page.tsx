import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAtpPlanFullDetailsAction } from "@/app/actions/atp-generator";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AtpPlanDetailView } from "@/components/curriculum/AtpPlanDetailView";

export const dynamic = "force-dynamic";

export default async function AtpPlanWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const details = await getAtpPlanFullDetailsAction(id);
  if (!details || !details.plan) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <Link
          href="/dashboard/kurikulum/atp"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali ke Daftar ATP
        </Link>
        <Link
          href="/dashboard/kurikulum/atp/generator"
          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition border border-purple-200"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Buka Generator Baru
        </Link>
      </div>

      {/* Comprehensive Workspace View */}
      <AtpPlanDetailView
        data={{
          ...details,
          plan: {
            ...details.plan,
            totalHours: details.plan.totalHours,
            effectiveWeeks: details.plan.effectiveWeeks || 36,
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
