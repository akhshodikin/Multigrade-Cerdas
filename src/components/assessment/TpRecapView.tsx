"use client";

import React from "react";
import type { TpAssessmentRecap } from "@/lib/assessment/types";
import Link from "next/link";

interface TpRecapViewProps {
  recap: TpAssessmentRecap;
  school: any;
}

export function TpRecapView({ recap, school }: TpRecapViewProps) {
  return (
    <div className="space-y-6">
      {/* Header Bar & Navigasi */}
      <div className="flex justify-between items-center print:hidden">
        <Link
          href="/dashboard/asesmen"
          className="text-xs font-semibold text-stone-600 hover:text-stone-900"
        >
          &larr; Kembali ke Pusat Asesmen
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <span>🖨️</span> Cetak Rekap Ketercapaian TP
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        {/* KOP RESMI */}
        <div className="border-b-4 border-double border-stone-900 pb-3 text-center">
          <h4 className="text-xs font-bold tracking-wider text-stone-700 uppercase">
            Pemerintah Kabupaten Pasuruan &bull; Dinas Pendidikan dan Kebudayaan
          </h4>
          <h2 className="text-xl font-black text-stone-900 tracking-tight uppercase mt-0.5">
            {school?.name || "SDN SEDAENG II TOSARI"}
          </h2>
          <p className="text-xs text-stone-600">
            Laporan Analisis Ketuntasan &amp; Rekap Bukti Belajar per Tujuan Pembelajaran (TP)
          </p>
        </div>

        {/* Informasi TP */}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-stone-500 block">Kode TP:</span>
            <strong className="text-stone-900 font-mono text-sm">{recap.tpCode}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Mata Pelajaran:</span>
            <strong className="text-stone-900 text-sm">{recap.subjectName}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Fase &bull; Target Jenjang:</span>
            <strong className="text-stone-900 text-sm">
              {recap.phase} {recap.targetGrade ? `(Kelas ${recap.targetGrade})` : ""}
            </strong>
          </div>
          <div>
            <span className="text-stone-500 block">Total Siswa Dinilai:</span>
            <strong className="text-stone-900 text-sm">{recap.totalStudentsAssessed} Siswa</strong>
          </div>
        </div>

        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950">
          <strong className="block text-emerald-900 font-bold mb-0.5">Kompetensi yang Diukur:</strong>
          <p>{recap.competency} &mdash; Lingkup Materi: {recap.contentScope}</p>
        </div>

        {/* Persentase Ketuntasan & Rekomendasi Pedagogis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="p-4 bg-stone-900 text-white rounded-xl text-center space-y-1">
            <span className="text-3xl font-black text-emerald-400">{recap.masteryRatePercentage}%</span>
            <span className="text-xs font-bold block">Tingkat Ketuntasan TP</span>
            <span className="text-[11px] text-stone-400 block">
              {recap.levelCounts.cukup + recap.levelCounts.baik + recap.levelCounts.sangatBaik} dari{" "}
              {recap.totalStudentsAssessed} Siswa Tuntas
            </span>
          </div>

          <div className="md:col-span-2 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
            <strong className="block font-bold">💡 Rekomendasi Tindak Lanjut Pedagogis Guru:</strong>
            <p className="leading-relaxed">{recap.pedagogicalRecommendation}</p>
          </div>
        </div>

        {/* Tabel Rincian Siswa */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
            Daftar Bukti Belajar &amp; Ketercapaian Peserta Didik
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700">
                  <th className="p-3 font-bold">Kode &bull; Nama Siswa</th>
                  <th className="p-3 font-bold text-center">Kelas</th>
                  <th className="p-3 font-bold text-center">Tingkat Capaian</th>
                  <th className="p-3 font-bold">Catatan Bukti Belajar Konkret</th>
                  <th className="p-3 font-bold">Rencana Tindak Lanjut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {recap.studentDetails.map((st) => {
                  let badge = "bg-stone-100 text-stone-700";
                  if (st.masteryLevel === "perlu_bimbingan") badge = "bg-rose-100 text-rose-800 font-black";
                  else if (st.masteryLevel === "cukup") badge = "bg-amber-100 text-amber-800 font-bold";
                  else if (st.masteryLevel === "baik") badge = "bg-sky-100 text-sky-800 font-bold";
                  else if (st.masteryLevel === "sangat_baik") badge = "bg-emerald-100 text-emerald-800 font-black";

                  return (
                    <tr key={st.studentId} className="hover:bg-stone-50/50">
                      <td className="p-3">
                        <strong className="block text-stone-900">{st.displayName}</strong>
                        <span className="text-[11px] text-stone-500 font-mono">{st.studentCode}</span>
                      </td>
                      <td className="p-3 text-center font-bold text-stone-800">
                        Kelas {st.classId}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase inline-block ${badge}`}>
                          {st.masteryLevel.replace("_", " ")}
                        </span>
                        {st.score != null && (
                          <span className="block text-[11px] text-stone-500 mt-1 font-mono">
                            Skor: {st.score}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-stone-700 max-w-sm leading-relaxed">
                        {st.learningEvidence}
                        <span className="block text-[10px] text-stone-400 mt-0.5">
                          Dinilai pada: {st.assessedAt}
                        </span>
                      </td>
                      <td className="p-3 text-stone-700 max-w-xs">
                        <span className="font-semibold block text-stone-800">
                          {st.followUpType.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          {st.followUpCompleted ? "✅ Selesai" : "⏳ Menunggu"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
