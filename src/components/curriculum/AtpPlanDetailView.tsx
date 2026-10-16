"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitCommit,
  Layers,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Trash2,
  Printer,
  Edit3,
  Save,
  Check,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Users,
  ShieldCheck,
  ShieldAlert,
  Info,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  updateAtpPlanItemsAction,
} from "@/app/actions/atp-generator";
import {
  submitAtpForReviewAction,
  approveAtpWithReviewAction,
  rejectAtpAction,
  activateAtpForTeachingAction,
  runAtpValidationAction,
} from "@/app/actions/validation";

const PEDAGOGICAL_DISCLAIMER =
  "Hasil validasi otomatis hanya memverifikasi kelengkapan struktural, integritas referensi, dan konsistensi alur teknis. Kelayakan pedagogis, kedalaman materi, dan kesesuaian konteks kelas rangkap SDN SEDAENG II Tosari tetap memerlukan pertimbangan profesional pendidik dan persetujuan Kepala Sekolah.";

interface AtpPlanDetailViewProps {
  data: {
    plan: {
      id: string;
      title: string;
      subjectId: string;
      phase: string;
      groupId?: string | null;
      targetGrade?: number | null;
      semester: string;
      academicYear: string;
      totalHours: number;
      effectiveWeeks: number;
      status: string;
      version: number;
      description?: string | null;
      rejectionNotes?: string | null;
      authorId?: string | null;
      approvedById?: string | null;
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
    author?: {
      id: string;
      name: string;
      email: string;
      role: string;
    } | null;
    approver?: {
      id: string;
      name: string;
      email: string;
      role: string;
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
    items: Array<{
      id: string;
      tpId: string;
      sequenceOrder: number;
      allocatedHours: number;
      targetGrade: number;
      semester: string;
      startWeek: number;
      endWeek: number;
      monthName?: string | null;
      multigradeStrategy?: string | null;
      multigradeNotes?: string | null;
      pairedTpId?: string | null;
      tpCode: string;
      tpCompetency: string;
      tpContentScope: string;
      tpDescription: string;
      tpVerificationStatus: string;
      cpElement?: string | null;
    }>;
    lowerGradeItems: any[];
    higherGradeItems: any[];
    allTpsForPhase: any[];
    unscheduledTps: any[];
    protaEntries: any[];
    promesWeeksGanjil: any[];
    promesWeeksGenap: any[];
    promesEntries: any[];
  };
  currentUser: {
    id: string;
    name: string;
    role: string;
  } | null;
}

export function AtpPlanDetailView({ data, currentUser }: AtpPlanDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<
    "multigrade" | "lower_grade" | "higher_grade" | "prota" | "promes" | "coverage" | "print"
  >("multigrade");

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState(data.items);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canApprove = currentUser?.role === "admin" || currentUser?.role === "headmaster";
  const canEdit = currentUser?.role === "admin" || currentUser?.role === "headmaster" || currentUser?.role === "teacher";

  // Reorder Item
  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    // Recalculate sequence orders
    newItems.forEach((it, idx) => {
      it.sequenceOrder = idx + 1;
    });

    setItems(newItems);
  };

  // Update Item field
  const updateItemField = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Save manual editing
  const handleSaveEdits = () => {
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const res = await updateAtpPlanItemsAction(data.plan.id, {
        items: items.map((it) => ({
          tpId: it.tpId,
          sequenceOrder: it.sequenceOrder,
          allocatedHours: Number(it.allocatedHours),
          targetGrade: it.targetGrade,
          semester: it.semester as "Ganjil" | "Genap",
          startWeek: Number(it.startWeek),
          endWeek: Number(it.endWeek),
          monthName: it.monthName || "Juli",
          multigradeStrategy: it.multigradeStrategy as any,
          multigradeNotes: it.multigradeNotes || undefined,
          pairedTpId: it.pairedTpId || undefined,
        })),
      });

      if (res.success) {
        setActionSuccess("Perubahan alur ATP berhasil disimpan!");
        setIsEditing(false);
        router.refresh();
      } else {
        setActionError(res.error);
      }
    });
  };

  // Handle Lifecycle actions
  const handleLifecycleAction = (actionType: "submit" | "approve" | "reject" | "activate" | "validate") => {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      if (actionType === "submit") {
        const res = await submitAtpForReviewAction(data.plan.id);
        if (res.success) {
          setActionSuccess("Rencana ATP berhasil diajukan untuk tinjauan Kepala Sekolah.");
          router.refresh();
        } else {
          setActionError(res.error);
        }
      } else if (actionType === "approve") {
        const res = await approveAtpWithReviewAction(data.plan.id, "Disetujui setelah verifikasi alur kurikulum multigrade.");
        if (res.success) {
          setActionSuccess("Rencana ATP berhasil disetujui!");
          router.refresh();
        } else {
          setActionError(res.error);
        }
      } else if (actionType === "reject") {
        if (!rejectionNotes.trim()) {
          setActionError("Wajib menyertakan alasan penolakan!");
          return;
        }
        const res = await rejectAtpAction(data.plan.id, rejectionNotes);
        if (res.success) {
          setActionSuccess("Rencana ATP telah ditolak dan dikembalikan sebagai draf perbaikan.");
          router.refresh();
        } else {
          setActionError(res.error);
        }
      } else if (actionType === "activate") {
        const res = await activateAtpForTeachingAction(data.plan.id);
        if (res.success) {
          setActionSuccess("Rencana ATP resmi aktif digunakan dalam pembelajaran!");
          router.refresh();
        } else {
          setActionError(res.error);
        }
      } else if (actionType === "validate") {
        const res = await runAtpValidationAction(data.plan.id);
        if (res.success) {
          setActionSuccess("Validasi teknis selesai dijalankan.");
          router.refresh();
        } else {
          setActionError(res.error);
        }
      }
    });
  };

  // Hitung total jam terpasang
  const currentTotalHours = items.reduce((sum, it) => sum + Number(it.allocatedHours), 0);

  // Periksa apakah ada TP berstatus Draf dalam rencana ini
  const draftTpCount = items.filter((it) => it.tpVerificationStatus === "draft").length;

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">&times;</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900 font-bold">&times;</button>
        </div>
      )}

      {/* Warning jika ada TP berstatus draf */}
      {draftTpCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-amber-800">
              Peringatan Kurikulum: Terdapat {draftTpCount} TP Berstatus Draf!
            </span>
            <p>
              Rencana ATP ini memuat butir Tujuan Pembelajaran yang belum diverifikasi secara resmi. Sesuai aturan Kurikulum Merdeka Tosari, ATP final tidak boleh disahkan untuk kegiatan pembelajaran sebelum seluruh TP terverifikasi.
            </p>
          </div>
        </div>
      )}

      {/* Pedagogical disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-900">Kaidah Pedagogis Kelas Rangkap Tosari:</strong> {PEDAGOGICAL_DISCLAIMER}
        </p>
      </div>

      {/* Main Header & Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                data.plan.status === "in_use"
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : data.plan.status === "approved"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : data.plan.status === "in_review"
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : data.plan.status === "rejected"
                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                  : "bg-slate-100 text-slate-700 border border-slate-300"
              }`}
            >
              {data.plan.status === "in_use"
                ? "DIGUNAKAN (AKTIF)"
                : data.plan.status === "approved"
                ? "DISETUJUI KEPALA SEKOLAH"
                : data.plan.status === "in_review"
                ? "DITINJAU"
                : data.plan.status === "rejected"
                ? "DITOLAK (PERBAIKAN)"
                : "DRAF GURU"}
            </span>
            <span className="text-xs px-2.5 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-bold">
              Versi {data.plan.version}
            </span>
            <span className="text-xs px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-md font-bold">
              {data.plan.phase}
            </span>
            {data.group && (
              <span className="text-xs px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-md font-bold">
                {data.group.name} (Kelas {data.group.grades})
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {data.plan.title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
            <span>Mata Pelajaran: <strong className="text-slate-800">{data.subject?.name || data.plan.subjectId}</strong></span>
            <span>&bull;</span>
            <span>Tahun Ajaran: <strong className="text-slate-800">{data.plan.academicYear}</strong></span>
            <span>&bull;</span>
            <span>Semester: <strong className="text-slate-800">{data.plan.semester}</strong></span>
            <span>&bull;</span>
            <span>Penyusun: <strong className="text-slate-800">{data.author?.name || "Guru Pengampu"}</strong></span>
            {data.approver && (
              <>
                <span>&bull;</span>
                <span>Disetujui Oleh: <strong className="text-emerald-700">{data.approver.name}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons & Workflow */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Edit Mode */}
          {canEdit && (data.plan.status === "draft" || data.plan.status === "rejected") && (
            <>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition border border-slate-300"
                >
                  <Edit3 className="w-4 h-4 text-blue-600" /> Sunting Urutan / JP
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
                    onClick={() => {
                      setItems(data.items);
                      setIsEditing(false);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                  >
                    Batal
                  </button>
                </div>
              )}
            </>
          )}

          {/* Validation Re-check */}
          <button
            onClick={() => handleLifecycleAction("validate")}
            disabled={isPending}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition border border-slate-300"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Uji Validasi
          </button>

          {/* Submit for Review */}
          {(data.plan.status === "draft" || data.plan.status === "rejected") && !isEditing && (
            <button
              onClick={() => handleLifecycleAction("submit")}
              disabled={isPending}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm"
            >
              <Clock className="w-4 h-4" /> Ajukan Tinjauan
            </button>
          )}

          {/* Approve & Reject for Headmaster / Admin */}
          {canApprove && (data.plan.status === "in_review" || data.plan.status === "draft") && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLifecycleAction("approve")}
                disabled={isPending}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm"
              >
                <Check className="w-4 h-4" /> Setujui ATP
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Alasan penolakan..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-rose-300 rounded-lg bg-white text-slate-800 w-36"
                />
                <button
                  onClick={() => handleLifecycleAction("reject")}
                  disabled={isPending}
                  className="px-2.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Tolak
                </button>
              </div>
            </div>
          )}

          {/* Activate for Teaching */}
          {data.plan.status === "approved" && (
            <button
              onClick={() => handleLifecycleAction("activate")}
              disabled={isPending}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm"
            >
              <Play className="w-4 h-4" /> Terapkan untuk Pembelajaran
            </button>
          )}

          {/* Document Print/Export View Button */}
          <button
            onClick={() => setActiveTab("print")}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak / Ekspor Dokumen
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Jam Terpasang</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{currentTotalHours} JP</span>
            <span className="text-xs text-slate-500 font-medium">/ {data.plan.totalHours} Target</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Butir Alur TP</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600">{items.length} TP</span>
            <span className="text-xs text-slate-500 font-medium">terjadwal</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase block">TP Belum Terjadwal</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-black ${data.unscheduledTps.length > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {data.unscheduledTps.length} TP
            </span>
            <span className="text-xs text-slate-500 font-medium">di fase ini</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Pekan Efektif</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-600">{data.plan.effectiveWeeks} Pekan</span>
            <span className="text-xs text-slate-500 font-medium">TA {data.plan.academicYear}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-1 p-1.5 bg-slate-200/80 rounded-2xl text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab("multigrade")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "multigrade"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Layers className="w-4 h-4 text-amber-600" /> Alur Master Multigrade
        </button>

        <button
          onClick={() => setActiveTab("lower_grade")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "lower_grade"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-600" /> Kelas {data.grades.lowerGrade} (Bawah)
        </button>

        <button
          onClick={() => setActiveTab("higher_grade")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "higher_grade"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-600" /> Kelas {data.grades.higherGrade} (Atas)
        </button>

        <button
          onClick={() => setActiveTab("prota")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "prota"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-purple-600" /> Program Tahunan (Prota)
        </button>

        <button
          onClick={() => setActiveTab("promes")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "promes"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-600" /> Program Semester (Promes)
        </button>

        <button
          onClick={() => setActiveTab("coverage")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "coverage"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-rose-600" /> Peta Cakupan TP ({data.unscheduledTps.length} Belum)
        </button>

        <button
          onClick={() => setActiveTab("print")}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === "print"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Printer className="w-4 h-4 text-slate-900" /> Format Cetak Resmi
        </button>
      </div>

      {/* Tab 1: Alur Master Multigrade */}
      {activeTab === "multigrade" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Alur Pembelajaran Master Multigrade (Sinkronisasi Kelas Rangkap)
              </h3>
              <p className="text-xs text-slate-500">
                Menyajikan pengurutan TP kelas {data.grades.lowerGrade} dan kelas {data.grades.higherGrade} secara berdampingan dengan strategi pembelajaran kelas rangkap
              </p>
            </div>
            {isEditing && (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                Mode Penyuntingan Aktif
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-100/80 text-[11px] uppercase tracking-wider text-slate-600 border-b border-slate-200 font-extrabold">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">Urutan</th>
                  <th className="py-3 px-3 w-28">Pekan / Bulan</th>
                  <th className="py-3 px-3 w-24">Kelas &amp; Smt</th>
                  <th className="py-3 px-4">Tujuan Pembelajaran (TP)</th>
                  <th className="py-3 px-3 w-28">Strategi Rangkap</th>
                  <th className="py-3 px-4">Catatan Manajemen Kelas Rangkap</th>
                  <th className="py-3 px-3 w-20 text-center">Alokasi</th>
                  {isEditing && <th className="py-3 px-3 w-24 text-center">Aksi Urutan</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-center font-black text-slate-500">
                      {it.sequenceOrder}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 block">{it.monthName || "Juli"}</span>
                      <span className="text-[11px] text-slate-500">Mg {it.startWeek} - {it.endWeek}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold block w-fit mb-1 ${
                        it.targetGrade === data.grades.lowerGrade
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}>
                        Kelas {it.targetGrade}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 uppercase">{it.semester}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-purple-700">{it.tpCode}</span>
                        <span className="font-bold text-slate-900">{it.tpCompetency}</span>
                        {it.tpVerificationStatus === "draft" && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            Draf
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{it.tpDescription}</p>
                    </td>
                    <td className="py-3 px-3">
                      {isEditing ? (
                        <select
                          value={it.multigradeStrategy || "terpadu_sebagian"}
                          onChange={(e) => updateItemField(idx, "multigradeStrategy", e.target.value)}
                          className="w-full text-xs p-1 border rounded bg-white"
                        >
                          <option value="terpadu_sebagian">Terpadu Sebagian</option>
                          <option value="terpisah_paralel">Terpisah Paralel</option>
                          <option value="terpadu_penuh">Terpadu Penuh</option>
                          <option value="mandiri">Mandiri / Tugas</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          it.multigradeStrategy === "terpadu_penuh"
                            ? "bg-purple-100 text-purple-800"
                            : it.multigradeStrategy === "terpadu_sebagian"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {it.multigradeStrategy?.replace("_", " ") || "Terpadu Sebagian"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={it.multigradeNotes || ""}
                          onChange={(e) => updateItemField(idx, "multigradeNotes", e.target.value)}
                          placeholder="Catatan aktivitas bersama vs mandiri..."
                          className="w-full text-xs p-1.5 border rounded bg-white text-slate-800"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-600 italic">
                          {it.multigradeNotes || "Aktivitas pembuka bersama, dilanjutkan tugas terdeferensiasi per kelas."}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={it.allocatedHours}
                          onChange={(e) => updateItemField(idx, "allocatedHours", e.target.value)}
                          className="w-16 text-center text-xs p-1 border rounded bg-white font-bold"
                        />
                      ) : (
                        <span className="font-black text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          {it.allocatedHours} JP
                        </span>
                      )}
                    </td>
                    {isEditing && (
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem(idx, "up")}
                            disabled={idx === 0}
                            className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(idx, "down")}
                            disabled={idx === items.length - 1}
                            className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Alur Kelas Bawah */}
      {activeTab === "lower_grade" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Alur Tujuan Pembelajaran Khusus Kelas {data.grades.lowerGrade}
              </h3>
              <p className="text-xs text-slate-500">
                Fokus kompetensi berjenjang untuk peserta didik kelas {data.grades.lowerGrade}
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs">
              {data.lowerGradeItems.length} Tujuan Pembelajaran
            </span>
          </div>

          <div className="space-y-3">
            {data.lowerGradeItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada TP untuk kelas ini.</p>
            ) : (
              data.lowerGradeItems.map((it, idx) => (
                <div key={it.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-purple-700">{it.tpCode}</span>
                        <span className="font-bold text-slate-900">{it.tpCompetency}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                          {it.semester}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{it.tpDescription}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 font-black text-amber-700">
                      {it.allocatedHours} JP
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Alur Kelas Atas */}
      {activeTab === "higher_grade" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Alur Tujuan Pembelajaran Khusus Kelas {data.grades.higherGrade}
              </h3>
              <p className="text-xs text-slate-500">
                Fokus kompetensi berjenjang untuk peserta didik kelas {data.grades.higherGrade}
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-bold text-xs">
              {data.higherGradeItems.length} Tujuan Pembelajaran
            </span>
          </div>

          <div className="space-y-3">
            {data.higherGradeItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada TP untuk kelas ini.</p>
            ) : (
              data.higherGradeItems.map((it, idx) => (
                <div key={it.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-purple-700">{it.tpCode}</span>
                        <span className="font-bold text-slate-900">{it.tpCompetency}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                          {it.semester}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{it.tpDescription}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 font-black text-amber-700">
                      {it.allocatedHours} JP
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Program Tahunan (Prota) */}
      {activeTab === "prota" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Program Tahunan (Prota) Kurikulum Merdeka
              </h3>
              <p className="text-xs text-slate-500">
                SDN SEDAENG II TOSARI &bull; Tahun Ajaran {data.plan.academicYear}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-[11px] font-bold uppercase text-slate-600 border-b">
                <tr>
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-3 w-24">Semester</th>
                  <th className="py-3 px-3 w-20">Kelas</th>
                  <th className="py-3 px-4 w-40">Elemen / Konten</th>
                  <th className="py-3 px-3 w-24">Kode TP</th>
                  <th className="py-3 px-4">Kompetensi yang Dicapai</th>
                  <th className="py-3 px-3 text-center w-20">Alokasi Waktu</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.protaEntries.map((pe) => (
                  <tr key={pe.no} className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-bold text-slate-500">{pe.no}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{pe.semester}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        Kelas {pe.grade}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{pe.element}</td>
                    <td className="py-3 px-3 font-mono font-bold text-purple-700">{pe.tpCode}</td>
                    <td className="py-3 px-4 text-slate-700">{pe.competency}</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-600">{pe.allocatedHours} JP</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{pe.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Program Semester (Promes) */}
      {activeTab === "promes" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Program Semester (Promes) dengan Matriks Pekan Efektif
              </h3>
              <p className="text-xs text-slate-500">
                Penyebaran jam tatap muka per pekan (18 Pekan Efektif, Sumatif Tengah Semester / Akhir Semester)
              </p>
            </div>
          </div>

          {/* Matriks Semester Ganjil */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Semester Ganjil (Juli - Desember)
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center" rowSpan={2}>No</th>
                    <th className="py-2.5 px-3 w-20" rowSpan={2}>Kode TP</th>
                    <th className="py-2.5 px-3" rowSpan={2}>Kompetensi Dasar</th>
                    <th className="py-2.5 px-2 w-14 text-center" rowSpan={2}>Kls</th>
                    <th className="py-2.5 px-2 w-14 text-center" rowSpan={2}>JP</th>
                    <th className="py-1 px-2 text-center bg-slate-200" colSpan={18}>
                      Pekan Efektif Semester Ganjil (18 Pekan)
                    </th>
                  </tr>
                  <tr className="bg-slate-50 text-[10px] text-center border-t border-slate-200">
                    {data.promesWeeksGanjil.map((w: any) => (
                      <th
                        key={w.globalWeekNumber}
                        className={`p-1 w-6 font-semibold border-r ${
                          w.isAssessmentWeek ? "bg-amber-100 text-amber-900 font-black" : ""
                        }`}
                        title={`${w.month} - ${w.label}`}
                      >
                        {w.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.promesEntries.map((pe: any) => (
                    <tr key={pe.no} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center font-bold text-slate-400">{pe.no}</td>
                      <td className="py-2 px-3 font-mono font-bold text-purple-700">{pe.tpCode}</td>
                      <td className="py-2 px-3 text-slate-800">{pe.competency}</td>
                      <td className="py-2 px-2 text-center font-bold text-slate-600">{pe.grade}</td>
                      <td className="py-2 px-2 text-center font-black text-amber-600">{pe.allocatedHours}</td>
                      {data.promesWeeksGanjil.map((w: any) => {
                        const val = pe.weeklyDistribution[w.globalWeekNumber];
                        return (
                          <td
                            key={w.globalWeekNumber}
                            className={`p-1 text-center font-bold border-r text-[10px] ${
                              w.isAssessmentWeek
                                ? "bg-amber-50 text-amber-900"
                                : val
                                ? "bg-blue-100 text-blue-900"
                                : "text-slate-300"
                            }`}
                          >
                            {w.isAssessmentWeek ? "•" : val || ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Peta Cakupan TP & Audit Prasyarat */}
      {activeTab === "coverage" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Peta Cakupan Tujuan Pembelajaran (Coverage Map) &amp; Prasyarat
              </h3>
              <p className="text-xs text-slate-500">
                Memastikan tidak ada kompetensi inti dalam {data.plan.phase} yang tertinggal atau belum terjadwal
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs">
                {items.length} Terjadwal
              </span>
              <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                data.unscheduledTps.length > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
              }`}>
                {data.unscheduledTps.length} Belum Terjadwal
              </span>
            </div>
          </div>

          {/* Daftar TP yang Belum Terjadwal */}
          {data.unscheduledTps.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>TP yang Belum Masuk ke Alur Rencana ({data.unscheduledTps.length} Butir):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {data.unscheduledTps.map((utp: any) => (
                  <div key={utp.id} className="p-3 bg-white rounded-lg border border-rose-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-purple-700">{utp.code}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        Kelas {utp.targetGrade}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800">{utp.competency}</p>
                    <p className="text-slate-500 text-[11px] line-clamp-2">{utp.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Semua TP dalam Fase */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Status Seluruh Tujuan Pembelajaran Fase {data.plan.phase}:
            </h4>
            <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden text-xs">
              {data.allTpsForPhase.map((tp: any) => {
                const isScheduled = items.some((it) => it.tpId === tp.id);
                return (
                  <div key={tp.id} className="p-3.5 bg-white flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                        isScheduled ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {isScheduled ? "✓" : "!"}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-purple-700">{tp.code}</span>
                          <span className="font-bold text-slate-800">{tp.competency}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600">
                            Kelas {tp.targetGrade}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">{tp.description}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded font-bold text-[10px] shrink-0 ${
                      isScheduled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      {isScheduled ? "Terjadwal" : "Belum Dijadwalkan"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Format Cetak Resmi (Print/Export View) */}
      {activeTab === "print" && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 sm:p-12 space-y-8 text-slate-900 print:m-0 print:p-0 print:border-none">
          {/* Action buttons (hidden when printed) */}
          <div className="flex items-center justify-between border-b pb-4 print:hidden">
            <span className="text-xs text-slate-500 font-semibold">
              Pratinjau Dokumen Cetak Resmi Kurikulum Merdeka (Kop SDN Sedaeng II Tosari)
            </span>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition"
            >
              <Printer className="w-4 h-4" /> Cetak Sekarang (PDF / Kertas)
            </button>
          </div>

          {/* Kop Dokumen Resmi */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
            <h3 className="text-xs font-bold tracking-widest uppercase">PEMERINTAH KABUPATEN PASURUAN</h3>
            <h3 className="text-xs font-bold tracking-widest uppercase">DINAS PENDIDIKAN DAN KEBUDAYAAN</h3>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
              {data.school?.name || "SDN SEDAENG II TOSARI"}
            </h2>
            <p className="text-[11px] text-slate-600">
              {data.school?.address || "Desa Sedaeng, Kecamatan Tosari, Kabupaten Pasuruan, Jawa Timur"} &bull; NPSN: {data.school?.npsn || "20519315"}
            </p>
          </div>

          {/* Judul Dokumen */}
          <div className="text-center space-y-1">
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wider underline">
              ALUR TUJUAN PEMBELAJARAN (ATP) KELAS RANGKAP (MULTIGRADE)
            </h1>
            <p className="text-xs font-bold uppercase text-slate-700">
              MATA PELAJARAN {data.subject?.name?.toUpperCase()} &bull; {data.plan.phase?.toUpperCase()} &bull; TAHUN AJARAN {data.plan.academicYear}
            </p>
          </div>

          {/* Metadata Tabel */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p><strong className="w-32 inline-block">Satuan Pendidikan:</strong> {data.school?.name || "SDN Sedaeng II"}</p>
              <p><strong className="w-32 inline-block">Mata Pelajaran:</strong> {data.subject?.name}</p>
              <p><strong className="w-32 inline-block">Fase / Kelas:</strong> {data.plan.phase} (Kelas {data.grades.lowerGrade} &amp; {data.grades.higherGrade})</p>
            </div>
            <div>
              <p><strong className="w-32 inline-block">Tahun Pelajaran:</strong> {data.plan.academicYear}</p>
              <p><strong className="w-32 inline-block">Total Alokasi Waktu:</strong> {currentTotalHours} Jam Pelajaran (JP)</p>
              <p><strong className="w-32 inline-block">Penyusun:</strong> {data.author?.name || "Guru Kelas"}</p>
            </div>
          </div>

          {/* Tabel Alur Resmi */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse border border-slate-900">
              <thead className="bg-slate-100 font-bold border-b border-slate-900 text-center">
                <tr>
                  <th className="border border-slate-900 p-2 w-10">No</th>
                  <th className="border border-slate-900 p-2 w-16">Kelas</th>
                  <th className="border border-slate-900 p-2 w-16">Smt</th>
                  <th className="border border-slate-900 p-2 w-20">Kode TP</th>
                  <th className="border border-slate-900 p-2">Tujuan Pembelajaran (TP)</th>
                  <th className="border border-slate-900 p-2 w-28">Strategi Rangkap</th>
                  <th className="border border-slate-900 p-2 w-14">Alokasi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="border border-slate-900 p-2 text-center font-bold">{it.sequenceOrder}</td>
                    <td className="border border-slate-900 p-2 text-center font-semibold">Kelas {it.targetGrade}</td>
                    <td className="border border-slate-900 p-2 text-center uppercase">{it.semester}</td>
                    <td className="border border-slate-900 p-2 font-mono font-bold">{it.tpCode}</td>
                    <td className="border border-slate-900 p-2">
                      <div className="font-bold">{it.tpCompetency}</div>
                      <div className="text-slate-600 text-[10px] mt-0.5">{it.tpDescription}</div>
                    </td>
                    <td className="border border-slate-900 p-2 capitalize text-center">
                      {it.multigradeStrategy?.replace("_", " ")}
                    </td>
                    <td className="border border-slate-900 p-2 text-center font-bold">{it.allocatedHours} JP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tanda Tangan Pengesahan Resmi */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
            <div className="space-y-16">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala SDN Sedaeng II Tosari</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{data.school?.headmasterName || "(Nama Kepala Sekolah)"}</p>
                <p>NIP. {data.school?.headmasterNip || "......................................."}</p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p>Tosari, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p className="font-bold">Guru Pengampu Kelas Rangkap</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{data.author?.name || "(Nama Guru Pengampu)"}</p>
                <p>NIP. .......................................</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
