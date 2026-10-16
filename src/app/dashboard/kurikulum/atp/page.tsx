import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import {
  createAtpPlanAction,
} from "@/app/actions/curriculum";
import {
  GitCommit,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  FileSpreadsheet,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AlurTujuanPembelajaranPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  const resolvedParams = searchParams ? await searchParams : {};
  const currentFilter = resolvedParams.filter || "all";

  // Query ATP Plans, groups, subjects, and items
  const [atps, atpItems, tps, subjects, groups] = await Promise.all([
    db.select().from(schema.atpPlans).orderBy(desc(schema.atpPlans.createdAt)),
    db.select().from(schema.atpItems).orderBy(asc(schema.atpItems.sequenceOrder)),
    db.select().from(schema.tujuanPembelajaran),
    db.select().from(schema.subjects),
    db.select().from(schema.multigradeGroups),
  ]);

  // Filter ATPs based on active tab
  const filteredAtps = atps.filter((atp) => {
    if (currentFilter === "group-a") return atp.groupId === "group-a" || atp.phase === "Fase A";
    if (currentFilter === "group-b") return atp.groupId === "group-b" || atp.phase === "Fase B";
    if (currentFilter === "group-c") return atp.groupId === "group-c" || atp.phase === "Fase C";
    if (currentFilter === "single") return atp.targetGrade !== null && atp.targetGrade !== undefined;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Hero Banner with Action Button */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-indigo-900/40">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Fitur Baru: Generator ATP Multigrade Otomatis</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Alur Tujuan Pembelajaran (ATP) Multigrade
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/80 leading-relaxed">
            Menyusun alur capaian kompetensi SD secara berurutan, sinkronisasi kelas rangkap (Kelompok A, B, C), Program Tahunan (Prota), Program Semester (Promes), dan peta cakupan TP SDN Sedaeng II Tosari.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Link
            href="/dashboard/kurikulum/atp/generator"
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-100" />
            <span>+ Generator ATP Cerdas</span>
          </Link>
          <Link
            href="/dashboard/kurikulum/irisan"
            className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4 text-indigo-300" />
            <span>Irisan Materi</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-200/70 rounded-2xl text-xs font-bold scrollbar-none">
        <Link
          href="/dashboard/kurikulum/atp"
          className={`px-4 py-2 rounded-xl transition ${
            currentFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Semua Rencana ({atps.length})
        </Link>
        <Link
          href="/dashboard/kurikulum/atp?filter=group-a"
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            currentFilter === "group-a" ? "bg-white text-emerald-800 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Kelompok A (Kls 1 &amp; 2)
        </Link>
        <Link
          href="/dashboard/kurikulum/atp?filter=group-b"
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            currentFilter === "group-b" ? "bg-white text-blue-800 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500" /> Kelompok B (Kls 3 &amp; 4)
        </Link>
        <Link
          href="/dashboard/kurikulum/atp?filter=group-c"
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            currentFilter === "group-c" ? "bg-white text-purple-800 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500" /> Kelompok C (Kls 5 &amp; 6)
        </Link>
        <Link
          href="/dashboard/kurikulum/atp?filter=single"
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            currentFilter === "single" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          ATP Tunggal / Per Kelas
        </Link>
      </div>

      {/* List of ATP Plans */}
      <div className="space-y-4">
        {filteredAtps.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Belum Ada Rencana ATP untuk Filter Ini</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Gunakan Generator ATP Cerdas untuk menghasilkan alur pembelajaran multigrade, Prota, dan Promes secara otomatis.
            </p>
            <Link
              href="/dashboard/kurikulum/atp/generator"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Sparkles className="w-4 h-4" /> Buka Generator ATP
            </Link>
          </div>
        ) : (
          filteredAtps.map((atp) => {
            const subject = subjects.find((s) => s.id === atp.subjectId);
            const group = groups.find((g) => g.id === atp.groupId);
            const items = atpItems.filter((i) => i.atpPlanId === atp.id);

            return (
              <div
                key={atp.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
              >
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-xs font-extrabold uppercase bg-amber-100 text-amber-800">
                        {atp.phase}
                      </span>
                      {group && (
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {group.name} (Kelas {group.grades})
                        </span>
                      )}
                      {atp.targetGrade && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                          Khusus Kelas {atp.targetGrade}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">&bull; TA {atp.academicYear}</span>
                      <span className="text-xs text-slate-500">&bull; Semester {atp.semester || "Semua"}</span>
                    </div>

                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      {atp.title}
                    </h2>

                    <p className="text-xs text-slate-500">
                      Mata Pelajaran: <strong className="text-slate-700">{subject ? subject.name : atp.subjectId}</strong> &bull; Total {items.length} Langkah Tujuan Pembelajaran Terjadwal
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="text-right px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Jam</span>
                      <span className="text-sm font-black text-amber-600">{atp.totalHours} JP</span>
                    </div>

                    <div className="text-right px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                      <span className={`text-xs font-bold capitalize ${
                        atp.status === "in_use"
                          ? "text-purple-700"
                          : atp.status === "approved"
                          ? "text-emerald-700"
                          : atp.status === "in_review"
                          ? "text-amber-700"
                          : "text-slate-600"
                      }`}>
                        {atp.status === "in_use" ? "Digunakan" : atp.status === "approved" ? "Disetujui" : atp.status}
                      </span>
                    </div>

                    <Link
                      href={`/dashboard/kurikulum/atp/${atp.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Buka Workspace &amp; Prota/Promes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Quick Add Rencana Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-600" />
          <span>Buat Kerangka Rencana ATP Baru (Manual)</span>
        </h3>

        <form
          action={async (formData: FormData) => {
            "use server";
            await createAtpPlanAction(formData);
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs"
        >
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Judul Rencana ATP
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="Contoh: ATP Matematika Fase B SDN Sedaeng II Tosari"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Mata Pelajaran
            </label>
            <select
              name="subjectId"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Fase Kurikulum
            </label>
            <select
              name="phase"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            >
              <option value="Fase A">Fase A (Kelas 1 &amp; 2)</option>
              <option value="Fase B">Fase B (Kelas 3 &amp; 4)</option>
              <option value="Fase C">Fase C (Kelas 5 &amp; 6)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Total Jam Pelajaran (JP) Setahun
            </label>
            <input
              type="number"
              name="totalHours"
              required
              defaultValue={72}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Kerangka Draf</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
