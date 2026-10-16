"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { generateLkpdPairAction, generateMediaForLessonPlanAction } from "@/app/actions/lkpd-media";
import Link from "next/link";

interface LkpdGeneratorWizardProps {
  groups: any[];
  subjects: any[];
  tps: any[];
  lessonPlans: any[];
  currentTerm: any;
}

export function LkpdGeneratorWizard({
  groups,
  subjects,
  tps,
  lessonPlans,
  currentTerm,
}: LkpdGeneratorWizardProps) {
  const router = useRouter();

  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || "group-a");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || "matematika");
  const [themeOrTopic, setThemeOrTopic] = useState<string>("Hasil Panen Sayur Lereng Bromo");
  const [timeAllocation, setTimeAllocation] = useState<number>(35);
  const [lowerGradeTpId, setLowerGradeTpId] = useState<string>("");
  const [higherGradeTpId, setHigherGradeTpId] = useState<string>("");
  const [includeMediaSet, setIncludeMediaSet] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cari grup aktif
  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const grades = currentGroup?.grades ? currentGroup.grades.split(",").map((g: string) => parseInt(g.trim(), 10)) : [1, 2];
  const lowerGrade = Math.min(...grades);
  const higherGrade = Math.max(...grades);

  // Filter TP yang sesuai mapel dan fase grup
  const filteredTps = tps.filter(
    (t) => t.subjectId === selectedSubjectId && t.phase === currentGroup?.phase
  );
  const lowerGradeTps = filteredTps.filter((t) => !t.targetGrade || t.targetGrade === lowerGrade);
  const higherGradeTps = filteredTps.filter((t) => !t.targetGrade || t.targetGrade === higherGrade);

  // Jika guru memilih Modul Ajar, sinkronkan otomatis
  const handleSelectLessonPlan = (planId: string) => {
    setSelectedPlanId(planId);
    if (!planId) return;

    const plan = lessonPlans.find((p) => p.id === planId);
    if (plan) {
      setSelectedGroupId(plan.groupId);
      setSelectedSubjectId(plan.subjectId);
      setThemeOrTopic(plan.topic || plan.title);

      // Auto-set TPs dari modul ajar jika ada
      if (plan.learningObjectives && plan.learningObjectives.length >= 2) {
        const lowObj = plan.learningObjectives.find((o: any) => o.grade === lowerGrade);
        const highObj = plan.learningObjectives.find((o: any) => o.grade === higherGrade);
        if (lowObj?.tpId) setLowerGradeTpId(lowObj.tpId);
        if (highObj?.tpId) setHigherGradeTpId(highObj.tpId);
      }
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const actualLowerTp = lowerGradeTpId || lowerGradeTps[0]?.id;
    const actualHigherTp = higherGradeTpId || higherGradeTps[0]?.id || lowerGradeTps[1]?.id;

    if (!actualLowerTp || !actualHigherTp) {
      setErrorMsg("Mohon pilih minimal 1 Tujuan Pembelajaran untuk kelas bawah dan 1 untuk kelas atas.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateLkpdPairAction({
        lessonPlanId: selectedPlanId || undefined,
        groupId: selectedGroupId,
        subjectId: selectedSubjectId,
        themeOrTopic,
        academicYear: currentTerm?.year || "2024/2025",
        semester: currentTerm?.semester || "Ganjil",
        lowerGradeTpId: actualLowerTp,
        higherGradeTpId: actualHigherTp,
        timeAllocationMinutes: Number(timeAllocation),
        preferredColorMode: "color",
        localTosariContext: true,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || "Gagal membuat LKPD.");
      }

      // Jika opsi media tercentang, generate media pendukung secara simultan
      if (includeMediaSet) {
        await generateMediaForLessonPlanAction({
          lessonPlanId: selectedPlanId || undefined,
          groupId: selectedGroupId,
          subjectId: selectedSubjectId,
          themeOrTopic,
        });
      }

      // Arahkan ke halaman detail LKPD kelas bawah yang baru saja dibuat
      router.push(`/dashboard/kurikulum/lkpd/${res.data.lowerGradeLkpd.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses generator.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-stone-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 uppercase tracking-wider">
            Generator Cerdas AI
          </span>
          <span className="text-xs text-emerald-200">SDN SEDAENG II Tosari</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight">
          Generator LKPD & Media Pembelajaran Multigrade
        </h1>
        <p className="text-sm text-emerald-100 mt-1 max-w-2xl">
          Menghasilkan lembar kerja peserta didik berpasangan dengan tugas dan petunjuk yang
          berdiferensiasi nyata untuk kedua tingkatan kelas dalam satu kelompok belajar.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Formulir Wizard */}
      <form onSubmit={handleGenerate} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
        {/* 1. Hubungkan dengan Modul Ajar (Opsional) */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-stone-900 block">
            1. Tautkan dengan Modul Ajar yang Ada (Opsional):
          </label>
          <select
            value={selectedPlanId}
            onChange={(e) => handleSelectLessonPlan(e.target.value)}
            className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 bg-stone-50"
          >
            <option value="">-- Buat Mandiri (Tanpa Modul Ajar) --</option>
            {lessonPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title} (Kelas {plan.grades} &bull; {plan.status})
              </option>
            ))}
          </select>
          <p className="text-xs text-stone-500">
            Jika memilih modul ajar, kelompok, mapel, tema, dan target TP akan terisi otomatis.
          </p>
        </div>

        {/* 2. Pilihan Kelompok & Mapel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase">Kelompok Pembelajaran:</label>
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setLowerGradeTpId("");
                setHigherGradeTpId("");
              }}
              className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} (Kelas {g.grades} &bull; {g.phase})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase">Mata Pelajaran:</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setLowerGradeTpId("");
                setHigherGradeTpId("");
              }}
              className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Tema / Topik & Alokasi Waktu */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase">Tema / Topik Bersama:</label>
            <input
              type="text"
              required
              value={themeOrTopic}
              onChange={(e) => setThemeOrTopic(e.target.value)}
              placeholder="Contoh: Mengamati Hasil Kebun Sayur Tosari"
              className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase">Alokasi Waktu (Menit):</label>
            <select
              value={timeAllocation}
              onChange={(e) => setTimeAllocation(Number(e.target.value))}
              className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value={35}>35 Menit (1 Jam Pelajaran)</option>
              <option value={70}>70 Menit (2 Jam Pelajaran)</option>
              <option value={105}>105 Menit (3 Jam Pelajaran)</option>
            </select>
          </div>
        </div>

        {/* 4. Pemilihan TP Berdampingan (Invarian Pedagogis) */}
        <div className="space-y-3 pt-2">
          <label className="text-sm font-bold text-stone-900 block">
            4. Pilih Tujuan Pembelajaran (TP) Spesifik Tiap Kelas:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TP Kelas Bawah */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
              <span className="text-xs font-black text-emerald-900 uppercase block">
                Target TP Kelas {lowerGrade} (Kelas Bawah):
              </span>
              {lowerGradeTps.length === 0 ? (
                <p className="text-xs text-stone-500 italic">
                  Tidak ada TP terdaftar untuk kelas {lowerGrade} pada mapel ini.
                </p>
              ) : (
                <select
                  value={lowerGradeTpId || lowerGradeTps[0]?.id}
                  onChange={(e) => setLowerGradeTpId(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {lowerGradeTps.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.code}] {t.competency}: {t.description.slice(0, 70)}...
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-emerald-700">
                Fokus pada pengenalan objek visual, penghitungan konkret, dan aktivitas berpasangan.
              </p>
            </div>

            {/* TP Kelas Atas */}
            <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 space-y-2">
              <span className="text-xs font-black text-teal-900 uppercase block">
                Target TP Kelas {higherGrade} (Kelas Atas):
              </span>
              {higherGradeTps.length === 0 ? (
                <p className="text-xs text-stone-500 italic">
                  Tidak ada TP terdaftar untuk kelas {higherGrade} pada mapel ini.
                </p>
              ) : (
                <select
                  value={higherGradeTpId || higherGradeTps[0]?.id}
                  onChange={(e) => setHigherGradeTpId(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {higherGradeTps.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.code}] {t.competency}: {t.description.slice(0, 70)}...
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-teal-700">
                Fokus pada pemahaman bacaan mandiri, pemecahan masalah cerita, dan penalaran tertulis.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Opsi Tambahan Media & Konteks Lokal */}
        <div className="space-y-2 p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-800">
            <input
              type="checkbox"
              checked={includeMediaSet}
              onChange={(e) => setIncludeMediaSet(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span>
              Sekaligus buat 5 media pembelajaran pendukung (Kartu Aktivitas & Gambar, Bacaan Bertingkat,
              Literasi-Numerasi, Presentasi Slide, dan Paket Ilustrasi SVG)
            </span>
          </label>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-200">
          <Link
            href="/dashboard/kurikulum/lkpd"
            className="text-xs font-semibold text-stone-500 hover:text-stone-800"
          >
            &larr; Kembali ke Daftar LKPD
          </Link>
          <button
            type="submit"
            disabled={isGenerating}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition shadow-md flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin inline-block">⏳</span>
                <span>Menyusun LKPD Berdiferensiasi...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Generate Sepasang LKPD Multigrade</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
