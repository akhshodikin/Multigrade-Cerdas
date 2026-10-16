import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc } from "drizzle-orm";
import { ArrowLeft, Sparkles, BookOpen } from "lucide-react";
import { AtpGeneratorWizard } from "@/components/curriculum/AtpGeneratorWizard";

export const dynamic = "force-dynamic";

export default async function AtpGeneratorPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Ambil kelompok multigrade dan mata pelajaran
  const [groups, subjects] = await Promise.all([
    db.select().from(schema.multigradeGroups).orderBy(asc(schema.multigradeGroups.name)),
    db.select().from(schema.subjects).orderBy(asc(schema.subjects.name)),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/dashboard/kurikulum/atp"
            className="inline-flex items-center text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali ke Daftar ATP
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Generator ATP Multigrade Cerdas
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Penyusunan otomatis alur pembelajaran per kelas, fase, Prota, Promes, dan audit alokasi waktu untuk SDN Sedaeng II Tosari
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/kurikulum/irisan"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition border border-slate-300"
          >
            <BookOpen className="w-4 h-4 text-purple-600" /> Cek Pemetaan Irisan Materi
          </Link>
        </div>
      </div>

      {/* Main Wizard Component */}
      <AtpGeneratorWizard
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          phase: g.phase,
          grades: g.grades,
        }))}
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
        }))}
      />
    </div>
  );
}
