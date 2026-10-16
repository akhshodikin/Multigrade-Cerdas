import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, asc, eq } from "drizzle-orm";
import {
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Copy,
  Printer,
  FileSpreadsheet,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ModulAjarIndexPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  const resolvedParams = searchParams ? await searchParams : {};
  const currentFilter = resolvedParams.filter || "all";

  // Query Modul Ajar, groups, subjects, and teachers
  const [plans, groups, subjects, teachers] = await Promise.all([
    db.select().from(schema.multigradeLessonPlans).orderBy(desc(schema.multigradeLessonPlans.createdAt)),
    db.select().from(schema.multigradeGroups).orderBy(asc(schema.multigradeGroups.id)),
    db.select().from(schema.subjects).orderBy(asc(schema.subjects.name)),
    db.select().from(schema.users),
  ]);

  // Filter plans based on active tab
  const filteredPlans = plans.filter((plan) => {
    if (currentFilter === "group-a") return plan.groupId === "group-a";
    if (currentFilter === "group-b") return plan.groupId === "group-b";
    if (currentFilter === "group-c") return plan.groupId === "group-c";
    if (currentFilter === "draft") return plan.status === "draft";
    if (currentFilter === "published") return plan.status === "published";
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-indigo-900/40">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Modul Ajar Multigrade Berpola Rotasi Kelas Rangkap</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Generator Modul Ajar Multigrade Cerdas AI
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/80 leading-relaxed">
            Menyusun modul ajar Kurikulum Merdeka berdiferensiasi untuk SDN SEDAENG II Tosari dengan 8 pola rotasi pembelajaran stasioner (bimbingan langsung vs aktivitas mandiri sesuai usia).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Link
            href="/dashboard/kurikulum/modul-ajar/baru"
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-amber-100" />
            <span>+ Buat Modul Ajar Baru</span>
          </Link>
          <Link
            href="/dashboard/kurikulum/atp"
            className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4 text-indigo-300" />
            <span>Lihat ATP Rujukan</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-200/70 rounded-2xl text-xs font-bold scrollbar-none">
        <Link
          href="/dashboard/kurikulum/modul-ajar"
          className={`px-4 py-2 rounded-xl transition ${
            currentFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Semua Modul ({plans.length})
        </Link>
        <Link
          href="/dashboard/kurikulum/modul-ajar?filter=group-a"
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            currentFilter === "group-a" ? "bg-white text-emerald-800 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Kelompok A (Kls 1 &amp; 2)
        </Link>
        <Link
          href="/dashboard/kurikulum/modul-ajar?filter=group-b"
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            currentFilter === "group-b" ? "bg-white text-blue-800 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500" /> Kelompok B (Kls 3 &amp; 4)
        </Link>
        <Link
          href="/dashboard/kurikulum/modul-ajar?filter=group-c"
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            currentFilter === "group-c" ? "bg-white text-purple-800 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500" /> Kelompok C (Kls 5 &amp; 6)
        </Link>
        <Link
          href="/dashboard/kurikulum/modul-ajar?filter=draft"
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            currentFilter === "draft" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Draf Guru
        </Link>
        <Link
          href="/dashboard/kurikulum/modul-ajar?filter=published"
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            currentFilter === "published" ? "bg-white text-purple-800 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Diterbitkan (Aktif)
        </Link>
      </div>

      {/* List of Modul Ajar Cards */}
      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Belum Ada Modul Ajar untuk Kategori Ini</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Gunakan Generator Cerdas untuk menyusun rancangan modul ajar kelas rangkap terpadu.
            </p>
            <Link
              href="/dashboard/kurikulum/modul-ajar/baru"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Buat Modul Ajar Sekarang
            </Link>
          </div>
        ) : (
          filteredPlans.map((plan) => {
            const subject = subjects.find((s) => s.id === plan.subjectId);
            const group = groups.find((g) => g.id === plan.groupId);
            const teacher = teachers.find((t) => t.id === plan.teacherId);

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
              >
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-xs font-extrabold uppercase bg-purple-100 text-purple-800">
                        {plan.phase}
                      </span>
                      {group && (
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {group.name} (Kelas {group.grades})
                        </span>
                      )}
                      <span className="text-xs text-slate-500">&bull; TA {plan.academicYear} &bull; Smt {plan.semester}</span>
                      <span className="text-xs text-slate-500">&bull; {plan.durationMinutes} Menit ({plan.allocatedHours} JP)</span>
                    </div>

                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      {plan.title}
                    </h2>

                    <p className="text-xs text-slate-500">
                      Mata Pelajaran: <strong className="text-slate-700">{subject ? subject.name : plan.subjectId}</strong> &bull; Guru Pengampu: <strong className="text-slate-700">{teacher?.name || "Guru Kelas"}</strong> &bull; Versi {plan.version}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="text-right px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                      <span className={`text-xs font-bold capitalize ${
                        plan.status === "published"
                          ? "text-purple-700"
                          : plan.status === "approved"
                          ? "text-emerald-700"
                          : plan.status === "in_review"
                          ? "text-amber-700"
                          : "text-slate-600"
                      }`}>
                        {plan.status === "published" ? "Diterbitkan" : plan.status === "approved" ? "Disetujui" : plan.status === "in_review" ? "Ditinjau" : "Draf"}
                      </span>
                    </div>

                    <Link
                      href={`/dashboard/kurikulum/modul-ajar/${plan.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Buka Workspace &amp; Cetak</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
