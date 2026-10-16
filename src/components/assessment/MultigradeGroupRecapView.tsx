"use client";

import React from "react";
import type { MultigradeGroupRecap } from "@/lib/assessment/types";
import Link from "next/link";

interface MultigradeGroupRecapViewProps {
  recap: MultigradeGroupRecap;
  school: any;
}

export function MultigradeGroupRecapView({ recap, school }: MultigradeGroupRecapViewProps) {
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
          <span>🖨️</span> Cetak Rekap Kelompok Multigrade
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
            Laporan Rekap Kemajuan Belajar &amp; Kesiapan Pembelajaran Kelas Rangkap
          </p>
        </div>

        {/* Informasi Kelompok */}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-stone-500 block">Kelompok Belajar:</span>
            <strong className="text-stone-900 text-sm">{recap.groupName}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Tingkatan Kelas:</span>
            <strong className="text-stone-900 text-sm">
              Kelas {recap.grades.join(" & ")} ({recap.phase})
            </strong>
          </div>
          <div>
            <span className="text-stone-500 block">Total Siswa Terdaftar:</span>
            <strong className="text-stone-900 text-sm">{recap.totalStudents} Siswa</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Remedial Aktif:</span>
            <strong className="text-rose-700 text-sm">
              {recap.activeRemedialStudents.length} Butir Intervensi
            </strong>
          </div>
        </div>

        {/* Matriks Capaian per Mata Pelajaran */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
            Cakupan Asesmen &amp; Rata-rata Ketuntasan Mata Pelajaran
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recap.subjectStats.map((sub) => (
              <div
                key={sub.subjectId}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <strong className="text-sm text-stone-900 block">{sub.subjectName}</strong>
                  <div className="flex justify-between text-xs text-stone-500 mt-1">
                    <span>{sub.assessedTpCount} TP Terukur</span>
                    <span>{sub.totalAssessments} Penilaian</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-stone-700">Ketuntasan:</span>
                    <span className="text-emerald-700">{sub.masteryPercentage}%</span>
                  </div>
                  <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${sub.masteryPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Baris Antrean Remedial & Pengayaan Multigrade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Antrean Remedial untuk Rotasi Kelas Rangkap */}
          <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2">
            <h4 className="text-xs font-bold text-rose-900 uppercase flex items-center justify-between">
              <span>🚨 Siswa Memerlukan Remedial ({recap.activeRemedialStudents.length})</span>
              <span className="text-[10px] font-normal text-rose-700">Untuk Rencana Rotasi Guru</span>
            </h4>

            {recap.activeRemedialStudents.length === 0 ? (
              <p className="text-xs text-rose-700 italic">
                Seluruh siswa dalam kelompok {recap.groupName} telah tuntas pada materi yang diajarkan.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {recap.activeRemedialStudents.map((rem, i) => (
                  <li key={i} className="p-2.5 bg-white rounded-lg border border-rose-200">
                    <div className="flex justify-between items-start">
                      <strong className="text-rose-900">
                        {rem.displayName} (Kelas {rem.classId})
                      </strong>
                      <span className="text-[10px] font-mono text-stone-500">[{rem.tpCode}]</span>
                    </div>
                    <span className="text-[11px] text-stone-600 block">{rem.subjectName}</span>
                    <p className="text-stone-700 mt-0.5">{rem.evidence}</p>
                    <p className="text-rose-700 font-semibold mt-1">
                      💡 Tindak Lanjut: {rem.actionPlan}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Antrean Pengayaan & Potensi Tutor Sebaya */}
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
            <h4 className="text-xs font-bold text-emerald-900 uppercase flex items-center justify-between">
              <span>🌟 Siswa Siap Pengayaan / Tutor Sebaya ({recap.activeEnrichmentStudents.length})</span>
              <span className="text-[10px] font-normal text-emerald-700">Potensi Duta Belajar</span>
            </h4>

            {recap.activeEnrichmentStudents.length === 0 ? (
              <p className="text-xs text-emerald-700 italic">
                Siswa berkembang sesuai tahapan reguler.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {recap.activeEnrichmentStudents.map((enr, i) => (
                  <li key={i} className="p-2.5 bg-white rounded-lg border border-emerald-200">
                    <div className="flex justify-between items-start">
                      <strong className="text-emerald-900">
                        {enr.displayName} (Kelas {enr.classId})
                      </strong>
                      <span className="text-[10px] font-mono text-stone-500">[{enr.tpCode}]</span>
                    </div>
                    <span className="text-[11px] text-stone-600 block">{enr.subjectName}</span>
                    <p className="text-stone-700 mt-0.5">{enr.achievement}</p>
                    <p className="text-emerald-800 font-semibold mt-1">
                      🚀 Arahan: {enr.challengePlan}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
