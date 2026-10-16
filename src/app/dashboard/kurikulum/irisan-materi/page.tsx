import React from "react";
import Link from "next/link";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import {
  Sparkles,
  Plus,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Cpu,
  Compass,
  Filter,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function MaterialIntersectionListPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; subjectId?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const groupIdFilter = resolvedSearchParams?.groupId;
  const subjectIdFilter = resolvedSearchParams?.subjectId;
  const statusFilter = resolvedSearchParams?.status;

  const [groups, subjects] = await Promise.all([
    db.select().from(schema.multigradeGroups).orderBy(schema.multigradeGroups.id),
    db.select().from(schema.subjects).orderBy(schema.subjects.name),
  ]);

  // Query database
  const conditions = [];
  if (groupIdFilter && groupIdFilter !== "all") {
    conditions.push(eq(schema.multigradeMaterialMaps.groupId, groupIdFilter));
  }
  if (subjectIdFilter && subjectIdFilter !== "all") {
    conditions.push(eq(schema.multigradeMaterialMaps.subjectId, subjectIdFilter));
  }
  if (statusFilter && statusFilter !== "all") {
    conditions.push(
      eq(
        schema.multigradeMaterialMaps.status,
        statusFilter as "draft" | "reviewed" | "approved" | "rejected"
      )
    );
  }

  const query = db
    .select({
      id: schema.multigradeMaterialMaps.id,
      groupId: schema.multigradeMaterialMaps.groupId,
      groupName: schema.multigradeGroups.name,
      groupPhase: schema.multigradeGroups.phase,
      groupGrades: schema.multigradeGroups.grades,
      subjectId: schema.multigradeMaterialMaps.subjectId,
      subjectName: schema.subjects.name,
      sharedTheme: schema.multigradeMaterialMaps.sharedTheme,
      mappingStrategy: schema.multigradeMaterialMaps.mappingStrategy,
      aiProvider: schema.multigradeMaterialMaps.aiProvider,
      aiModel: schema.multigradeMaterialMaps.aiModel,
      confidenceLevel: schema.multigradeMaterialMaps.confidenceLevel,
      confidenceScore: schema.multigradeMaterialMaps.confidenceScore,
      status: schema.multigradeMaterialMaps.status,
      version: schema.multigradeMaterialMaps.version,
      academicYear: schema.multigradeMaterialMaps.academicYear,
      semester: schema.multigradeMaterialMaps.semester,
      durationMinutes: schema.multigradeMaterialMaps.durationMinutes,
      creatorName: schema.users.name,
      createdAt: schema.multigradeMaterialMaps.createdAt,
      updatedAt: schema.multigradeMaterialMaps.updatedAt,
    })
    .from(schema.multigradeMaterialMaps)
    .leftJoin(
      schema.multigradeGroups,
      eq(schema.multigradeMaterialMaps.groupId, schema.multigradeGroups.id)
    )
    .leftJoin(schema.subjects, eq(schema.multigradeMaterialMaps.subjectId, schema.subjects.id))
    .leftJoin(schema.users, eq(schema.multigradeMaterialMaps.createdById, schema.users.id))
    .orderBy(desc(schema.multigradeMaterialMaps.createdAt));

  const items = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

  // Statistik ringkas
  const totalCount = items.length;
  const approvedCount = items.filter((i) => i.status === "approved").length;
  const draftCount = items.filter((i) => i.status === "draft").length;
  const parallelCount = items.filter((i) => i.mappingStrategy === "terpisah_paralel").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Pemetaan Irisan Materi Multigrade AI
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Penyusunan irisan kompetensi lintas tingkatan kelas untuk SDN Sedaeng II Tosari.
            Rekomendasi adaptif menentukan irisan materi bersama atau rotasi kegiatan terpisah paralel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/kurikulum/irisan-materi/baru"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Analisis Irisan Baru</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Pemetaan</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Kelompok A, B, &amp; C</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600">Disetujui Kepala Sekolah</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{approvedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Siap digunakan di kelas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-amber-600">Strategi Terpisah Paralel</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{parallelCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Materi tidak dipaksakan lebur</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Draf Menunggu Review</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{draftCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Perlu verifikasi guru</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-2">
          <Filter className="w-4 h-4" />
          <span>Filter:</span>
        </div>

        {/* Group Filter */}
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/kurikulum/irisan-materi?${new URLSearchParams({
              ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
              ...(statusFilter ? { status: statusFilter } : {}),
            }).toString()}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              !groupIdFilter || groupIdFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua Kelompok
          </Link>
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/dashboard/kurikulum/irisan-materi?${new URLSearchParams({
                groupId: g.id,
                ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
                ...(statusFilter ? { status: statusFilter } : {}),
              }).toString()}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                groupIdFilter === g.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {g.name} (Kelas {g.grades})
            </Link>
          ))}
        </div>

        {/* Status Filter */}
        <div className="ml-auto flex items-center gap-1">
          {[
            { id: "all", label: "Semua Status" },
            { id: "draft", label: "Draf" },
            { id: "reviewed", label: "Ditinjau" },
            { id: "approved", label: "Disetujui" },
            { id: "rejected", label: "Ditolak" },
          ].map((st) => (
            <Link
              key={st.id}
              href={`/dashboard/kurikulum/irisan-materi?${new URLSearchParams({
                ...(groupIdFilter ? { groupId: groupIdFilter } : {}),
                ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
                ...(st.id !== "all" ? { status: st.id } : {}),
              }).toString()}`}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                (statusFilter || "all") === st.id
                  ? "bg-slate-800 text-white font-bold"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {st.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Material Intersection List Cards */}
      {items.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Belum Ada Pemetaan Irisan Materi</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Mulai susun irisan kompetensi antar tingkatan kelas (Kelompok A, B, atau C) untuk menghasilkan
              panduan pembelajaran terpadu atau strategi rotasi terpisah.
            </p>
          </div>
          <Link
            href="/dashboard/kurikulum/irisan-materi/baru"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Analisis Irisan Pertama</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const isParallel = item.mappingStrategy === "terpisah_paralel";
            const isPartial = item.mappingStrategy === "terpadu_sebagian";
            const isFull = item.mappingStrategy === "terpadu_penuh";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      {item.groupName} &bull; Kelas {item.groupGrades}
                    </span>

                    {/* Status Badge */}
                    {item.status === "approved" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Disetujui
                      </span>
                    )}
                    {item.status === "reviewed" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        <Clock className="w-3 h-3" />
                        Ditinjau
                      </span>
                    )}
                    {item.status === "draft" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        Draf v{item.version}
                      </span>
                    )}
                    {item.status === "rejected" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        <XCircle className="w-3 h-3" />
                        Revisi
                      </span>
                    )}
                  </div>

                  {/* Subject & Theme */}
                  <div className="mt-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {item.subjectName} &bull; {item.durationMinutes} Menit
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 mt-1 leading-snug line-clamp-2">
                      {item.sharedTheme}
                    </h2>
                  </div>

                  {/* Strategy Badge */}
                  <div className="mt-3">
                    {isParallel && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Terpisah Paralel (Staggered Rotation)</span>
                      </div>
                    )}
                    {isPartial && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Terpadu Sebagian (Diferensiasi Tugas)</span>
                      </div>
                    )}
                    {isFull && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Terpadu Penuh (Fokus Konsep Inti)</span>
                      </div>
                    )}
                  </div>

                  {/* Engine & Confidence */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1 font-medium">
                      <Cpu className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.aiModel}</span>
                    </div>
                    <div className="font-semibold text-slate-700">
                      Keyakinan: {item.confidenceScore}% ({item.confidenceLevel})
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Oleh: {item.creatorName || "Guru Pengampu"}
                  </span>
                  <Link
                    href={`/dashboard/kurikulum/irisan-materi/${item.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    <span>Detail &amp; Alur Belajar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
