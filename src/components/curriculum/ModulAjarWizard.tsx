"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Edit3,
  Save,
  Users,
  Printer,
  ChevronRight,
  Check,
  Info,
  Loader2,
} from "lucide-react";
import {
  previewModulAjarAction,
  saveModulAjarAction,
} from "@/app/actions/modul-ajar";
import type {
  ModulAjarGenerationOptions,
  TeachingStep,
  LearningObjectiveItem,
  Differentiation,
  AssessmentPlan,
  Reflections,
  RemedialAndEnrichment,
} from "@/lib/modul-ajar/types";

interface ModulAjarWizardProps {
  groups: Array<{
    id: string;
    name: string;
    phase: string;
    grades: string;
  }>;
  subjects: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  allTps: Array<{
    id: string;
    code: string;
    competency: string;
    description: string;
    targetGrade: number | null;
    subjectId: string;
    phase: string;
    verificationStatus: string;
    cpElement?: string | null;
  }>;
  approvedMaps?: Array<{
    id: string;
    groupId: string;
    subjectId: string;
    sharedTheme: string;
    mappingStrategy: string;
  }>;
  atpPlans?: Array<{
    id: string;
    title: string;
    groupId?: string | null;
    subjectId: string;
  }>;
}

export function ModulAjarWizard({
  groups,
  subjects,
  allTps,
  approvedMaps = [],
  atpPlans = [],
}: ModulAjarWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Wizard state
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [durationMinutes, setDurationMinutes] = useState(70);
  const [allocatedHours, setAllocatedHours] = useState(2);
  const [academicYear, setAcademicYear] = useState("2024/2025");
  const [semester, setSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [topic, setTopic] = useState("");
  const [teacherNotes, setTeacherNotes] = useState("");
  const [aiProvider, setAiProvider] = useState<"gemini" | "mock_local" | "manual">("mock_local");

  // Selected base references
  const [baseMapId, setBaseMapId] = useState<string>("");
  const [baseAtpId, setBaseAtpId] = useState<string>("");

  // TP Selection state
  const selectedGroup = groups.find((g) => g.id === groupId);
  const grades = selectedGroup ? selectedGroup.grades.split(",").map((g) => parseInt(g.trim(), 10)) : [1, 2];
  const lowerGrade = Math.min(...grades);
  const higherGrade = Math.max(...grades);

  const availableLowerTps = allTps.filter(
    (t) => t.subjectId === subjectId && t.targetGrade === lowerGrade
  );
  const availableHigherTps = allTps.filter(
    (t) => t.subjectId === subjectId && t.targetGrade === higherGrade
  );

  const [selectedLowerTpIds, setSelectedLowerTpIds] = useState<string[]>([]);
  const [selectedHigherTpIds, setSelectedHigherTpIds] = useState<string[]>([]);

  // Preview Result
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Toggle TP Selection
  const toggleLowerTp = (id: string) => {
    setSelectedLowerTpIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleHigherTp = (id: string) => {
    setSelectedHigherTpIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Generate Preview
  const handleGeneratePreview = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (selectedLowerTpIds.length === 0 && selectedHigherTpIds.length === 0) {
      setErrorMessage("Pilih minimal satu Tujuan Pembelajaran (TP) untuk memulai rancangan.");
      return;
    }

    startTransition(async () => {
      const res = await previewModulAjarAction({
        groupId,
        subjectId,
        academicYear,
        semester,
        durationMinutes,
        allocatedHours,
        topic: topic.trim() || undefined,
        teacherNotes: teacherNotes.trim() || undefined,
        lowerGradeTpIds: selectedLowerTpIds,
        higherGradeTpIds: selectedHigherTpIds,
        baseAtpPlanId: baseAtpId || undefined,
        baseMaterialMapId: baseMapId || undefined,
        aiProvider,
      });

      if (res.success) {
        setPreviewData(res.data);
      } else {
        setErrorMessage(res.error || "Gagal membuat pratinjau modul ajar.");
      }
    });
  };

  // Save Modul Ajar
  const handleSaveModul = () => {
    if (!previewData) return;
    setErrorMessage(null);

    startTransition(async () => {
      const res = await saveModulAjarAction({
        title: previewData.title,
        groupId: previewData.groupId,
        subjectId: previewData.subjectId,
        phase: previewData.phase,
        grades: previewData.grades,
        academicYear: previewData.academicYear,
        semester: previewData.semester,
        durationMinutes: previewData.durationMinutes,
        allocatedHours: previewData.allocatedHours,
        topic: previewData.topic,
        essentialMaterial: previewData.essentialMaterial,
        initialCompetency: previewData.initialCompetency,
        learningObjectives: previewData.learningObjectives,
        curriculumReferences: previewData.curriculumReferences,
        mediaAndResources: previewData.mediaAndResources,
        teachingSteps: previewData.teachingSteps,
        differentiation: previewData.differentiation,
        assessments: previewData.assessments,
        reflections: previewData.reflections,
        remedialAndEnrichment: previewData.remedialAndEnrichment,
        teacherNotes: previewData.teacherNotes,
        aiProvider: previewData.aiProvider,
        aiAssisted: true,
      });

      if (res.success) {
        router.push(`/dashboard/kurikulum/modul-ajar/${res.data.lessonPlanId}`);
      } else {
        setErrorMessage(res.error || "Gagal menyimpan modul ajar.");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Alert Error / Success */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 font-bold">&times;</button>
        </div>
      )}

      {/* Form Pemilihan Parameter Modul */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>Parameter Perencanaan Modul Ajar Multigrade</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tentukan kelompok kelas, mata pelajaran, target kompetensi tiap kelas, dan konteks pembelajaran Tosari.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Kelompok Kelas */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Kelompok Multigrade
            </label>
            <select
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setSelectedLowerTpIds([]);
                setSelectedHigherTpIds([]);
              }}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} (Kelas {g.grades} &bull; {g.phase})
                </option>
              ))}
            </select>
          </div>

          {/* Mata Pelajaran */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Mata Pelajaran
            </label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setSelectedLowerTpIds([]);
                setSelectedHigherTpIds([]);
              }}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          {/* Durasi & Alokasi JP */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Alokasi Waktu Pembelajaran
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={allocatedHours}
                onChange={(e) => {
                  const jp = Number(e.target.value);
                  setAllocatedHours(jp);
                  setDurationMinutes(jp * 35);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
              >
                <option value="2">2 JP (70 Menit)</option>
                <option value="3">3 JP (105 Menit)</option>
                <option value="4">4 JP (140 Menit)</option>
                <option value="5">5 JP (175 Menit)</option>
              </select>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as "Ganjil" | "Genap")}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pemilihan TP Kelas Bawah & Kelas Atas Berdampingan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* TP Kelas Bawah */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Target TP Kelas {lowerGrade} ({availableLowerTps.length} Tersedia)
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {selectedLowerTpIds.length} Dipilih
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {availableLowerTps.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada TP terdaftar untuk Kelas {lowerGrade}.</p>
              ) : (
                availableLowerTps.map((tp) => (
                  <label
                    key={tp.id}
                    className={`p-3 rounded-lg border text-xs cursor-pointer block transition ${
                      selectedLowerTpIds.includes(tp.id)
                        ? "bg-emerald-100 border-emerald-400 text-emerald-950 font-medium"
                        : "bg-white border-slate-200 hover:border-emerald-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedLowerTpIds.includes(tp.id)}
                        onChange={() => toggleLowerTp(tp.id)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-purple-700 block text-[10px]">{tp.code}</span>
                        <p className="font-semibold text-slate-900">{tp.competency}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{tp.description}</p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* TP Kelas Atas */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                Target TP Kelas {higherGrade} ({availableHigherTps.length} Tersedia)
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                {selectedHigherTpIds.length} Dipilih
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {availableHigherTps.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada TP terdaftar untuk Kelas {higherGrade}.</p>
              ) : (
                availableHigherTps.map((tp) => (
                  <label
                    key={tp.id}
                    className={`p-3 rounded-lg border text-xs cursor-pointer block transition ${
                      selectedHigherTpIds.includes(tp.id)
                        ? "bg-indigo-100 border-indigo-400 text-indigo-950 font-medium"
                        : "bg-white border-slate-200 hover:border-indigo-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedHigherTpIds.includes(tp.id)}
                        onChange={() => toggleHigherTp(tp.id)}
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-purple-700 block text-[10px]">{tp.code}</span>
                        <p className="font-semibold text-slate-900">{tp.competency}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{tp.description}</p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Kondisi Siswa & Catatan Kontekstual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Tema / Topik Utama (Opsional, atau Diambil Otomatis)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Mengamati Tumbuhan Sayur & Menghitung Hasil Panen Tosari"
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Kondisi Pembelajaran &amp; Karakteristik Siswa (Non-PII)
            </label>
            <input
              type="text"
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder="Contoh: Kelas 1 butuh benda konkret daun/kentang, Kelas 2 sudah mandiri membaca petunjuk singkat"
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800"
            />
          </div>
        </div>

        {/* Pemilihan Provider AI */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-bold text-slate-800 block">Mesin Generator Penalaran:</span>
            <span className="text-[11px] text-slate-500">
              Pilih Google Gemini (Cloud AI Studio) atau Mesin Heuristik Multigrade Tosari (Offline)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as any)}
              className="p-2 border rounded-xl bg-white font-bold text-slate-700 text-xs"
            >
              <option value="mock_local">Mesin Heuristik Lokal Tosari (Offline Mandiri)</option>
              <option value="gemini">Google Gemini 3.8 Flash (AI Studio)</option>
              <option value="manual">Mode Manual Penuh</option>
            </select>

            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>Hasilkan Rancangan Modul</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pratinjau Rancangan Modul Ajar Hasil Generasi */}
      {previewData && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6 sm:p-8">
          {/* Header Preview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-purple-100 text-purple-800">
                  {previewData.phase}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                  {previewData.groupName} (Kelas {previewData.lowerGrade} &amp; {previewData.higherGrade})
                </span>
                <span className="text-xs text-slate-500">&bull; {previewData.durationMinutes} Menit ({previewData.allocatedHours} JP)</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">{previewData.title}</h3>
            </div>

            <button
              type="button"
              onClick={handleSaveModul}
              disabled={isPending}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg transition inline-flex items-center gap-2 shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Modul Ajar (Status Draf)</span>
            </button>
          </div>

          {/* Pedoman Invarian Pedagogis */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Kaidah Pembelajaran Kelas Rangkap:</strong> Guru membimbing satu kelompok secara intensif sementara kelompok lain melakukan aktivitas mandiri terarah sesuai usianya. Tujuan belajar Kelas {previewData.lowerGrade} dan Kelas {previewData.higherGrade} tetap berjenjang dan tidak digabung menjadi satu.
            </p>
          </div>

          {/* Rincian Tujuan Pembelajaran Berjenjang */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Tujuan Pembelajaran Khusus per Jenjang Kelas:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="font-extrabold text-emerald-800 block">Kelas {previewData.lowerGrade} (Kelompok Bawah):</span>
                {previewData.learningObjectives
                  .filter((lo: any) => lo.grade === previewData.lowerGrade)
                  .map((lo: any, idx: number) => (
                    <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="font-mono font-bold text-purple-700 text-[10px] block">{lo.tpCode}</span>
                      <p className="font-bold text-slate-800">{lo.competency}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{lo.description}</p>
                    </div>
                  ))}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="font-extrabold text-indigo-800 block">Kelas {previewData.higherGrade} (Kelompok Atas):</span>
                {previewData.learningObjectives
                  .filter((lo: any) => lo.grade === previewData.higherGrade)
                  .map((lo: any, idx: number) => (
                    <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="font-mono font-bold text-purple-700 text-[10px] block">{lo.tpCode}</span>
                      <p className="font-bold text-slate-800">{lo.competency}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{lo.description}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* 8 Pola Aktivitas Pembelajaran Rotasi Kelas Rangkap */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              8 Langkah Pembelajaran Berpola Rotasi Kelas Rangkap:
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {previewData.teachingSteps.map((step: any) => (
                <div key={step.stepNumber} className="p-4 bg-white hover:bg-slate-50/80 transition space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-900 font-extrabold flex items-center justify-center text-xs">
                        {step.stepNumber}
                      </span>
                      <span className="font-extrabold text-slate-900">{step.stepName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {step.durationMinutes} Menit
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                      {step.patternType.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="text-slate-700 font-medium pl-8"><strong className="text-slate-900">Peran Guru:</strong> {step.teacherRole}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8 pt-1">
                    <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                      <strong className="text-emerald-900 block text-[11px]">Aktivitas Kelas {previewData.lowerGrade}:</strong>
                      <p className="text-slate-700 mt-0.5">{step.lowerGradeActivity}</p>
                    </div>
                    <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-200">
                      <strong className="text-indigo-900 block text-[11px]">Aktivitas Kelas {previewData.higherGrade}:</strong>
                      <p className="text-slate-700 mt-0.5">{step.higherGradeActivity}</p>
                    </div>
                  </div>

                  {step.classroomManagementNotes && (
                    <p className="text-[11px] text-amber-800 italic pl-8">
                      <strong>Catatan Manajemen Kelas:</strong> {step.classroomManagementNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rangkuman Diferensiasi & Asesmen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">Diferensiasi Pembelajaran:</span>
              <p><strong>Konten:</strong> {previewData.differentiation.content.lowerGrade} &bull; {previewData.differentiation.content.higherGrade}</p>
              <p><strong>Proses:</strong> {previewData.differentiation.process.lowerGrade} &bull; {previewData.differentiation.process.higherGrade}</p>
              <p><strong>Produk:</strong> {previewData.differentiation.product.lowerGrade} &bull; {previewData.differentiation.product.higherGrade}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">Rencana Asesmen:</span>
              <p><strong>Diagnostik:</strong> {previewData.assessments.diagnostic.technique}</p>
              <p><strong>Formatif Kelas {previewData.lowerGrade}:</strong> {previewData.assessments.formative.lowerGradeCriteria}</p>
              <p><strong>Formatif Kelas {previewData.higherGrade}:</strong> {previewData.assessments.formative.higherGradeCriteria}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
