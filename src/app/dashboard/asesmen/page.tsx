import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getSchoolAssessmentCriteriaAction } from "@/app/actions/assessment";

export default async function AsesmenHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; type?: string; classId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const activeTab = params.tab || "sessions";
  const selectedType = params.type || "all";
  const selectedClass = params.classId ? parseInt(params.classId, 10) : undefined;

  // Ambil data
  const [assessments, allStudents, groups, subjects, criteriaRes] = await Promise.all([
    db
      .select({
        id: schema.assessments.id,
        title: schema.assessments.title,
        assessmentType: schema.assessments.assessmentType,
        classId: schema.assessments.classId,
        subjectId: schema.assessments.subjectId,
        subjectName: schema.subjects.name,
        phase: schema.assessments.phase,
        tpId: schema.assessments.tpId,
        tpCode: schema.assessments.tpCode,
        instrumentType: schema.assessments.instrumentType,
        academicYear: schema.assessments.academicYear,
        semester: schema.assessments.semester,
        createdAt: schema.assessments.createdAt,
      })
      .from(schema.assessments)
      .leftJoin(schema.subjects, eq(schema.assessments.subjectId, schema.subjects.id))
      .orderBy(desc(schema.assessments.createdAt)),

    db.query.students.findMany({
      orderBy: (students, { asc }) => [asc(students.classId), asc(students.studentCode)],
    }),
    db.query.multigradeGroups.findMany(),
    db.query.subjects.findMany(),
    getSchoolAssessmentCriteriaAction(),
  ]);

  const criteria = criteriaRes.data;

  // Filter sesi asesmen
  const filteredSessions = assessments.filter((a) => {
    if (selectedType !== "all" && a.assessmentType !== selectedType) return false;
    if (selectedClass && a.classId !== selectedClass) return false;
    return true;
  });

  const diagnostikCount = assessments.filter((a) => a.assessmentType === "diagnostik").length;
  const formatifCount = assessments.filter((a) => a.assessmentType === "formatif").length;
  const sumatifCount = assessments.filter((a) => a.assessmentType === "sumatif").length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-stone-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 uppercase tracking-wider">
              Asesmen &amp; Kemajuan Siswa
            </span>
            <span className="text-xs text-blue-200">SDN SEDAENG II Tosari (27 Siswa)</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Pusat Asesmen &amp; Portofolio Belajar
          </h1>
          <p className="text-sm text-blue-100 mt-1 max-w-2xl">
            Pencatatan observasi diagnostik, formatif rotasi kelas rangkap, dan sumatif dengan bukti
            belajar konkret, rubrik 4 tingkat, serta rekomendasi remedial &amp; pengayaan.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/asesmen/baru"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-900 rounded-xl text-xs font-black transition shadow-sm flex items-center gap-1.5"
          >
            <span>➕</span> Buat Sesi Asesmen
          </Link>
        </div>
      </div>

      {/* 4 Kartu Statistik Ringkas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-bold uppercase">Total Sesi</span>
          <p className="text-2xl font-black text-stone-900">{assessments.length}</p>
          <span className="text-[11px] text-stone-400">Seluruh Penilaian</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs text-purple-600 font-bold uppercase">Diagnostik</span>
          <p className="text-2xl font-black text-purple-700">{diagnostikCount}</p>
          <span className="text-[11px] text-stone-400">Pemetaan Awal</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs text-blue-600 font-bold uppercase">Formatif</span>
          <p className="text-2xl font-black text-blue-700">{formatifCount}</p>
          <span className="text-[11px] text-stone-400">Observasi Rotasi</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs text-amber-600 font-bold uppercase">Sumatif</span>
          <p className="text-2xl font-black text-amber-700">{sumatifCount}</p>
          <span className="text-[11px] text-stone-400">Lingkup Materi</span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-stone-200 gap-2 overflow-x-auto text-xs font-bold">
        {[
          { id: "sessions", label: "📋 Sesi Penilaian" },
          { id: "students", label: "🎒 Perkembangan 27 Siswa" },
          { id: "groups", label: "👥 Rekap Kelompok Multigrade" },
          { id: "criteria", label: "⚙️ Kriteria Ketercapaian (KKTP)" },
        ].map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/asesmen?tab=${tab.id}&type=${selectedType}`}
            className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-800"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* TAB 1: Sesi Asesmen */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex flex-wrap gap-2 items-center text-xs font-semibold">
            <span className="text-stone-500 mr-2">Tipe Asesmen:</span>
            {[
              { id: "all", label: "Semua Tipe" },
              { id: "diagnostik", label: "Diagnostik" },
              { id: "formatif", label: "Formatif" },
              { id: "sumatif", label: "Sumatif" },
            ].map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/asesmen?tab=sessions&type=${t.id}`}
                className={`px-3 py-1.5 rounded-xl transition ${
                  selectedType === t.id
                    ? "bg-blue-600 text-white font-bold"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {filteredSessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
              <span className="text-4xl">📝</span>
              <h3 className="text-base font-bold text-stone-800">Belum Ada Sesi Asesmen</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Buat sesi asesmen baru untuk mencatat observasi dan bukti belajar siswa pada kegiatan
                pembelajaran hari ini.
              </p>
              <Link
                href="/dashboard/asesmen/baru"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Buat Sesi Asesmen Pertama
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 uppercase">
                        {session.assessmentType}
                      </span>
                      <span className="text-[11px] font-semibold text-stone-500">
                        Kelas {session.classId}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-stone-900 tracking-tight leading-snug">
                      {session.title}
                    </h3>

                    <p className="text-xs text-stone-600 mt-1">
                      Mata Pelajaran: <strong>{session.subjectName || session.subjectId}</strong>
                    </p>

                    {session.tpCode && (
                      <div className="mt-2 p-2 bg-stone-50 rounded-lg border border-stone-100 text-[11px] font-mono text-emerald-800">
                        🎯 TP: [{session.tpCode}]
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                    <span className="text-stone-400 capitalize">
                      {session.instrumentType.replace("_", " ")}
                    </span>
                    <Link
                      href={`/dashboard/asesmen/${session.id}`}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow-xs flex items-center gap-1"
                    >
                      <span>Input &amp; Observasi</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Rekap 27 Siswa */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Daftar 27 Siswa SDN SEDAENG II Tosari
                </h3>
                <p className="text-xs text-stone-500">
                  Klik siswa untuk membuka profil kemajuan belajar, portofolio bukti, dan rencana tindak lanjut individual.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {allStudents.map((st) => (
                <Link
                  key={st.id}
                  href={`/dashboard/asesmen/siswa/${st.id}`}
                  className="p-4 rounded-xl border border-stone-200 hover:border-blue-400 hover:shadow-sm bg-stone-50/50 hover:bg-white transition block space-y-1"
                >
                  <div className="flex justify-between items-start">
                    <strong className="text-sm text-stone-900 block">{st.fullName}</strong>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-700">
                      Kelas {st.classId}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-500 font-mono">
                    <span>{st.studentCode}</span>
                    <span className="uppercase text-blue-700 font-semibold">{st.groupId}</span>
                  </div>
                  <div className="pt-2 text-[11px] font-bold text-blue-600 flex items-center gap-1">
                    <span>Buka Laporan Portofolio</span>
                    <span>&rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Rekap Kelompok Multigrade */}
      {activeTab === "groups" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {groups.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 uppercase">
                  {g.phase}
                </span>
                <h3 className="text-xl font-black text-stone-900">{g.name}</h3>
                <p className="text-xs text-stone-600">
                  Tingkatan: <strong>Kelas {g.grades}</strong> &bull; Pembelajaran Rangkap
                </p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  {g.description || "Kelompok belajar gabungan dengan pola rotasi bimbingan langsung dan mandiri."}
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <Link
                  href={`/dashboard/asesmen/kelompok/${g.id}`}
                  className="w-full text-center block px-4 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Lihat Rekap Analisis {g.name} &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Kriteria Ketercapaian Sekolah (KKTP) */}
      {activeTab === "criteria" && criteria && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 uppercase">
              Standar Sekolah
            </span>
            <h3 className="text-xl font-black text-stone-900 mt-1">
              Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) SDN SEDAENG II Tosari
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Tahun Ajaran {criteria.academicYear} &bull; Semester {criteria.semester} &bull; Nilai Batas Tuntas Acuan: {criteria.passingScoreDefault}
            </p>
          </div>

          {/* Penegasan Mutlak */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
            <strong className="block font-bold">⚖️ Prinsip Asesmen Holistik Kurikulum Merdeka:</strong>
            <p className="leading-relaxed">{criteria.nonNumericalRuleStatement}</p>
          </div>

          {/* Definisi 4 Level */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide">
              Definisi 4 Level Ketercapaian Belajar:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {(criteria.levelsDefinition as any[]).map((lvl, i) => (
                <div key={i} className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-1">
                  <div className="flex justify-between items-center">
                    <strong className="text-stone-900">{lvl.label}</strong>
                    <span className="font-mono text-stone-500">Rentang: {lvl.scoreMin}-{lvl.scoreMax}</span>
                  </div>
                  <p className="text-stone-600 text-[11px] leading-relaxed">{lvl.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Kebijakan Remedial & Pengayaan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
              <strong className="text-rose-900 block font-bold">Kebijakan Remedial Sekolah:</strong>
              <p className="text-stone-700 leading-relaxed">{criteria.remedialPolicy}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
              <strong className="text-emerald-900 block font-bold">Kebijakan Pengayaan Sekolah:</strong>
              <p className="text-stone-700 leading-relaxed">{criteria.enrichmentPolicy}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
