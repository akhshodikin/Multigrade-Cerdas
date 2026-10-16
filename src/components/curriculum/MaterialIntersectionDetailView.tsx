"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Cpu,
  ArrowLeft,
  Edit3,
  Check,
  X,
  Printer,
  Trash2,
  ShieldCheck,
  BookOpen,
  Split,
  ChevronRight,
  Info,
  Loader2,
} from "lucide-react";
import { CurrentUser } from "@/lib/auth/session";
import { IntersectionMappingResult } from "@/lib/ai/types";
import {
  updateMaterialIntersectionAction,
  reviewMaterialIntersectionAction,
  approveMaterialIntersectionAction,
  rejectMaterialIntersectionAction,
  deleteMaterialIntersectionAction,
  getMaterialIntersectionByIdAction,
} from "@/app/actions/material-intersection";

interface MaterialIntersectionDetailProps {
  mapData: NonNullable<Awaited<ReturnType<typeof getMaterialIntersectionByIdAction>>>;
  currentUser: CurrentUser;
}

export function MaterialIntersectionDetailView({
  mapData,
  currentUser,
}: MaterialIntersectionDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active section tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "side_by_side" | "activities" | "differentiation"
  >("overview");

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTheme, setEditTheme] = useState(mapData.sharedTheme);
  const [editStrategy, setEditStrategy] = useState(mapData.mappingStrategy);
  const [editTeacherNotes, setEditTeacherNotes] = useState(mapData.teacherNotes || "");
  const [editStudentConditions, setEditStudentConditions] = useState(
    mapData.studentConditions || ""
  );

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Status and feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const canApprove =
    currentUser.role === "admin" ||
    currentUser.role === "headmaster" ||
    currentUser.role === "teacher";

  const data = mapData.structuredOutput;

  // Save Edit Handler
  const handleSaveEdit = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateMaterialIntersectionAction(mapData.id, {
        sharedTheme: editTheme,
        mappingStrategy: editStrategy,
        teacherNotes: editTeacherNotes.trim() || undefined,
        studentConditions: editStudentConditions.trim() || undefined,
      });

      if (res.success) {
        setIsEditing(false);
        setFeedback({ type: "success", text: "Perubahan berhasil disimpan." });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error });
      }
    });
  };

  // Review Handler
  const handleReview = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await reviewMaterialIntersectionAction(
        mapData.id,
        editTeacherNotes || "Telah ditinjau dan disesuaikan oleh guru pengampu."
      );
      if (res.success) {
        setFeedback({ type: "success", text: "Status diperbarui menjadi Ditinjau." });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error });
      }
    });
  };

  // Approve Handler
  const handleApprove = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await approveMaterialIntersectionAction(mapData.id);
      if (res.success) {
        setFeedback({
          type: "success",
          text: "Pemetaan materi telah disetujui untuk pelaksanaan kelas.",
        });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error });
      }
    });
  };

  // Reject Handler
  const handleReject = () => {
    if (!rejectionReason.trim()) {
      setFeedback({ type: "error", text: "Alasan penolakan / koreksi wajib diisi." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await rejectMaterialIntersectionAction(mapData.id, rejectionReason);
      if (res.success) {
        setShowRejectModal(false);
        setFeedback({ type: "success", text: "Pemetaan materi dikembalikan untuk perbaikan." });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error });
      }
    });
  };

  // Delete Handler
  const handleDelete = () => {
    if (
      !confirm(
        "Apakah Anda yakin ingin menghapus pemetaan irisan materi ini? Tindakan tidak dapat dibatalkan."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteMaterialIntersectionAction(mapData.id);
      if (res.success) {
        router.push("/dashboard/kurikulum/irisan-materi");
      } else {
        setFeedback({ type: "error", text: res.error });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/dashboard/kurikulum/irisan-materi"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Pemetaan</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Panduan</span>
          </button>

          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Pemetaan</span>
            </button>
          )}

          {mapData.status === "draft" && (
            <button
              type="button"
              onClick={handleReview}
              disabled={isPending}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <Clock className="w-4 h-4" />
              <span>Tandai Ditinjau</span>
            </button>
          )}

          {canApprove && mapData.status !== "approved" && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Setujui Pemetaan</span>
            </button>
          )}

          {canApprove && mapData.status !== "rejected" && (
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              disabled={isPending}
              className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1"
            >
              <XCircle className="w-4 h-4" />
              <span>Koreksi</span>
            </button>
          )}

          {mapData.status !== "approved" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Hapus Pemetaan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span className="font-semibold">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rejection Alert if rejected */}
      {mapData.status === "rejected" && mapData.rejectionReason && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>Catatan Revisi / Penolakan:</span>
          </div>
          <p className="text-rose-800">{mapData.rejectionReason}</p>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700">
              {mapData.group?.name || "Kelompok Multigrade"} &bull; Kelas {mapData.group?.grades} (
              {mapData.group?.phase})
            </span>
            <span className="text-xs font-bold text-slate-500">
              {mapData.subject?.name} &bull; {mapData.academicYear} ({mapData.semester}) &bull;{" "}
              {mapData.durationMinutes} Menit
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badge */}
            {mapData.status === "approved" && (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Disetujui Sah
              </span>
            )}
            {mapData.status === "reviewed" && (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                <Clock className="w-3.5 h-3.5" />
                Telah Ditinjau
              </span>
            )}
            {mapData.status === "draft" && (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                Draf v{mapData.version}
              </span>
            )}
            {mapData.status === "rejected" && (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                <XCircle className="w-3.5 h-3.5" />
                Perlu Revisi
              </span>
            )}
          </div>
        </div>

        {/* Edit Form or Display Header */}
        {isEditing ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-indigo-600" />
              <span>Sunting Informasi Pemetaan</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tema / Topik Bersama
              </label>
              <input
                type="text"
                value={editTheme}
                onChange={(e) => setEditTheme(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Strategi Multigrade
                </label>
                <select
                  value={editStrategy}
                  onChange={(e) =>
                    setEditStrategy(
                      e.target.value as "terpadu_sebagian" | "terpisah_paralel" | "terpadu_penuh"
                    )
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
                >
                  <option value="terpadu_sebagian">Terpadu Sebagian</option>
                  <option value="terpisah_paralel">Terpisah Paralel (Rotasi Berjenjang)</option>
                  <option value="terpadu_penuh">Terpadu Penuh</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan Guru
                </label>
                <input
                  type="text"
                  value={editTeacherNotes}
                  onChange={(e) => setEditTeacherNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  placeholder="Catatan diferensiasi atau pengkondisian kelas..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isPending}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {mapData.sharedTheme}
            </h1>

            {/* Strategy Pill */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {mapData.mappingStrategy === "terpisah_paralel" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-extrabold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Strategi: Terpisah Paralel (Staggered Rotation &bull; Materi Berbeda)</span>
                </div>
              )}
              {mapData.mappingStrategy === "terpadu_sebagian" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-extrabold">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Strategi: Terpadu Sebagian (Tema Bersama, Diferensiasi Peran)</span>
                </div>
              )}
              {mapData.mappingStrategy === "terpadu_penuh" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-extrabold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Strategi: Terpadu Penuh (Fokus Konsep Esensial Bersama)</span>
                </div>
              )}

              <span className="text-xs text-slate-500 font-medium ml-1">
                {data.strategyRationale}
              </span>
            </div>
          </div>
        )}

        {/* Student Context Note */}
        {mapData.studentConditions && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Kondisi Siswa &amp; Konteks Lingkungan: </span>
              <span>{mapData.studentConditions}</span>
            </div>
          </div>
        )}

        {/* Confidence & AI Engine Banner */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-500" />
            <span>
              Mesin: <strong>{mapData.aiModel}</strong> ({mapData.aiProvider})
            </span>
            <span>&bull;</span>
            <span>
              Tingkat Keyakinan:{" "}
              <strong className="text-slate-800">
                {mapData.confidenceScore}% ({mapData.confidenceLevel})
              </strong>
            </span>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            * {mapData.confidenceDisclaimer}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: "overview", label: "Ringkasan Irisan & Diferensiasi", icon: Layers },
          { id: "side_by_side", label: "Komparasi TP Sumber", icon: BookOpen },
          { id: "activities", label: "Alur Pembelajaran Rangkap", icon: Clock },
          { id: "differentiation", label: "Rubrik Asesmen", icon: ShieldCheck },
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

      {/* TAB 1: OVERVIEW (TP Terpadu vs TP Terpisah) */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Merged TPs Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      TP yang Dapat Dipadukan
                    </h2>
                    <div className="text-[11px] text-slate-400">
                      {data.mergedTps.length} Pasang Materi Terpadu
                    </div>
                  </div>
                </div>
              </div>

              {data.mergedTps.length === 0 ? (
                <div className="p-6 rounded-2xl bg-amber-50/50 border border-dashed border-amber-200 text-center text-xs text-amber-800 space-y-1">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto" />
                  <div className="font-bold">Tidak Ada TP yang Dipaksakan Melebur</div>
                  <div className="text-[11px]">
                    Kompetensi memiliki tingkat kesulitan atau konsep yang berbeda nyata. Direkomendasikan
                    pembelajaran terpisah paralel dalam satu ruangan kelas rangkap.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.mergedTps.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-200 text-xs space-y-2"
                    >
                      <div className="font-bold text-emerald-950 text-sm">{m.title}</div>
                      <div>
                        <span className="font-semibold text-slate-700">Konsep Inti Bersama: </span>
                        <span className="text-slate-900">{m.sharedCoreConcept}</span>
                      </div>
                      <div className="text-slate-600 italic">"{m.rationale}"</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Separate TPs Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                    <Split className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      TP yang Harus Diajarkan Terpisah
                    </h2>
                    <div className="text-[11px] text-slate-400">
                      {data.separateTps.length} Butir Materi Terpisah Paralel
                    </div>
                  </div>
                </div>
              </div>

              {data.separateTps.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  Seluruh materi memiliki irisan kuat dan dapat dipadukan dalam sesi ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.separateTps.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-amber-900">Kelas {s.grade}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          Kegiatan Mandiri / Bimbingan
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Alasan Pemisahan: </span>
                        <span className="text-slate-800">{s.reasonForSeparation}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-amber-100 text-[11px] text-slate-700">
                        <strong>Rekomendasi Aktivitas Solo:</strong> {s.suggestedSoloActivity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Differentiated Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Diferensiasi Pembelajaran (Konten, Proses, &amp; Produk)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2 text-xs">
                <div className="font-extrabold text-blue-900">Kelas Tingkatan Rendah</div>
                <div>
                  <strong>Konten:</strong> {data.differentiatedOutcomes.lowerGrade.content}
                </div>
                <div>
                  <strong>Proses:</strong> {data.differentiatedOutcomes.lowerGrade.process}
                </div>
                <div>
                  <strong>Produk:</strong> {data.differentiatedOutcomes.lowerGrade.product}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2 text-xs">
                <div className="font-extrabold text-purple-900">Kelas Tingkatan Tinggi</div>
                <div>
                  <strong>Konten:</strong> {data.differentiatedOutcomes.higherGrade.content}
                </div>
                <div>
                  <strong>Proses:</strong> {data.differentiatedOutcomes.higherGrade.process}
                </div>
                <div>
                  <strong>Produk:</strong> {data.differentiatedOutcomes.higherGrade.product}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SIDE BY SIDE COMPARISON */}
      {activeTab === "side_by_side" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Perbandingan Berdampingan Tujuan Pembelajaran (Side-by-Side)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hubungan konseptual setiap TP sumber antar kelas untuk memandu penyusunan aktivitas.
            </p>
          </div>

          <div className="space-y-4">
            {data.sourceTpsSideBySide.map((comp, idx) => {
              const isStrong = comp.relationship === "irisan_kuat";
              const isWeak = comp.relationship === "irisan_lemah";
              const isNone = comp.relationship === "tidak_beririsan";

              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Pasangan TP #{idx + 1}</span>

                    {/* Relationship Badge */}
                    {isStrong && (
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Irisan Kuat (Dapat Digabung)
                      </span>
                    )}
                    {isWeak && (
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                        Irisan Lemah (Perlu Penyesuaian)
                      </span>
                    )}
                    {isNone && (
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                        Tidak Beririsan (Terpisah Paralel)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Lower Grade Card */}
                    <div className="p-4 rounded-xl bg-white border border-blue-200 text-xs space-y-1">
                      <div className="text-[10px] font-bold text-blue-600 uppercase">
                        Kelas {comp.lowerGradeTp.grade} &bull; {comp.lowerGradeTp.code}
                      </div>
                      <div className="font-bold text-slate-900">{comp.lowerGradeTp.competency}</div>
                      <div className="text-slate-600">{comp.lowerGradeTp.description}</div>
                    </div>

                    {/* Higher Grade Card */}
                    <div className="p-4 rounded-xl bg-white border border-purple-200 text-xs space-y-1">
                      <div className="text-[10px] font-bold text-purple-600 uppercase">
                        Kelas {comp.higherGradeTp.grade} &bull; {comp.higherGradeTp.code}
                      </div>
                      <div className="font-bold text-slate-900">
                        {comp.higherGradeTp.competency}
                      </div>
                      <div className="text-slate-600">{comp.higherGradeTp.description}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                    <strong>Catatan Hubungan:</strong> {comp.relationshipNote}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ALUR PEMBELAJARAN RANGKAP (CLASSROOM ROTATION) */}
      {activeTab === "activities" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Alur Manajemen Kelas Rangkap (Multigrade Classroom Rotation)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Jadwal pelaksanaan pembelajaran bergiliran ({mapData.durationMinutes} menit) agar guru
              dapat mendampingi kelas rendah tanpa membiarkan kelas tinggi menganggur.
            </p>
          </div>

          <div className="relative border-l-2 border-indigo-200 ml-4 pl-6 space-y-8">
            {/* Step 1: Shared Opening */}
            <div className="relative">
              <span className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow">
                1
              </span>
              <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-1 text-xs">
                <div className="font-bold text-indigo-950 text-sm">
                  Fase 1: Pembuka &amp; Apersepsi Bersama (10 - 15 Menit)
                </div>
                <div className="text-slate-700 leading-relaxed">
                  {data.recommendedActivities.sharedOpeningActivity}
                </div>
              </div>
            </div>

            {/* Step 2: Parallel Activities */}
            <div className="relative">
              <span className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow">
                2
              </span>
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-slate-900">
                  Fase 2: Rotasi Aktivitas Inti Berjenjang (40 - 45 Menit)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lower Grade guided activity */}
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
                    <div className="font-extrabold text-blue-900">
                      Bimbingan Langsung Guru (Tingkatan Rendah)
                    </div>
                    <div className="text-slate-700 leading-relaxed">
                      {data.recommendedActivities.lowerGradeActivity}
                    </div>
                  </div>

                  {/* Higher Grade solo activity */}
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                    <div className="font-extrabold text-purple-900">
                      Aktivitas Mandiri / Tutor Sebaya (Tingkatan Tinggi)
                    </div>
                    <div className="text-slate-700 leading-relaxed">
                      {data.recommendedActivities.higherGradeActivity}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Shared Closing */}
            <div className="relative">
              <span className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow">
                3
              </span>
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-1 text-xs">
                <div className="font-bold text-emerald-950 text-sm">
                  Fase 3: Penutup &amp; Refleksi Bersama (10 - 15 Menit)
                </div>
                <div className="text-slate-700 leading-relaxed">
                  {data.recommendedActivities.sharedClosingActivity}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ASSESSMENT */}
      {activeTab === "differentiation" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Rekomendasi Asesmen Formatif &amp; Kriteria Pengamatan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Panduan penilaian hasil belajar yang disesuaikan dengan kapasitas tiap tingkatan kelas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-900">Asesmen Kelas Tingkatan Rendah</div>
              <div className="text-slate-700">
                {data.assessmentRecommendations.lowerGradeAssessment}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-900">Asesmen Kelas Tingkatan Tinggi</div>
              <div className="text-slate-700">
                {data.assessmentRecommendations.higherGradeAssessment}
              </div>
            </div>
          </div>

          {/* Shared Rubric */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-3">
            <div className="text-xs font-bold text-indigo-950">
              Kriteria Pengamatan Bersama (Observasi Sikap &amp; Partisipasi):
            </div>
            <ul className="list-disc list-inside text-xs text-slate-700 space-y-1.5">
              {data.assessmentRecommendations.sharedObservationCriteria.map((crit, idx) => (
                <li key={idx}>{crit}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Koreksi &amp; Kembalikan Pemetaan</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Tuliskan catatan perbaikan atau penyesuaian yang perlu direvisi oleh guru pengampu.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Contoh: Irisan materi belum mempertimbangkan kesiapan membaca siswa kelas 1, gunakan strategi terpisah paralel..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isPending || !rejectionReason.trim()}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                Kirim Koreksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
