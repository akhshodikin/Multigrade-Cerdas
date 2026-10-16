"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
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
  Copy,
  Play,
  RotateCcw,
  Check,
  XCircle,
  FileSpreadsheet,
  Download,
  Info,
} from "lucide-react";
import {
  updateModulAjarAction,
  duplicateModulAjarAction,
  submitModulForReviewAction,
  approveModulAjarAction,
  publishModulAjarAction,
  rejectModulAjarAction,
  verifyModulCurriculumConsistencyAction,
} from "@/app/actions/modul-ajar";
import type {
  TeachingStep,
  LearningObjectiveItem,
  Differentiation,
  AssessmentPlan,
  Reflections,
  RemedialAndEnrichment,
  CurriculumIntegrityReport,
} from "@/lib/modul-ajar/types";

interface ModulAjarDetailViewProps {
  data: {
    plan: {
      id: string;
      title: string;
      groupId: string;
      subjectId: string;
      phase: string;
      grades: string;
      academicYear: string;
      semester: string;
      durationMinutes: number;
      allocatedHours: number;
      topic: string;
      essentialMaterial: string;
      initialCompetency: string;
      learningObjectives: LearningObjectiveItem[];
      curriculumReferences: {
        cpId?: string;
        cpCode?: string;
        cpElement?: string;
        atpPlanId?: string;
        atpPlanTitle?: string;
        materialMapId?: string;
        tpIds: string[];
      };
      mediaAndResources: {
        media: string[];
        toolsAndMaterials: string[];
        learningSources: string[];
        localContextNotes?: string;
      };
      teachingSteps: TeachingStep[];
      differentiation: Differentiation;
      assessments: AssessmentPlan;
      reflections: Reflections;
      remedialAndEnrichment: RemedialAndEnrichment;
      teacherNotes?: string | null;
      status: string;
      version: number;
      versionNotes?: string | null;
      rejectionNotes?: string | null;
      clonedFromId?: string | null;
      aiAssisted: boolean;
      aiProvider: string;
      aiModel: string;
      updatedAt: Date;
    };
    group?: {
      id: string;
      name: string;
      phase: string;
      grades: string;
    } | null;
    subject?: {
      id: string;
      name: string;
      category: string;
    } | null;
    teacher?: {
      id: string;
      name: string;
      nip?: string | null;
    } | null;
    approver?: {
      id: string;
      name: string;
      nip?: string | null;
    } | null;
    school?: {
      id: string | number;
      name: string;
      npsn: string;
      address: string;
      headmasterName?: string | null;
      headmasterNip?: string | null;
    } | null;
    grades: {
      lowerGrade: number;
      higherGrade: number;
    };
    integrityReport: CurriculumIntegrityReport;
  };
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

export function ModulAjarDetailView({ data, currentUser }: ModulAjarDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<
    "modul_lengkap" | "rotasi_rangkap" | "asesmen_rubrik" | "audit_kurikulum" | "print"
  >("modul_lengkap");

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(data.plan.title);
  const [topic, setTopic] = useState(data.plan.topic);
  const [durationMinutes, setDurationMinutes] = useState(data.plan.durationMinutes);
  const [allocatedHours, setAllocatedHours] = useState(data.plan.allocatedHours);
  const [essentialMaterial, setEssentialMaterial] = useState(data.plan.essentialMaterial);
  const [initialCompetency, setInitialCompetency] = useState(data.plan.initialCompetency);
  const [teachingSteps, setTeachingSteps] = useState(data.plan.teachingSteps);
  const [versionNotes, setVersionNotes] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");

  // Feedback states
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [integrityReport, setIntegrityReport] = useState<CurriculumIntegrityReport>(data.integrityReport);

  const canApprove = currentUser.role === "admin" || currentUser.role === "headmaster";
  const canEdit = currentUser.role === "admin" || currentUser.role === "headmaster" || currentUser.role === "teacher";

  // Handle Save Edits
  const handleSaveEdits = () => {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const res = await updateModulAjarAction(data.plan.id, {
        title,
        topic,
        durationMinutes,
        allocatedHours,
        essentialMaterial,
        initialCompetency,
        teachingSteps,
        versionNotes: versionNotes.trim() || undefined,
      });

      if (res.success) {
        setActionSuccess(`Perubahan berhasil disimpan! Modul kini berada di Versi ${res.data.version}.`);
        setIsEditing(false);
        router.refresh();
      } else {
        setActionError(res.error);
      }
    });
  };

  // Handle Duplication
  const handleDuplicate = () => {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const res = await duplicateModulAjarAction(data.plan.id);
      if (res.success) {
        setActionSuccess("Modul Ajar berhasil diduplikasi. Mengarahkan ke modul salinan baru...");
        router.push(`/dashboard/kurikulum/modul-ajar/${res.data.newLessonPlanId}`);
      } else {
        setActionError(res.error);
      }
    });
  };

  // Lifecycle action handler
  const handleLifecycle = (actionType: "submit" | "approve" | "publish" | "reject" | "verify") => {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      if (actionType === "submit") {
        const res = await submitModulForReviewAction(data.plan.id);
        if (res.success) {
          setActionSuccess("Modul Ajar diajukan untuk tinjauan Kepala Sekolah.");
          router.refresh();
        } else setActionError(res.error);
      } else if (actionType === "approve") {
        const res = await approveModulAjarAction(data.plan.id);
        if (res.success) {
          setActionSuccess("Modul Ajar resmi disetujui Kepala Sekolah.");
          router.refresh();
        } else setActionError(res.error);
      } else if (actionType === "publish") {
        const res = await publishModulAjarAction(data.plan.id);
        if (res.success) {
          setActionSuccess("Modul Ajar resmi diterbitkan untuk kegiatan pembelajaran!");
          router.refresh();
        } else setActionError(res.error);
      } else if (actionType === "reject") {
        if (!rejectionNotes.trim()) {
          setActionError("Wajib menyertakan alasan penolakan!");
          return;
        }
        const res = await rejectModulAjarAction(data.plan.id, rejectionNotes);
        if (res.success) {
          setActionSuccess("Modul Ajar dikembalikan ke status draf perbaikan.");
          router.refresh();
        } else setActionError(res.error);
      } else if (actionType === "verify") {
        const res = await verifyModulCurriculumConsistencyAction(data.plan.id);
        if (res.success) {
          setIntegrityReport(res.data);
          setActionSuccess("Pemeriksaan ketelusuran kurikulum selesai dijalankan.");
          setActiveTab("audit_kurikulum");
        } else setActionError(res.error);
      }
    });
  };

  // Export as text / markdown download
  const handleDownloadDoc = () => {
    const textContent = `
================================================================================
MODUL AJAR MULTIGRADE (KELAS RANGKAP) KURIKULUM MERDEKA
${data.school?.name || "SDN SEDAENG II TOSARI"} - KABUPATEN PASURUAN
================================================================================

1. INFORMASI UMUM
- Judul Modul: ${data.plan.title}
- Mata Pelajaran: ${data.subject?.name}
- Fase / Kelompok: ${data.plan.phase} (${data.group?.name || "Kelompok Rangkap"})
- Kelas Terlibat: Kelas ${data.grades.lowerGrade} dan Kelas ${data.grades.higherGrade}
- Alokasi Waktu: ${data.plan.durationMinutes} Menit (${data.plan.allocatedHours} JP)
- Tahun Ajaran / Semester: ${data.plan.academicYear} - Semester ${data.plan.semester}
- Guru Pengampu: ${data.teacher?.name || "-"}
- Kepala Sekolah: ${data.school?.headmasterName || "Akhmad Shodikin, M.Pd"}

2. TUJUAN PEMBELAJARAN TIAP KELAS
${data.plan.learningObjectives
  .map((lo) => `[Kelas ${lo.grade}] ${lo.tpCode}: ${lo.competency}\nDeskripsi: ${lo.description}`)
  .join("\n\n")}

3. MATERI ESENSIAL & KOMPETENSI AWAL
- Materi Pokok: ${data.plan.essentialMaterial}
- Kompetensi Awal: ${data.plan.initialCompetency}

4. LANGKAH PEMBELAJARAN (8 POLA ROTASI KELAS RANGKAP)
${data.plan.teachingSteps
  .map(
    (s) =>
      `Langkah ${s.stepNumber}: ${s.stepName} (${s.durationMinutes} Menit - ${s.patternType})\nPeran Guru: ${s.teacherRole}\nAktivitas Kelas ${data.grades.lowerGrade}: ${s.lowerGradeActivity}\nAktivitas Kelas ${data.grades.higherGrade}: ${s.higherGradeActivity}\n`
  )
  .join("\n")}

5. DIFERENSIASI
- Konten: Kls ${data.grades.lowerGrade}: ${data.plan.differentiation.content.lowerGrade} | Kls ${data.grades.higherGrade}: ${data.plan.differentiation.content.higherGrade}
- Proses: Kls ${data.grades.lowerGrade}: ${data.plan.differentiation.process.lowerGrade} | Kls ${data.grades.higherGrade}: ${data.plan.differentiation.process.higherGrade}
- Produk: Kls ${data.grades.lowerGrade}: ${data.plan.differentiation.product.lowerGrade} | Kls ${data.grades.higherGrade}: ${data.plan.differentiation.product.higherGrade}

6. ASESMEN & REFLEKSI
- Diagnostik: ${data.plan.assessments.diagnostic.technique}
- Kriteria Formatif Kelas ${data.grades.lowerGrade}: ${data.plan.assessments.formative.lowerGradeCriteria}
- Kriteria Formatif Kelas ${data.grades.higherGrade}: ${data.plan.assessments.formative.higherGradeCriteria}
`;

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Modul_Ajar_${data.plan.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold">&times;</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 font-bold">&times;</button>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                data.plan.status === "published"
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : data.plan.status === "approved"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : data.plan.status === "in_review"
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-slate-100 text-slate-700 border border-slate-300"
              }`}
            >
              {data.plan.status === "published"
                ? "DITERBITKAN (AKTIF KELAS)"
                : data.plan.status === "approved"
                ? "DISETUJUI KEPALA SEKOLAH"
                : data.plan.status === "in_review"
                ? "DITINJAU"
                : "DRAF GURU"}
            </span>

            <span className="text-xs px-2.5 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-bold">
              Versi {data.plan.version}
            </span>

            <span className="text-xs px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-md font-bold">
              {data.plan.phase}
            </span>

            <span className="text-xs px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-md font-bold">
              {data.group?.name} (Kelas {data.grades.lowerGrade} &amp; {data.grades.higherGrade})
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {data.plan.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>Mapel: <strong className="text-slate-800">{data.subject?.name}</strong></span>
            <span>&bull;</span>
            <span>Durasi: <strong className="text-slate-800">{data.plan.durationMinutes} Menit ({data.plan.allocatedHours} JP)</strong></span>
            <span>&bull;</span>
            <span>Penyusun: <strong className="text-slate-800">{data.teacher?.name || "Guru Kelas"}</strong></span>
            {data.approver && (
              <>
                <span>&bull;</span>
                <span>Penyetuju: <strong className="text-emerald-700">{data.approver.name}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Button */}
          {canEdit && (data.plan.status === "draft" || data.plan.status === "rejected") && (
            <>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition border border-slate-300"
                >
                  <Edit3 className="w-4 h-4 text-blue-600" /> Sunting Modul
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdits}
                    disabled={isPending}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Save className="w-4 h-4" /> Simpan Versi Baru
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                  >
                    Batal
                  </button>
                </div>
              )}
            </>
          )}

          {/* Duplikasi Modul */}
          <button
            onClick={handleDuplicate}
            disabled={isPending}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition border border-slate-300"
          >
            <Copy className="w-4 h-4 text-purple-600" /> Duplikasi Modul
          </button>

          {/* Uji Ketelusuran Kurikulum */}
          <button
            onClick={() => handleLifecycle("verify")}
            disabled={isPending}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition border border-slate-300"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Uji Integritas
          </button>

          {/* Ajukan Tinjauan */}
          {data.plan.status === "draft" && !isEditing && (
            <button
              onClick={() => handleLifecycle("submit")}
              disabled={isPending}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm"
            >
              <Clock className="w-4 h-4" /> Ajukan Tinjauan
            </button>
          )}

          {/* Persetujuan Kepala Sekolah */}
          {canApprove && (data.plan.status === "in_review" || data.plan.status === "draft") && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLifecycle("approve")}
                disabled={isPending}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm"
              >
                <Check className="w-4 h-4" /> Setujui Modul
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Catatan penolakan..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-rose-300 rounded-lg bg-white text-slate-800 w-32"
                />
                <button
                  onClick={() => handleLifecycle("reject")}
                  disabled={isPending}
                  className="px-2.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Tolak
                </button>
              </div>
            </div>
          )}

          {/* Terbitkan Modul */}
          {data.plan.status === "approved" && (
            <button
              onClick={() => handleLifecycle("publish")}
              disabled={isPending}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm"
            >
              <Play className="w-4 h-4" /> Terbitkan Modul
            </button>
          )}

          {/* Cetak / Ekspor */}
          <button
            onClick={() => setActiveTab("print")}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak / Ekspor
          </button>
        </div>
      </div>

      {/* Rejection notice if any */}
      {data.plan.rejectionNotes && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Catatan Penolakan Kepala Sekolah:</span>
            <p className="bg-white p-2.5 rounded border border-rose-200 text-rose-800 font-medium">
              {data.plan.rejectionNotes}
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-1 p-1.5 bg-slate-200/80 rounded-2xl text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab("modul_lengkap")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "modul_lengkap"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BookOpen className="w-4 h-4 text-purple-600" /> Rencana Modul Lengkap
        </button>

        <button
          onClick={() => setActiveTab("rotasi_rangkap")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "rotasi_rangkap"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4 text-amber-600" /> Alur 8 Pola Rotasi
        </button>

        <button
          onClick={() => setActiveTab("asesmen_rubrik")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "asesmen_rubrik"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Asesmen &amp; Rubrik
        </button>

        <button
          onClick={() => setActiveTab("audit_kurikulum")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "audit_kurikulum"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" /> Integritas Kurikulum ({integrityReport.isConsistent ? "Valid" : "Ada Isu"})
        </button>

        <button
          onClick={() => setActiveTab("print")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "print"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Printer className="w-4 h-4 text-slate-900" /> Format Cetak Resmi
        </button>
      </div>

      {/* Tab 1: Rencana Modul Lengkap */}
      {activeTab === "modul_lengkap" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Identitas Pembelajaran */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <p><strong className="w-36 inline-block text-slate-600">Satuan Pendidikan:</strong> <span className="font-semibold text-slate-900">{data.school?.name || "SDN SEDAENG II Tosari"}</span></p>
              <p><strong className="w-36 inline-block text-slate-600">Fase / Kelas:</strong> <span className="font-semibold text-slate-900">{data.plan.phase} (Kelas {data.grades.lowerGrade} &amp; {data.grades.higherGrade})</span></p>
              <p><strong className="w-36 inline-block text-slate-600">Mata Pelajaran:</strong> <span className="font-semibold text-slate-900">{data.subject?.name}</span></p>
            </div>
            <div>
              <p><strong className="w-36 inline-block text-slate-600">Tahun Ajaran / Smt:</strong> <span className="font-semibold text-slate-900">{data.plan.academicYear} &bull; {data.plan.semester}</span></p>
              <p><strong className="w-36 inline-block text-slate-600">Alokasi Waktu:</strong> <span className="font-semibold text-slate-900">{data.plan.durationMinutes} Menit ({data.plan.allocatedHours} JP)</span></p>
              <p><strong className="w-36 inline-block text-slate-600">Guru Pengampu:</strong> <span className="font-semibold text-slate-900">{data.teacher?.name || "Guru Kelas"}</span></p>
            </div>
          </div>

          {/* Topik & Materi Esensial */}
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">Materi Esensial:</span>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={essentialMaterial}
                  onChange={(e) => setEssentialMaterial(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs bg-white text-slate-800"
                />
              ) : (
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                  {data.plan.essentialMaterial}
                </p>
              )}
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">Kompetensi Awal:</span>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={initialCompetency}
                  onChange={(e) => setInitialCompetency(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs bg-white text-slate-800"
                />
              ) : (
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                  {data.plan.initialCompetency}
                </p>
              )}
            </div>
          </div>

          {/* Tujuan Pembelajaran Berjenjang */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Tujuan Pembelajaran Khusus per Kelas (Invarian Berjenjang):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2 text-xs">
                <span className="font-extrabold text-emerald-900 block">Target Kelas {data.grades.lowerGrade}:</span>
                {data.plan.learningObjectives
                  .filter((lo) => lo.grade === data.grades.lowerGrade)
                  .map((lo, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1">
                      <span className="font-mono font-bold text-purple-700 text-[10px]">{lo.tpCode}</span>
                      <p className="font-bold text-slate-900">{lo.competency}</p>
                      <p className="text-slate-600 text-[11px]">{lo.description}</p>
                    </div>
                  ))}
              </div>

              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2 text-xs">
                <span className="font-extrabold text-indigo-900 block">Target Kelas {data.grades.higherGrade}:</span>
                {data.plan.learningObjectives
                  .filter((lo) => lo.grade === data.grades.higherGrade)
                  .map((lo, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-indigo-200 space-y-1">
                      <span className="font-mono font-bold text-purple-700 text-[10px]">{lo.tpCode}</span>
                      <p className="font-bold text-slate-900">{lo.competency}</p>
                      <p className="text-slate-600 text-[11px]">{lo.description}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Media & Sumber Belajar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-900 block">Media dan Sumber Belajar Lingkungan Tosari:</span>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              {data.plan.mediaAndResources.media.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
              {data.plan.mediaAndResources.learningSources.map((ls, idx) => (
                <li key={idx}>{ls}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: Alur 8 Pola Rotasi Kelas Rangkap */}
      {activeTab === "rotasi_rangkap" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                8 Langkah Pembelajaran Berpola Rotasi Kelas Rangkap
              </h3>
              <p className="text-xs text-slate-500">
                Pola stasioner: Guru bergantian memberikan bimbingan langsung, sementara kelompok lain melakukan aktivitas mandiri terarah sesuai usia.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {teachingSteps.map((step, idx) => (
              <div key={step.stepNumber} className="p-4 bg-white hover:bg-slate-50/80 transition space-y-3">
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

                <div className="pl-8 space-y-2">
                  <p className="text-slate-700 font-medium">
                    <strong className="text-slate-900">Peran Guru:</strong> {step.teacherRole}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
                      <strong className="text-emerald-900 block text-[11px] mb-1">
                        Aktivitas Kelas {data.grades.lowerGrade} (Kelompok Bawah):
                      </strong>
                      <p className="text-slate-700">{step.lowerGradeActivity}</p>
                    </div>
                    <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-200">
                      <strong className="text-indigo-900 block text-[11px] mb-1">
                        Aktivitas Kelas {data.grades.higherGrade} (Kelompok Atas):
                      </strong>
                      <p className="text-slate-700">{step.higherGradeActivity}</p>
                    </div>
                  </div>

                  {step.classroomManagementNotes && (
                    <p className="text-[11px] text-amber-800 italic pt-1">
                      <strong>Manajemen Kelas Rangkap:</strong> {step.classroomManagementNotes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Asesmen & Rubrik */}
      {activeTab === "asesmen_rubrik" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-slate-900 text-sm">
              Rencana Asesmen Diagnostik, Formatif, dan Rubrik Observasi
            </h3>
            <p className="text-xs text-slate-500">
              Menilai pencapaian kompetensi secara terpisah per jenjang kelas tanpa menyamakan rubrik.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Asesmen Diagnostik */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">Asesmen Awal (Diagnostik):</span>
              <p><strong>Teknik:</strong> {data.plan.assessments.diagnostic.technique}</p>
              <p><strong>Instrumen:</strong> {data.plan.assessments.diagnostic.instrument}</p>
              <div className="pt-1">
                <strong>Pertanyaan Pemantik:</strong>
                <ul className="list-disc list-inside mt-1 text-slate-700 space-y-1">
                  {data.plan.assessments.diagnostic.questions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Asesmen Formatif Kriteria Ketercapaian */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <span className="font-bold text-emerald-900 block">Kriteria Formatif Kelas {data.grades.lowerGrade}:</span>
                <p className="text-slate-800">{data.plan.assessments.formative.lowerGradeCriteria}</p>
              </div>

              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                <span className="font-bold text-indigo-900 block">Kriteria Formatif Kelas {data.grades.higherGrade}:</span>
                <p className="text-slate-800">{data.plan.assessments.formative.higherGradeCriteria}</p>
              </div>
            </div>

            {/* Rubrik Observasi 4 Level */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 block">Rubrik Observasi 4 Tingkat Pencapaian:</span>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-[11px] font-bold uppercase text-slate-700 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Kriteria</th>
                      <th className="py-2.5 px-3">Perlu Bimbingan</th>
                      <th className="py-2.5 px-3">Cukup</th>
                      <th className="py-2.5 px-3">Baik</th>
                      <th className="py-2.5 px-3">Sangat Baik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.plan.assessments.formative.observationRubric.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{r.criteria}</td>
                        <td className="py-2.5 px-3 text-rose-700 bg-rose-50/40">{r.perluBimbingan}</td>
                        <td className="py-2.5 px-3 text-amber-700 bg-amber-50/40">{r.cukup}</td>
                        <td className="py-2.5 px-3 text-blue-700 bg-blue-50/40">{r.baik}</td>
                        <td className="py-2.5 px-3 text-emerald-700 bg-emerald-50/40">{r.sangatBaik}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Integritas Kurikulum */}
      {activeTab === "audit_kurikulum" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Audit Ketelusuran &amp; Integritas Referensi Kurikulum
              </h3>
              <p className="text-xs text-slate-500">
                Memastikan seluruh rujukan TP, CP, dan ATP tetap konsisten di database dan tidak hilang akibat revisi kurikulum lain.
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              integrityReport.isConsistent ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}>
              {integrityReport.isConsistent ? "Integritas Valid (Konsisten)" : "Terdeteksi Ketidakkonsistenan"}
            </span>
          </div>

          {integrityReport.issues.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Catatan Masalah yang Ditemukan:
              </span>
              <ul className="list-disc list-inside space-y-1">
                {integrityReport.issues.map((iss, idx) => (
                  <li key={idx}>{iss}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Daftar Rujukan Kurikulum Resmi yang Diverifikasi:
            </span>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {integrityReport.verifiedReferences.map((ref, idx) => (
                <div key={idx} className="p-3.5 bg-white flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-700">{ref.code}</span>
                      <span className="font-bold text-slate-900">{ref.titleOrCompetency}</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">{ref.details}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] uppercase ${
                    ref.status === "valid"
                      ? "bg-emerald-100 text-emerald-800"
                      : ref.status === "changed"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}>
                    {ref.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Format Cetak Resmi (Print / PDF / DOCX) */}
      {activeTab === "print" && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 sm:p-12 space-y-8 text-slate-900 print:m-0 print:p-0 print:border-none">
          {/* Action buttons (hidden on print) */}
          <div className="flex items-center justify-between border-b pb-4 print:hidden">
            <span className="text-xs text-slate-500 font-semibold">
              Format Dokumen Resmi Modul Ajar Multigrade (Kop SDN Sedaeng II Tosari)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadDoc}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition border border-slate-300"
              >
                <Download className="w-4 h-4 text-purple-600" /> Ekspor Dokumen (.TXT / DOCX)
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition"
              >
                <Printer className="w-4 h-4" /> Cetak / Unduh PDF
              </button>
            </div>
          </div>

          {/* Kop Surat Resmi */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
            <h3 className="text-xs font-bold tracking-widest uppercase">PEMERINTAH KABUPATEN PASURUAN</h3>
            <h3 className="text-xs font-bold tracking-widest uppercase">DINAS PENDIDIKAN DAN KEBUDAYAAN</h3>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
              {data.school?.name || "SDN SEDAENG II TOSARI"}
            </h2>
            <p className="text-[11px] text-slate-600">
              {data.school?.address || "Dusun Sedaeng, Desa Sedaeng, Kec. Tosari, Kab. Pasuruan, Jawa Timur 67177"} &bull; NPSN: {data.school?.npsn || "20519070"}
            </p>
          </div>

          {/* Judul Dokumen */}
          <div className="text-center space-y-1">
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wider underline">
              MODUL AJAR KELAS RANGKAP (MULTIGRADE)
            </h1>
            <p className="text-xs font-bold uppercase text-slate-700">
              MATA PELAJARAN {data.subject?.name?.toUpperCase()} &bull; {data.plan.phase?.toUpperCase()} &bull; TAHUN AJARAN {data.plan.academicYear}
            </p>
          </div>

          {/* Identitas Modul */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p><strong className="w-36 inline-block">Satuan Pendidikan:</strong> {data.school?.name || "SDN Sedaeng II Tosari"}</p>
              <p><strong className="w-36 inline-block">Mata Pelajaran:</strong> {data.subject?.name}</p>
              <p><strong className="w-36 inline-block">Fase / Kelas:</strong> {data.plan.phase} (Kelas {data.grades.lowerGrade} &amp; {data.grades.higherGrade})</p>
            </div>
            <div>
              <p><strong className="w-36 inline-block">Tahun / Semester:</strong> {data.plan.academicYear} &bull; {data.plan.semester}</p>
              <p><strong className="w-36 inline-block">Alokasi Waktu:</strong> {data.plan.durationMinutes} Menit ({data.plan.allocatedHours} JP)</p>
              <p><strong className="w-36 inline-block">Guru Pengampu:</strong> {data.teacher?.name || "(Guru Kelas)"}</p>
            </div>
          </div>

          {/* Tujuan Pembelajaran Berjenjang */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider border-b border-slate-900 pb-1">
              A. Tujuan Pembelajaran Khusus per Jenjang Kelas:
            </h4>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="border border-slate-900 p-3 space-y-1">
                <strong>Kelas {data.grades.lowerGrade}:</strong>
                {data.plan.learningObjectives
                  .filter((lo) => lo.grade === data.grades.lowerGrade)
                  .map((lo, idx) => (
                    <p key={idx}><span className="font-mono font-bold">[{lo.tpCode}]</span> {lo.competency}</p>
                  ))}
              </div>
              <div className="border border-slate-900 p-3 space-y-1">
                <strong>Kelas {data.grades.higherGrade}:</strong>
                {data.plan.learningObjectives
                  .filter((lo) => lo.grade === data.grades.higherGrade)
                  .map((lo, idx) => (
                    <p key={idx}><span className="font-mono font-bold">[{lo.tpCode}]</span> {lo.competency}</p>
                  ))}
              </div>
            </div>
          </div>

          {/* Tabel Langkah Pembelajaran 8 Pola Rotasi */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider border-b border-slate-900 pb-1">
              B. Langkah-Langkah Pembelajaran (Rotasi Kelas Rangkap):
            </h4>
            <table className="w-full text-left text-[11px] border-collapse border border-slate-900">
              <thead className="bg-slate-100 font-bold border-b border-slate-900 text-center">
                <tr>
                  <th className="border border-slate-900 p-2 w-8">No</th>
                  <th className="border border-slate-900 p-2 w-28">Langkah / Menit</th>
                  <th className="border border-slate-900 p-2">Peran Guru &amp; Aktivitas Kelas {data.grades.lowerGrade}</th>
                  <th className="border border-slate-900 p-2">Aktivitas Kelas {data.grades.higherGrade}</th>
                </tr>
              </thead>
              <tbody>
                {teachingSteps.map((step) => (
                  <tr key={step.stepNumber}>
                    <td className="border border-slate-900 p-2 text-center font-bold">{step.stepNumber}</td>
                    <td className="border border-slate-900 p-2 font-semibold">
                      <div>{step.stepName}</div>
                      <div className="text-[10px] text-slate-600">({step.durationMinutes} Menit)</div>
                    </td>
                    <td className="border border-slate-900 p-2">
                      <div className="font-medium text-slate-800"><em>Guru:</em> {step.teacherRole}</div>
                      <div className="mt-1"><em>Siswa Kls {data.grades.lowerGrade}:</em> {step.lowerGradeActivity}</div>
                    </td>
                    <td className="border border-slate-900 p-2">
                      <div><em>Siswa Kls {data.grades.higherGrade}:</em> {step.higherGradeActivity}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tanda Tangan Pengesahan */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
            <div className="space-y-16">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala SDN Sedaeng II Tosari</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{data.school?.headmasterName || "Akhmad Shodikin, M.Pd"}</p>
                <p>NIP. {data.school?.headmasterNip || "198503182009031009"}</p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p>Tosari, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p className="font-bold">Guru Pengampu Kelas Rangkap</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{data.teacher?.name || "(Nama Guru Pengampu)"}</p>
                <p>NIP. {data.teacher?.nip || "......................................."}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
