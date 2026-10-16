"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createAssessmentSessionAction } from "@/app/actions/assessment";
import type { AssessmentType, InstrumentType, RubricCriterion } from "@/lib/assessment/types";
import Link from "next/link";

interface CreateAssessmentFormProps {
  classes: any[];
  subjects: any[];
  tps: any[];
  groups: any[];
  activeTerm: any;
}

export function CreateAssessmentForm({
  classes,
  subjects,
  tps,
  groups,
  activeTerm,
}: CreateAssessmentFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("Asesmen Formatif: Observasi Pemahaman Konseptual");
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("formatif");
  const [classId, setClassId] = useState<number>(classes[0]?.id || 1);
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id || "matematika");
  const [tpId, setTpId] = useState<string>("");
  const [instrumentType, setInstrumentType] = useState<InstrumentType>("rubrik_observasi");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cari kelas & kelompok terkait
  const currentClass = classes.find((c) => c.id === Number(classId));
  const currentGroup = groups.find((g) => g.id === currentClass?.groupId);

  // Filter TP yang cocok dengan mapel dan kelas/fase
  const matchingTps = tps.filter(
    (t) => t.subjectId === subjectId && (t.targetGrade === Number(classId) || t.phase === currentClass?.phase)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const selectedTp = tps.find((t) => t.id === tpId) || matchingTps[0];

    const defaultRubric: RubricCriterion[] = [
      {
        criteria: "Penguasaan konsep esensial dan ketepatan pemecahan masalah",
        perluBimbingan: "Belum mampu menerapkan konsep tanpa bimbingan penuh",
        cukup: "Mampu menerapkan sebagian konsep dengan arahan guru",
        baik: "Mampu menyelesaikan tantangan dengan tepat dan mandiri",
        sangatBaik: "Sangat terampil, akurat, dan mampu bernalar kritis mendalam",
        maxScore: 100,
      },
    ];

    setIsSubmitting(true);
    try {
      const res = await createAssessmentSessionAction({
        title,
        assessmentType,
        classId: Number(classId),
        groupId: currentGroup?.id,
        phase: currentClass?.phase,
        subjectId,
        tpId: selectedTp?.id || null,
        tpCode: selectedTp?.code || null,
        academicYear: activeTerm?.year || "2024/2025",
        semester: activeTerm?.semester || "Ganjil",
        instrumentType,
        rubricSchema: defaultRubric,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || "Gagal membuat sesi asesmen.");
      }

      // Langsung arahkan ke lembar input penilaian untuk sesi tersebut
      router.push(`/dashboard/asesmen/${res.data.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm space-y-6">
      <div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
          Penilaian Baru
        </span>
        <h2 className="text-xl font-black text-stone-900 mt-1">Buat Sesi Asesmen Peserta Didik</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Siapkan lembar penilaian observasi formatif, diagnostik, atau sumatif untuk kelas rangkap Anda.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Judul Asesmen */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-700 uppercase">Judul Sesi Asesmen:</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tipe Asesmen & Instrumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase">Tipe Asesmen:</label>
            <select
              value={assessmentType}
              onChange={(e) => setAssessmentType(e.target.value as AssessmentType)}
              className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="diagnostik">Asesmen Diagnostik (Pemetaan Awal)</option>
              <option value="formatif">Asesmen Formatif (Observasi Rotasi Pembelajaran)</option>
              <option value="sumatif">Asesmen Sumatif (Lingkup Materi / Akhir)</option>
              <option value="observasi">Observasi Sikap & Profil Pelajar Pancasila</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase">Bentuk Instrumen:</label>
            <select
              value={instrumentType}
              onChange={(e) => setInstrumentType(e.target.value as InstrumentType)}
              className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="rubrik_observasi">Rubrik Observasi Unjuk Kerja</option>
              <option value="lkpd">Lembar Kerja Peserta Didik (LKPD)</option>
              <option value="tes_lisan">Tanya Jawab / Tes Lisan</option>
              <option value="tes_tertulis">Kuis / Tes Tertulis</option>
              <option value="portofolio">Portofolio Karya Siswa</option>
            </select>
          </div>
        </div>

        {/* Kelas & Mata Pelajaran */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase">Kelas Target:</label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(Number(e.target.value));
                setTpId("");
              }}
              className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phase})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase">Mata Pelajaran:</label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTpId("");
              }}
              className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TP yang Diukur */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-700 uppercase">
            Tujuan Pembelajaran (TP) yang Diukur:
          </label>
          {matchingTps.length === 0 ? (
            <p className="text-xs text-stone-500 italic p-2 bg-stone-50 rounded-lg">
              Belum ada TP terdaftar untuk kelas dan mapel ini. Asesmen tetap dapat dibuat dengan rujukan umum.
            </p>
          ) : (
            <select
              value={tpId || matchingTps[0]?.id}
              onChange={(e) => setTpId(e.target.value)}
              className="w-full border rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
            >
              {matchingTps.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.code}] {t.competency} &bull; {t.description.slice(0, 80)}...
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tombol Aksi */}
        <div className="flex justify-between items-center pt-4 border-t border-stone-200">
          <Link
            href="/dashboard/asesmen"
            className="text-xs font-semibold text-stone-600 hover:text-stone-900"
          >
            &larr; Batal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            {isSubmitting ? "Menyiapkan Sesi..." : "Lanjutkan ke Input Penilaian &rarr;"}
          </button>
        </div>
      </form>
    </div>
  );
}
