"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Layers,
  Calendar,
  Clock,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Check,
  Edit3,
  Split,
  Table,
  FileText,
  Filter,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
import {
  previewAtpGenerationAction,
  saveGeneratedAtpPlanAction,
} from "@/app/actions/atp-generator";
import type { AtpGenerationResult, GeneratedAtpItem } from "@/lib/curriculum/atp-generator";

interface AtpGeneratorWizardProps {
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
}

export function AtpGeneratorWizard({ groups, subjects }: AtpGeneratorWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Wizard state
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [semester, setSemester] = useState<"Semua" | "Ganjil" | "Genap">("Semua");
  const [academicYear, setAcademicYear] = useState("2024/2025");
  const [targetScope, setTargetScope] = useState<"multigrade" | "lower_only" | "higher_only">("multigrade");

  // Plan Title state
  const [planTitle, setPlanTitle] = useState("");

  // Result state
  const [previewResult, setPreviewResult] = useState<AtpGenerationResult | null>(null);
  const [editableItems, setEditableItems] = useState<GeneratedAtpItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    "multigrade" | "lower_track" | "higher_track" | "prota" | "promes" | "coverage"
  >("multigrade");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-update Plan Title when group/subject/semester changes
  useEffect(() => {
    const selGroup = groups.find((g) => g.id === groupId);
    const selSub = subjects.find((s) => s.id === subjectId);
    if (selGroup && selSub) {
      const scopeLabel =
        targetScope === "multigrade"
          ? `${selGroup.name} (Kelas ${selGroup.grades})`
          : targetScope === "lower_only"
          ? `Kelas ${selGroup.grades.split(",")[0].trim()}`
          : `Kelas ${selGroup.grades.split(",")[1].trim()}`;

      setPlanTitle(
        `Alur Tujuan Pembelajaran ${selSub.name} ${scopeLabel} - TA ${academicYear}`
      );
    }
  }, [groupId, subjectId, semester, academicYear, targetScope, groups, subjects]);

  // Handle Generate Preview
  const handleGeneratePreview = () => {
    setErrorMessage(null);
    const selGroup = groups.find((g) => g.id === groupId);
    if (!selGroup) return;

    const grades = selGroup.grades.split(",").map((g) => parseInt(g.trim(), 10));
    let targetGrade: number | undefined;
    if (targetScope === "lower_only") targetGrade = Math.min(...grades);
    if (targetScope === "higher_only") targetGrade = Math.max(...grades);

    startTransition(async () => {
      const res = await previewAtpGenerationAction({
        groupId,
        subjectId,
        academicYear,
        semester,
        targetGrade,
      });

      if (res.success) {
        setPreviewResult(res.data);
        setEditableItems(res.data.generatedItems);
      } else {
        setErrorMessage(res.error || "Gagal menghasilkan pratinjau ATP.");
      }
    });
  };

  // Reorder Item Handler (Move Up/Down)
  const handleMoveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...editableItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Re-assign sequence order
    newItems.forEach((item, idx) => {
      item.sequenceOrder = idx + 1;
    });

    setEditableItems(newItems);
  };

  // Edit Item Hours Handler
  const handleItemHoursChange = (index: number, hours: number) => {
    const newItems = [...editableItems];
    newItems[index].allocatedHours = Math.max(1, hours);
    setEditableItems(newItems);
  };

  // Remove Item Handler
  const handleRemoveItem = (index: number) => {
    const newItems = editableItems.filter((_, idx) => idx !== index);
    newItems.forEach((item, idx) => {
      item.sequenceOrder = idx + 1;
    });
    setEditableItems(newItems);
  };

  // Add Unscheduled TP to Plan
  const handleAddUnscheduledTp = (tp: {
    id: string;
    code: string;
    competency: string;
    description: string;
    targetGrade: number;
    verificationStatus: string;
    element?: string;
  }) => {
    const newItem: GeneratedAtpItem = {
      tpId: tp.id,
      tpCode: tp.code,
      tpCompetency: tp.competency,
      tpDescription: tp.description,
      cpElement: tp.element || "Materi Pokok",
      targetGrade: tp.targetGrade,
      semester: semester === "Genap" ? "Genap" : "Ganjil",
      sequenceOrder: editableItems.length + 1,
      allocatedHours: 4,
      startWeek: 1,
      endWeek: 2,
      monthName: semester === "Genap" ? "Januari" : "Juli",
      multigradeStrategy: "terpadu_sebagian",
      multigradeNotes: `Ditambahkan oleh guru untuk Kelas ${tp.targetGrade}.`,
      verificationStatus: tp.verificationStatus,
    };
    setEditableItems([...editableItems, newItem]);
  };

  // Handle Save Plan
  const handleSavePlan = () => {
    if (!planTitle.trim()) {
      setErrorMessage("Judul Rencana ATP wajib diisi.");
      return;
    }
    if (editableItems.length === 0) {
      setErrorMessage("Alur ATP belum memiliki butir Tujuan Pembelajaran.");
      return;
    }

    const selGroup = groups.find((g) => g.id === groupId);
    if (!selGroup) return;

    const totalHours = editableItems.reduce((acc, curr) => acc + curr.allocatedHours, 0);

    startTransition(async () => {
      const res = await saveGeneratedAtpPlanAction({
        title: planTitle,
        groupId,
        subjectId,
        phase: selGroup.phase as "Fase A" | "Fase B" | "Fase C",
        academicYear,
        semester,
        totalHours,
        effectiveWeeks: 36,
        items: editableItems.map((item) => ({
          tpId: item.tpId,
          sequenceOrder: item.sequenceOrder,
          allocatedHours: item.allocatedHours,
          targetGrade: item.targetGrade,
          semester: item.semester,
          startWeek: item.startWeek,
          endWeek: item.endWeek,
          monthName: item.monthName,
          multigradeStrategy: item.multigradeStrategy,
          multigradeNotes: item.multigradeNotes,
          pairedTpId: item.pairedTpId,
        })),
      });

      if (res.success) {
        router.push(`/dashboard/kurikulum/atp/${res.data.planId}`);
      } else {
        setErrorMessage(res.error || "Gagal menyimpan Rencana ATP.");
      }
    });
  };

  const selectedGroup = groups.find((g) => g.id === groupId);
  const grades = selectedGroup ? selectedGroup.grades.split(",").map((g) => parseInt(g.trim(), 10)) : [1, 2];
  const lowerGrade = Math.min(...grades);
  const higherGrade = Math.max(...grades);

  const totalAllocatedHours = editableItems.reduce((acc, curr) => acc + curr.allocatedHours, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Generator ATP Multigrade Cerdas
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Penyusunan Alur Tujuan Pembelajaran, Program Tahunan (Prota), dan Program Semester (Promes)
              untuk kelompok kelas rangkap SDN Sedaeng II Tosari.
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Kendala Pemrosesan:</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Step 1: Configuration Parameters Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-600" />
          <span>1. Parameter Kelompok Belajar &amp; Periode Pembelajaran</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Kelompok */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kelompok Kelas Rangkap
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-amber-500"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} &bull; {g.phase} (Kelas {g.grades})
                </option>
              ))}
            </select>
          </div>

          {/* Mata Pelajaran */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-amber-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Semester Rencana</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value as "Semua" | "Ganjil" | "Genap")}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-amber-500"
            >
              <option value="Semua">Satu Tahun Ajaran (Ganjil &amp; Genap)</option>
              <option value="Ganjil">Semester Ganjil (Juli - Desember)</option>
              <option value="Genap">Semester Genap (Januari - Juni)</option>
            </select>
          </div>

          {/* Cakupan Tingkatan Kelas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cakupan Tingkat</label>
            <select
              value={targetScope}
              onChange={(e) =>
                setTargetScope(e.target.value as "multigrade" | "lower_only" | "higher_only")
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-amber-500"
            >
              <option value="multigrade">Kelompok Rangkap (Kelas {lowerGrade} &amp; {higherGrade})</option>
              <option value="lower_only">Khusus Kelas {lowerGrade} Saja</option>
              <option value="higher_only">Khusus Kelas {higherGrade} Saja</option>
            </select>
          </div>
        </div>

        {/* Plan Title & Generate Button */}
        <div className="pt-2 flex flex-col md:flex-row md:items-end justify-between gap-3 border-t border-slate-100">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">Judul Dokumen ATP</label>
            <input
              type="text"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="button"
            onClick={handleGeneratePreview}
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-100 transition flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyusun Alur &amp; Memeriksa Prasyarat...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Hasilkan Rekomendasi Alur ATP</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Section */}
      {previewResult && (
        <div className="space-y-6">
          {/* Important Notices & Warnings */}
          <div className="space-y-3">
            {/* Draft Warning */}
            {previewResult.hasUnverifiedTpsWarning && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-sm">Peringatan Integritas Kurikulum:</div>
                  <p className="mt-0.5">
                    Terdapat <strong>{previewResult.unverifiedTpsCount} Tujuan Pembelajaran</strong> yang berstatus
                    Draf / belum diverifikasi Kepala Sekolah. Alur ATP ini dapat disimpan sebagai draf, tetapi wajib
                    diverifikasi resmi sebelum dapat disahkan untuk pembelajaran.
                  </p>
                </div>
              </div>
            )}

            {/* Approved Material Map Integration Notice */}
            {previewResult.approvedMaterialMapUsed && (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Sinkronisasi Irisan Materi AI Aktif:</div>
                  <p className="mt-0.5">
                    Generator secara otomatis menyinkronkan urutan dengan pemetaan materi yang telah disetujui:{" "}
                    <strong>"{previewResult.approvedMaterialMapUsed.theme}"</strong> (Strategi:{" "}
                    <em>{previewResult.approvedMaterialMapUsed.strategy}</em>).
                  </p>
                </div>
              </div>
            )}

            {/* Prerequisite Issues Alert */}
            {previewResult.prerequisiteIssues.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Terdeteksi Masalah Prasyarat:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5">
                  {previewResult.prerequisiteIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">Total Jam Pelajaran</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {totalAllocatedHours} <span className="text-xs font-normal text-slate-400">/ {previewResult.standardTargetHours} JP</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                {previewResult.timeBudgetStatus === "sesuai" && "Sesuai Standar Kurikulum"}
                {previewResult.timeBudgetStatus === "kurang" && "Di Bawah Target Standar"}
                {previewResult.timeBudgetStatus === "berlebih" && "Melebihi Target Standar"}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">TP Terjadwal</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {editableItems.length}{" "}
                <span className="text-xs font-normal text-slate-400">
                  / {previewResult.coverageSummary.totalTps} Total
                </span>
              </div>
              <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                Kelas {lowerGrade}: {editableItems.filter((i) => i.targetGrade === lowerGrade).length} TP &bull;{" "}
                Kelas {higherGrade}: {editableItems.filter((i) => i.targetGrade === higherGrade).length} TP
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-amber-600">TP Belum Terjadwal</div>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {previewResult.coverageSummary.unscheduledCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Kls {lowerGrade}: {previewResult.coverageSummary.lowerGradeUnscheduledCount} &bull;{" "}
                Kls {higherGrade}: {previewResult.coverageSummary.higherGradeUnscheduledCount}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">Pekan Efektif</div>
              <div className="text-2xl font-black text-slate-900 mt-1">18 Pekan</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Per Semester &bull; SDN Sedaeng II</div>
            </div>
          </div>

          {/* View Mode Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            {[
              { id: "multigrade", label: "Alur Kelas Rangkap (Multigrade Track)", icon: Layers },
              { id: "lower_track", label: `Alur Khusus Kelas ${lowerGrade}`, icon: BookOpen },
              { id: "higher_track", label: `Alur Khusus Kelas ${higherGrade}`, icon: BookOpen },
              { id: "prota", label: "Format Program Tahunan (Prota)", icon: Table },
              { id: "promes", label: "Format Program Semester (Promes)", icon: Calendar },
              { id: "coverage", label: "Peta Cakupan TP (Coverage Map)", icon: CheckCircle2 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: MULTIGRADE TRACK (DUAL CLASS SYNCHRONIZED) */}
          {activeTab === "multigrade" && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Alur Manajemen Kelas Rangkap Berdampingan ({selectedGroup?.name})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Jadwal pengajaran paralel dalam 1 ruang kelas. Setiap kelas tetap mempertahankan capaian TP masing-masing.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {previewResult.multigradeMasterSlots.map((slot) => (
                  <div
                    key={slot.slotNumber}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                          {slot.slotNumber}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {slot.sharedTheme}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          &bull; Pekan {slot.startWeek} - {slot.endWeek} ({slot.monthName}) &bull;{" "}
                          Semester {slot.semester}
                        </span>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                        {slot.strategy}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Lower Grade Side */}
                      <div className="p-4 rounded-xl bg-white border border-blue-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-blue-900">
                            Kelas {lowerGrade} (Tingkatan Rendah)
                          </span>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {slot.lowerGradeItem?.allocatedHours || 0} JP
                          </span>
                        </div>
                        {slot.lowerGradeItem ? (
                          <>
                            <div className="font-mono font-bold text-blue-800">
                              {slot.lowerGradeItem.tpCode}
                            </div>
                            <div className="font-semibold text-slate-900">
                              {slot.lowerGradeItem.tpCompetency}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {slot.lowerGradeItem.tpDescription}
                            </div>
                          </>
                        ) : (
                          <div className="text-slate-400 italic">Tidak ada TP pada slot ini</div>
                        )}
                      </div>

                      {/* Higher Grade Side */}
                      <div className="p-4 rounded-xl bg-white border border-purple-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-purple-900">
                            Kelas {higherGrade} (Tingkatan Tinggi)
                          </span>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                            {slot.higherGradeItem?.allocatedHours || 0} JP
                          </span>
                        </div>
                        {slot.higherGradeItem ? (
                          <>
                            <div className="font-mono font-bold text-purple-800">
                              {slot.higherGradeItem.tpCode}
                            </div>
                            <div className="font-semibold text-slate-900">
                              {slot.higherGradeItem.tpCompetency}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {slot.higherGradeItem.tpDescription}
                            </div>
                          </>
                        ) : (
                          <div className="text-slate-400 italic">Tidak ada TP pada slot ini</div>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600">
                      <strong>Strategi Pengelolaan Kelas:</strong> {slot.classroomManagementNotes}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2 & 3: SINGLE CLASS TRACKS (EDITABLE SEQUENCE & JP) */}
          {(activeTab === "lower_track" || activeTab === "higher_track") && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Alur Urutan TP &amp; Alokasi Jam Kelas{" "}
                    {activeTab === "lower_track" ? lowerGrade : higherGrade}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Guru dapat menyesuaikan alokasi JP per TP dan mengubah urutan pengajaran naik/turun.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                      <th className="py-2.5 px-3 w-12 text-center">Urutan</th>
                      <th className="py-2.5 px-3">Kode &amp; Elemen</th>
                      <th className="py-2.5 px-3">Kompetensi &amp; Materi</th>
                      <th className="py-2.5 px-3 w-24">Semester</th>
                      <th className="py-2.5 px-3 w-28">Pekan &amp; Bulan</th>
                      <th className="py-2.5 px-3 w-24 text-center">Alokasi JP</th>
                      <th className="py-2.5 px-3 w-24 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editableItems
                      .map((item, originalIdx) => ({ item, originalIdx }))
                      .filter(
                        ({ item }) =>
                          item.targetGrade ===
                          (activeTab === "lower_track" ? lowerGrade : higherGrade)
                      )
                      .map(({ item, originalIdx }, idx) => (
                        <tr key={item.tpId} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                            #{item.sequenceOrder}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-indigo-700">
                              {item.tpCode}
                            </span>
                            <div className="text-[11px] text-slate-500">{item.cpElement}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{item.tpCompetency}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {item.tpDescription}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.semester === "Ganjil"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {item.semester}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            Pekan {item.startWeek}-{item.endWeek}
                            <div className="text-slate-400 font-medium">{item.monthName}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={item.allocatedHours}
                              onChange={(e) =>
                                handleItemHoursChange(originalIdx, parseInt(e.target.value, 10) || 4)
                              }
                              className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveItem(originalIdx, "up")}
                                disabled={originalIdx === 0}
                                className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                                title="Pindah Naik"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveItem(originalIdx, "down")}
                                disabled={originalIdx === editableItems.length - 1}
                                className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                                title="Pindah Turun"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(originalIdx)}
                                className="p-1 rounded hover:bg-rose-100 text-rose-600"
                                title="Hapus dari Alur"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PROGRAM TAHUNAN (PROTA) */}
          {activeTab === "prota" && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Format Resmi Program Tahunan (Prota) &bull; TA {academicYear}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    SDN SEDAENG II Tosari &bull; {selectedGroup?.name} &bull; {subjects.find((s) => s.id === subjectId)?.name}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 border-r border-slate-200 text-center w-12">No</th>
                      <th className="p-2.5 border-r border-slate-200 w-24">Semester</th>
                      <th className="p-2.5 border-r border-slate-200 w-20">Kelas</th>
                      <th className="p-2.5 border-r border-slate-200 w-32">Elemen CP</th>
                      <th className="p-2.5 border-r border-slate-200 w-32">Kode TP</th>
                      <th className="p-2.5 border-r border-slate-200">Rumusan Tujuan Pembelajaran</th>
                      <th className="p-2.5 border-r border-slate-200 text-center w-20">Alokasi JP</th>
                      <th className="p-2.5">Catatan Multigrade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewResult.protaEntries.map((entry) => (
                      <tr key={entry.no} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 text-center font-bold">{entry.no}</td>
                        <td className="p-2 border-r border-slate-200">{entry.semester}</td>
                        <td className="p-2 border-r border-slate-200 font-bold">Kelas {entry.grade}</td>
                        <td className="p-2 border-r border-slate-200">{entry.element}</td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold text-indigo-700">
                          {entry.tpCode}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-medium">{entry.competency}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-900">
                          {entry.allocatedHours} JP
                        </td>
                        <td className="p-2 text-slate-500 text-[11px]">{entry.notes || "-"}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={6} className="p-2.5 text-right border-r border-slate-200">
                        Total Alokasi Waktu Program Tahunan:
                      </td>
                      <td className="p-2.5 text-center text-indigo-700 border-r border-slate-200">
                        {totalAllocatedHours} JP
                      </td>
                      <td className="p-2.5 text-[11px] text-slate-500">
                        Target Standar: {previewResult.standardTargetHours} JP
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: PROGRAM SEMESTER (PROMES) */}
          {activeTab === "promes" && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Matriks Distribusi Mingguan Program Semester (Promes)
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Distribusi alokasi Jam Pelajaran (JP) pada 18 pekan efektif semester ganjil/genap.
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border border-slate-200">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th rowSpan={2} className="p-2 border-r border-slate-200 text-center w-10">No</th>
                      <th rowSpan={2} className="p-2 border-r border-slate-200 w-16">Kelas</th>
                      <th rowSpan={2} className="p-2 border-r border-slate-200 w-24">Kode TP</th>
                      <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[200px]">Tujuan Pembelajaran</th>
                      <th rowSpan={2} className="p-2 border-r border-slate-200 text-center w-14">JP</th>
                      <th colSpan={18} className="p-1 border-r border-slate-200 text-center bg-slate-200/80">
                        Pekan Efektif Pembelajaran (Pekan 1 s/d 18)
                      </th>
                    </tr>
                    <tr className="bg-slate-50 text-[10px] text-center border-t border-slate-200">
                      {previewResult.promesWeeksGanjil.map((col) => (
                        <th
                          key={col.globalWeekNumber}
                          className={`p-1 border-r border-slate-200 w-6 ${
                            col.isAssessmentWeek ? "bg-amber-100 text-amber-900 font-black" : ""
                          }`}
                          title={`${col.month} - ${col.label}`}
                        >
                          {col.globalWeekNumber}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewResult.promesEntries.map((entry) => (
                      <tr key={entry.no} className="hover:bg-slate-50">
                        <td className="p-1.5 border-r border-slate-200 text-center font-bold">{entry.no}</td>
                        <td className="p-1.5 border-r border-slate-200 font-bold">Kls {entry.grade}</td>
                        <td className="p-1.5 border-r border-slate-200 font-mono font-bold text-indigo-700">
                          {entry.tpCode}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 font-medium truncate max-w-[220px]">
                          {entry.competency}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center font-bold text-slate-800">
                          {entry.allocatedHours}
                        </td>
                        {previewResult.promesWeeksGanjil.map((col) => {
                          const hours = entry.weeklyDistribution[col.globalWeekNumber];
                          return (
                            <td
                              key={col.globalWeekNumber}
                              className={`p-1 border-r border-slate-200 text-center font-bold text-[10px] ${
                                hours ? "bg-indigo-50 text-indigo-700" : ""
                              } ${col.isAssessmentWeek ? "bg-amber-50" : ""}`}
                            >
                              {hours || (col.isAssessmentWeek ? "•" : "")}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: PETA CAKUPAN TP (COVERAGE MAP & UNSCHEDULED) */}
          {activeTab === "coverage" && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Peta Cakupan Tujuan Pembelajaran (TP Coverage Map)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Memantau TP yang telah terjadwal dan memastikan tidak ada kompetensi wajib yang tertinggal (*unscheduled*).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lower Grade Coverage */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-xs font-bold text-blue-900">
                      Cakupan TP Kelas {lowerGrade}
                    </span>
                    <span className="text-[10px] font-bold text-blue-700">
                      {previewResult.coverageDetails.lowerGradeTps.length} TP Terdaftar
                    </span>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {previewResult.coverageDetails.lowerGradeTps.map((tp) => (
                      <div
                        key={tp.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          tp.scheduledStatus === "unscheduled"
                            ? "bg-amber-50/60 border-amber-300"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-900">{tp.code}</span>
                          {tp.scheduledStatus === "unscheduled" ? (
                            <button
                              type="button"
                              onClick={() => handleAddUnscheduledTp(tp)}
                              className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm"
                            >
                              <span>+ Masukkan ke Alur</span>
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Terjadwal ({tp.scheduledStatus})</span>
                            </span>
                          )}
                        </div>

                        <div className="font-semibold text-slate-900">{tp.competency}</div>
                        <div className="text-[11px] text-slate-600">{tp.description}</div>

                        {tp.isDraft && (
                          <div className="text-[10px] text-amber-700 font-semibold">
                            &bull; Status TP masih Draf (Perlu verifikasi Kepala Sekolah)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Higher Grade Coverage */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-xs font-bold text-purple-900">
                      Cakupan TP Kelas {higherGrade}
                    </span>
                    <span className="text-[10px] font-bold text-purple-700">
                      {previewResult.coverageDetails.higherGradeTps.length} TP Terdaftar
                    </span>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {previewResult.coverageDetails.higherGradeTps.map((tp) => (
                      <div
                        key={tp.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          tp.scheduledStatus === "unscheduled"
                            ? "bg-amber-50/60 border-amber-300"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-purple-900">{tp.code}</span>
                          {tp.scheduledStatus === "unscheduled" ? (
                            <button
                              type="button"
                              onClick={() => handleAddUnscheduledTp(tp)}
                              className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm"
                            >
                              <span>+ Masukkan ke Alur</span>
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Terjadwal ({tp.scheduledStatus})</span>
                            </span>
                          )}
                        </div>

                        <div className="font-semibold text-slate-900">{tp.competency}</div>
                        <div className="text-[11px] text-slate-600">{tp.description}</div>

                        {tp.isDraft && (
                          <div className="text-[10px] text-amber-700 font-semibold">
                            &bull; Status TP masih Draf (Perlu verifikasi Kepala Sekolah)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 bg-white p-5 rounded-2xl shadow-sm">
            <div className="text-xs text-slate-500">
              Total <strong>{editableItems.length} TP Terjadwal</strong> &bull; Total <strong>{totalAllocatedHours} Jam Pelajaran (JP)</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                disabled={isPending || editableItems.length === 0}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Rencana ATP...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Rencana ATP Multigrade</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
