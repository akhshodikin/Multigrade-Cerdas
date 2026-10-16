import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, Sparkles, BookOpen } from "lucide-react";
import { ModulAjarWizard } from "@/components/curriculum/ModulAjarWizard";

export const dynamic = "force-dynamic";

export default async function ModulAjarBaruPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Ambil data kelompok, mapel, TP, peta materi yang disetujui, dan ATP
  const [groups, subjects, tps, approvedMaps, atpPlans] = await Promise.all([
    db.select().from(schema.multigradeGroups).orderBy(asc(schema.multigradeGroups.id)),
    db.select().from(schema.subjects).orderBy(asc(schema.subjects.name)),
    db
      .select({
        id: schema.tujuanPembelajaran.id,
        code: schema.tujuanPembelajaran.code,
        competency: schema.tujuanPembelajaran.competency,
        description: schema.tujuanPembelajaran.description,
        targetGrade: schema.tujuanPembelajaran.targetGrade,
        subjectId: schema.tujuanPembelajaran.subjectId,
        phase: schema.tujuanPembelajaran.phase,
        verificationStatus: schema.tujuanPembelajaran.verificationStatus,
        cpElement: schema.capaianPembelajaran.element,
      })
      .from(schema.tujuanPembelajaran)
      .leftJoin(
        schema.capaianPembelajaran,
        eq(schema.tujuanPembelajaran.cpId, schema.capaianPembelajaran.id)
      )
      .orderBy(asc(schema.tujuanPembelajaran.code)),
    db
      .select()
      .from(schema.multigradeMaterialMaps)
      .where(eq(schema.multigradeMaterialMaps.status, "approved")),
    db.select().from(schema.atpPlans),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/dashboard/kurikulum/modul-ajar"
            className="inline-flex items-center text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali ke Daftar Modul Ajar
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Generator Modul Ajar Multigrade Cerdas AI
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Penyusunan modul pembelajaran berdiferensiasi kelas rangkap SDN SEDAENG II Tosari dengan 8 pola rotasi pembelajaran stasioner
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/kurikulum/atp"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition border border-slate-300"
          >
            <BookOpen className="w-4 h-4 text-purple-600" /> Buka Alur ATP
          </Link>
        </div>
      </div>

      {/* Main Wizard Component */}
      <ModulAjarWizard
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
        allTps={tps.map((t) => ({
          id: t.id,
          code: t.code,
          competency: t.competency,
          description: t.description,
          targetGrade: t.targetGrade,
          subjectId: t.subjectId,
          phase: t.phase,
          verificationStatus: t.verificationStatus,
          cpElement: t.cpElement,
        }))}
        approvedMaps={approvedMaps.map((m) => ({
          id: m.id,
          groupId: m.groupId,
          subjectId: m.subjectId,
          sharedTheme: m.sharedTheme,
          mappingStrategy: m.mappingStrategy,
        }))}
        atpPlans={atpPlans.map((a) => ({
          id: a.id,
          title: a.title,
          groupId: a.groupId,
          subjectId: a.subjectId,
        }))}
      />
    </div>
  );
}
