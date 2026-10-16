"use client";

import React, { useState } from "react";
import type { StudentProgressProfile } from "@/lib/assessment/types";
import { markFollowUpCompletedAction } from "@/app/actions/assessment";
import Link from "next/link";

interface StudentProfileViewProps {
  profile: StudentProgressProfile;
  school: any;
}

export function StudentProfileView({ profile, school }: StudentProfileViewProps) {
  const [activeFilterSubject, setActiveFilterSubject] = useState<string>("all");
  const [profileData, setProfileData] = useState<StudentProgressProfile>(profile);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const subjects = Array.from(
    new Set(profileData.tpProgressItems.map((item) => item.subjectName))
  );

  const filteredItems = profileData.tpProgressItems.filter((item) => {
    if (activeFilterSubject !== "all" && item.subjectName !== activeFilterSubject) return false;
    return true;
  });

  const handleToggleFollowUp = async (resultId: string, currentStatus: boolean) => {
    setUpdatingId(resultId);
    try {
      const res = await markFollowUpCompletedAction(resultId, !currentStatus);
      if (res.success) {
        setProfileData((prev) => ({
          ...prev,
          tpProgressItems: prev.tpProgressItems.map((item) =>
            item.tpId === resultId ? { ...item, followUpCompleted: !currentStatus } : item
          ),
        }));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tombol Aksi & Navigasi */}
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
          <span>🖨️</span> Cetak Laporan Portofolio Siswa
        </button>
      </div>

      {/* Lembar Laporan Siswa Resmi */}
      <div
        id="student-report-print"
        className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0"
      >
        {/* KOP RESMI SEKOLAH */}
        <div className="border-b-4 border-double border-stone-900 pb-3 text-center">
          <h4 className="text-xs font-bold tracking-wider text-stone-700 uppercase">
            Pemerintah Kabupaten Pasuruan &bull; Dinas Pendidikan dan Kebudayaan
          </h4>
          <h2 className="text-xl font-black text-stone-900 tracking-tight uppercase mt-0.5">
            {school?.name || "SDN SEDAENG II TOSARI"}
          </h2>
          <p className="text-xs text-stone-600">
            {school?.address || "Dusun Sedaeng, Desa Sedaeng, Kec. Tosari, Kab. Pasuruan, Jawa Timur 67177"}
          </p>
          <p className="text-[11px] text-stone-500">
            NPSN: {school?.npsn || "20519070"} &bull; Laporan Portofolio & Kemajuan Belajar Siswa
          </p>
        </div>

        {/* Identitas Siswa */}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-stone-500 block">Nama Lengkap Siswa:</span>
            <strong className="text-stone-900 text-sm">{profile.student.fullName}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Nomor Induk / Kode:</span>
            <strong className="text-stone-900 font-mono text-sm">{profile.student.studentCode}</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Kelas / Kelompok:</span>
            <strong className="text-stone-900 text-sm">
              Kelas {profile.student.classId} ({profile.student.groupId.toUpperCase()})
            </strong>
          </div>
          <div>
            <span className="text-stone-500 block">Tahun Ajaran & Semester:</span>
            <strong className="text-stone-900 text-sm">
              {profile.academicYear} &bull; {profile.semester}
            </strong>
          </div>
        </div>

        {/* PENEGASAN PEDAGOGIS MUTLAK (Invarian Kurikulum Merdeka) */}
        <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
          <span className="text-lg">⚖️</span>
          <div>
            <strong className="block font-bold">Klausul Penjaminan Mutu & Asesmen Holistik:</strong>
            <p className="mt-0.5 leading-relaxed">{profile.pedagogicalDisclaimer}</p>
          </div>
        </div>

        {/* Ringkasan 4 Level Ketercapaian */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
            <span className="text-2xl font-black text-rose-700">
              {profile.masterySummary.perluBimbinganCount}
            </span>
            <span className="text-xs font-bold text-rose-900 block">Perlu Bimbingan</span>
            <span className="text-[10px] text-rose-600 block">Mulai Berkembang</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
            <span className="text-2xl font-black text-amber-700">
              {profile.masterySummary.cukupCount}
            </span>
            <span className="text-xs font-bold text-amber-900 block">Cukup</span>
            <span className="text-[10px] text-amber-600 block">Sedang Berkembang</span>
          </div>

          <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-1">
            <span className="text-2xl font-black text-sky-700">
              {profile.masterySummary.baikCount}
            </span>
            <span className="text-xs font-bold text-sky-900 block">Baik</span>
            <span className="text-[10px] text-sky-600 block">Berkembang Sesuai Harapan</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
            <span className="text-2xl font-black text-emerald-700">
              {profile.masterySummary.sangatBaikCount}
            </span>
            <span className="text-xs font-bold text-emerald-900 block">Sangat Baik</span>
            <span className="text-[10px] text-emerald-600 block">Sangat Berkembang</span>
          </div>
        </div>

        {/* Filter Mapel */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-stone-200 print:hidden text-xs">
          <span className="text-stone-500 font-semibold">Filter Mata Pelajaran:</span>
          <button
            type="button"
            onClick={() => setActiveFilterSubject("all")}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              activeFilterSubject === "all"
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Semua Mapel ({profileData.tpProgressItems.length})
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveFilterSubject(s)}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                activeFilterSubject === s
                  ? "bg-emerald-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Matriks Ketercapaian per TP */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
            Rekap Portofolio &amp; Ketercapaian per Tujuan Pembelajaran (TP)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700">
                  <th className="p-3 font-bold">Mata Pelajaran &bull; Kode TP</th>
                  <th className="p-3 font-bold">Kompetensi yang Diukur</th>
                  <th className="p-3 font-bold text-center">Tingkat Capaian</th>
                  <th className="p-3 font-bold">Catatan Bukti Konkret Belajar</th>
                  <th className="p-3 font-bold">Rencana Tindak Lanjut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredItems.map((item, idx) => {
                  let badge = "bg-stone-100 text-stone-700";
                  if (item.latestMasteryLevel === "perlu_bimbingan") badge = "bg-rose-100 text-rose-800 font-black";
                  else if (item.latestMasteryLevel === "cukup") badge = "bg-amber-100 text-amber-800 font-bold";
                  else if (item.latestMasteryLevel === "baik") badge = "bg-sky-100 text-sky-800 font-bold";
                  else if (item.latestMasteryLevel === "sangat_baik") badge = "bg-emerald-100 text-emerald-800 font-black";

                  return (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="p-3 align-top">
                        <strong className="block text-stone-900">{item.subjectName}</strong>
                        <span className="text-[11px] text-stone-500 font-mono">[{item.tpCode}]</span>
                      </td>
                      <td className="p-3 align-top font-medium text-stone-800 max-w-xs">
                        {item.competency}
                      </td>
                      <td className="p-3 align-top text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase inline-block ${badge}`}>
                          {item.latestMasteryLevel.replace("_", " ")}
                        </span>
                        {item.latestScore != null && (
                          <span className="block text-[11px] text-stone-500 mt-1">
                            Skor: {item.latestScore}
                          </span>
                        )}
                      </td>
                      <td className="p-3 align-top text-stone-700 leading-relaxed max-w-sm">
                        {item.latestEvidence}
                        <span className="block text-[10px] text-stone-400 mt-1 italic">
                          Tanggal Asesmen: {item.latestAssessmentDate}
                        </span>
                      </td>
                      <td className="p-3 align-top text-stone-700 max-w-xs space-y-1">
                        <span className="font-semibold block text-stone-800">
                          {item.followUpType.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span className="text-[11px] block text-stone-600">
                          {item.followUpCompleted ? "✅ Tindak lanjut tuntas" : "⏳ Dalam pemantauan"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Antrean Remedial & Pengayaan Terbuka */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Antrean Remedial */}
          <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2">
            <h4 className="text-xs font-bold text-rose-900 uppercase flex items-center gap-1.5">
              <span>🚨</span> Rencana Remedial / Penguatan Aktif:
            </h4>
            {profile.remedialQueue.length === 0 ? (
              <p className="text-xs text-rose-700 italic">
                Tidak ada materi yang memerlukan intervensi remedial saat ini. Seluruh TP telah tuntas.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {profile.remedialQueue.map((rem, i) => (
                  <li key={i} className="p-2.5 bg-white rounded-lg border border-rose-200">
                    <strong className="text-rose-900 block">
                      [{rem.tpCode}] {rem.subjectName}
                    </strong>
                    <p className="text-stone-700 mt-0.5">{rem.evidence}</p>
                    <p className="text-rose-700 font-semibold mt-1">
                      💡 Strategi: {rem.recommendedStrategy}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Peluang Pengayaan */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
            <h4 className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
              <span>🌟</span> Peluang Pengayaan &amp; Peran Tutor Sebaya:
            </h4>
            {profile.enrichmentOpportunities.length === 0 ? (
              <p className="text-xs text-emerald-700 italic">
                Siswa berkembang sesuai harapan pada materi reguler.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {profile.enrichmentOpportunities.map((enr, i) => (
                  <li key={i} className="p-2.5 bg-white rounded-lg border border-emerald-200">
                    <strong className="text-emerald-900 block">
                      [{enr.tpCode}] {enr.subjectName}
                    </strong>
                    <p className="text-stone-700 mt-0.5">{enr.evidence}</p>
                    <p className="text-emerald-800 font-semibold mt-1">
                      🚀 Tantangan: {enr.challengeSuggestion}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Tanda Tangan Cetak */}
        <div className="pt-8 grid grid-cols-2 text-center text-xs">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala SDN SEDAENG II Tosari</p>
            <div className="h-16"></div>
            <p className="font-bold underline">
              {school?.headmasterName || "Kepala Sekolah SDN Sedaeng II"}
            </p>
            <p className="text-[11px] text-stone-500">
              NIP. {school?.headmasterNip || "197508122000031002"}
            </p>
          </div>
          <div>
            <p>Tosari, {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
            <p className="font-bold">Guru Pengampu Kelas {profile.student.classId}</p>
            <div className="h-16"></div>
            <p className="font-bold underline">Guru Kelas SDN Sedaeng II</p>
            <p className="text-[11px] text-stone-500">NIP. ....................................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
