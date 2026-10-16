import React from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function LkpdIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; grade?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const selectedGroup = params.group || "all";
  const selectedGrade = params.grade ? parseInt(params.grade, 10) : undefined;
  const selectedStatus = params.status || "all";

  // Ambil seluruh data LKPD
  const lkpds = await db
    .select({
      id: schema.lkpdWorksheets.id,
      title: schema.lkpdWorksheets.title,
      grade: schema.lkpdWorksheets.grade,
      groupId: schema.lkpdWorksheets.groupId,
      subjectId: schema.lkpdWorksheets.subjectId,
      subjectName: schema.subjects.name,
      phase: schema.lkpdWorksheets.phase,
      themeOrTopic: schema.lkpdWorksheets.themeOrTopic,
      targetTpCode: schema.lkpdWorksheets.targetTpCode,
      targetTpDescription: schema.lkpdWorksheets.targetTpDescription,
      status: schema.lkpdWorksheets.status,
      version: schema.lkpdWorksheets.version,
      timeAllocationMinutes: schema.lkpdWorksheets.timeAllocationMinutes,
      createdAt: schema.lkpdWorksheets.createdAt,
      authorName: schema.users.name,
    })
    .from(schema.lkpdWorksheets)
    .leftJoin(schema.subjects, eq(schema.lkpdWorksheets.subjectId, schema.subjects.id))
    .leftJoin(schema.users, eq(schema.lkpdWorksheets.authorId, schema.users.id))
    .orderBy(desc(schema.lkpdWorksheets.createdAt));

  const filtered = lkpds.filter((item) => {
    if (selectedGroup !== "all" && item.groupId !== selectedGroup) return false;
    if (selectedGrade && item.grade !== selectedGrade) return false;
    if (selectedStatus !== "all" && item.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-stone-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 uppercase tracking-wider">
              Modul Pembelajaran
            </span>
            <span className="text-xs text-emerald-200">SDN SEDAENG II Tosari</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Lembar Kerja Peserta Didik (LKPD) Multigrade
          </h1>
          <p className="text-sm text-emerald-100 mt-1 max-w-xl">
            Tersusun berdiferensiasi untuk kelas rangkap (Kelompok A, B, C) dengan stimulus kontekstual
            kebun Tosari, rubrik formatif 4 tingkat, dan opsi cetak hemat tinta.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/kurikulum/lkpd/baru"
            className="px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black transition shadow-sm flex items-center gap-1.5"
          >
            <span>✨</span> Buat LKPD Berdiferensiasi
          </Link>
          <Link
            href="/dashboard/kurikulum/media-pembelajaran"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <span>📚</span> Perpustakaan Media
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex flex-wrap gap-2 items-center text-xs font-semibold">
        <span className="text-stone-500 mr-2">Filter Kelompok:</span>
        {[
          { id: "all", label: "Semua Kelompok" },
          { id: "group-a", label: "Kelompok A (Kls 1-2)" },
          { id: "group-b", label: "Kelompok B (Kls 3-4)" },
          { id: "group-c", label: "Kelompok C (Kls 5-6)" },
        ].map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/kurikulum/lkpd?group=${tab.id}&status=${selectedStatus}`}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedGroup === tab.id
                ? "bg-emerald-600 text-white font-bold"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}

        <div className="h-4 w-px bg-stone-300 mx-2 hidden sm:block"></div>

        <span className="text-stone-500 mr-2">Status:</span>
        {[
          { id: "all", label: "Semua Status" },
          { id: "draft", label: "Draf" },
          { id: "approved", label: "Disetujui" },
          { id: "published", label: "Diterbitkan" },
        ].map((st) => (
          <Link
            key={st.id}
            href={`/dashboard/kurikulum/lkpd?group=${selectedGroup}&status=${st.id}`}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedStatus === st.id
                ? "bg-stone-800 text-white font-bold"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {st.label}
          </Link>
        ))}
      </div>

      {/* Daftar Kartu LKPD */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
          <span className="text-4xl">📝</span>
          <h3 className="text-base font-bold text-stone-800">Belum Ada LKPD Tersimpan</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Mulai buat sepasang LKPD berdiferensiasi untuk kelas rangkap Anda menggunakan generator
            cerdas.
          </p>
          <Link
            href="/dashboard/kurikulum/lkpd/baru"
            className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Buat LKPD Pertama
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((lkpd) => (
            <div
              key={lkpd.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                      Kelas {lkpd.grade} &bull; {lkpd.phase}
                    </span>
                    <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-800">
                      {lkpd.groupId}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                      lkpd.status === "published"
                        ? "bg-emerald-600 text-white"
                        : lkpd.status === "approved"
                        ? "bg-blue-600 text-white"
                        : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {lkpd.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-stone-900 tracking-tight leading-snug">
                  {lkpd.title}
                </h3>

                <p className="text-xs text-stone-600 mt-1 line-clamp-1">
                  Mata Pelajaran: <strong>{lkpd.subjectName}</strong>
                </p>

                <div className="mt-3 p-2.5 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-700 space-y-1">
                  <span className="font-semibold text-emerald-900 block truncate">
                    🎯 [{lkpd.targetTpCode}] {lkpd.targetTpDescription}
                  </span>
                  <div className="flex justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-200">
                    <span>Durasi: {lkpd.timeAllocationMinutes} Menit</span>
                    <span>Versi {lkpd.version}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                <span className="text-[11px] text-stone-400">
                  Oleh: {lkpd.authorName || "Guru Sedaeng"}
                </span>
                <Link
                  href={`/dashboard/kurikulum/lkpd/${lkpd.id}`}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition shadow-xs flex items-center gap-1"
                >
                  <span>Buka & Cetak</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
