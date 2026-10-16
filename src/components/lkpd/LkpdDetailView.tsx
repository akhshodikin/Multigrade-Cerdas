"use client";

import React, { useState } from "react";
import type { LkpdWorksheet, AnswerSectionItem, TeacherRubricItem } from "@/lib/lkpd-media/types";
import { getIllustrationSvg } from "@/lib/lkpd-media/svg-illustrations";
import {
  updateLkpdAction,
  duplicateLkpdAction,
  approveLkpdAction,
  publishLkpdAction,
  rejectLkpdAction,
  verifyLkpdCurriculumAction,
} from "@/app/actions/lkpd-media";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LkpdDetailViewProps {
  initialLkpd: any;
  school: any;
  subject: any;
  group: any;
  userRole?: string;
  authorName?: string;
  approverName?: string;
  relatedMedia?: any[];
}

export function LkpdDetailView({
  initialLkpd,
  school,
  subject,
  group,
  userRole = "teacher",
  authorName,
  approverName,
  relatedMedia = [],
}: LkpdDetailViewProps) {
  const router = useRouter();
  const [lkpd, setLkpd] = useState<any>(initialLkpd);
  const [activeTab, setActiveTab] = useState<"worksheet" | "rubric" | "media" | "print">("worksheet");
  const [colorMode, setColorMode] = useState<"color" | "bw_eco">(
    initialLkpd.printSettings?.colorMode === "bw_eco" ? "bw_eco" : "color"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(initialLkpd.title);
  const [editTheme, setEditTheme] = useState(initialLkpd.themeOrTopic);
  const [editTime, setEditTime] = useState(initialLkpd.timeAllocationMinutes);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Status & role checks
  const canApprove = userRole === "admin" || userRole === "headmaster";
  const isApproved = lkpd.status === "approved" || lkpd.status === "published";

  const handleSaveEdits = async () => {
    setIsSaving(true);
    setMsg(null);
    try {
      const res = await updateLkpdAction(lkpd.id, {
        title: editTitle,
        themeOrTopic: editTheme,
        timeAllocationMinutes: Number(editTime),
      });
      if (res.success && res.data) {
        setLkpd(res.data);
        setIsEditing(false);
        setMsg({ type: "success", text: res.message || "LKPD berhasil diperbarui." });
      } else {
        setMsg({ type: "error", text: res.error || "Gagal menyimpan perubahan." });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Terjadi kesalahan." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!confirm("Duplikasi LKPD ini sebagai draf baru?")) return;
    setIsSaving(true);
    try {
      const res = await duplicateLkpdAction(lkpd.id);
      if (res.success && res.data) {
        router.push(`/dashboard/kurikulum/lkpd/${res.data.id}`);
      } else {
        setMsg({ type: "error", text: res.error || "Gagal menduplikasi LKPD." });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      const res = await approveLkpdAction(lkpd.id);
      if (res.success && res.data) {
        setLkpd(res.data);
        setMsg({ type: "success", text: res.message || "LKPD berhasil disetujui." });
      } else {
        setMsg({ type: "error", text: res.error || "Gagal menyetujui." });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsSaving(true);
    try {
      const res = await publishLkpdAction(lkpd.id);
      if (res.success && res.data) {
        setLkpd(res.data);
        setMsg({ type: "success", text: res.message || "LKPD berhasil diterbitkan!" });
      } else {
        setMsg({ type: "error", text: res.error || "Gagal menerbitkan." });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Masukkan alasan penolakan/revisi.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await rejectLkpdAction(lkpd.id, rejectReason);
      if (res.success && res.data) {
        setLkpd(res.data);
        setShowRejectModal(false);
        setMsg({ type: "success", text: res.message || "LKPD dikembalikan ke draf." });
      } else {
        setMsg({ type: "error", text: res.error || "Gagal menolak LKPD." });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Download sebagai berkas teks dokumen terstruktur / DOCX
  const handleExportTextDocument = () => {
    let doc = `========================================================\n`;
    doc += `LEMBAR KERJA PESERTA DIDIK (LKPD) - KURIKULUM MERDEKA\n`;
    doc += `${school?.name || "SDN SEDAENG II Tosari"}\n`;
    doc += `Kec. Tosari, Kab. Pasuruan - NPSN: ${school?.npsn || "20519070"}\n`;
    doc += `========================================================\n\n`;
    doc += `Mata Pelajaran    : ${subject?.name || lkpd.subjectId}\n`;
    doc += `Fase / Kelas      : ${lkpd.phase} / Kelas ${lkpd.grade}\n`;
    doc += `Kelompok Belajar  : ${group?.name || lkpd.groupId}\n`;
    doc += `Tema / Topik      : ${lkpd.themeOrTopic}\n`;
    doc += `Alokasi Waktu     : ${lkpd.timeAllocationMinutes} Menit\n`;
    doc += `Tujuan (TP)       : [${lkpd.targetTpCode}] ${lkpd.targetTpDescription}\n\n`;
    doc += `--------------------------------------------------------\n`;
    doc += `IDENTITAS PESERTA DIDIK:\n`;
    doc += `Nama Siswa / Kelompok : ___________________________________\n`;
    doc += `Nomor Absen           : __________________\n`;
    doc += `Hari / Tanggal        : __________________\n`;
    doc += `--------------------------------------------------------\n\n`;

    doc += `A. PETUNJUK BELAJAR:\n`;
    (lkpd.ageAppropriateInstructions || []).forEach((inst: string, i: number) => {
      doc += `   ${i + 1}. ${inst}\n`;
    });

    doc += `\nB. STIMULUS / MATERI PENGANTAR:\n`;
    doc += `   Judul: ${lkpd.stimulus?.title}\n`;
    doc += `   ${lkpd.stimulus?.content}\n\n`;

    doc += `C. LANGKAH-LANGKAH KEGIATAN:\n`;
    (lkpd.activitySteps || []).forEach((st: any) => {
      doc += `   Langkah ${st.stepNumber}: ${st.instruction}\n`;
      if (st.guidanceNotes) doc += `   [Catatan Bimbingan]: ${st.guidanceNotes}\n`;
    });

    doc += `\nD. RUANG JAWABAN & LATIHAN:\n`;
    (lkpd.answerSections || []).forEach((q: AnswerSectionItem) => {
      doc += `   No. ${q.questionNumber} [Skor: ${q.points}] (${q.questionType.toUpperCase()}):\n`;
      doc += `   Pertanyaan: ${q.questionText}\n`;
      if (q.options) {
        q.options.forEach((opt: string) => {
          doc += `      ${opt}\n`;
        });
      }
      if (q.matchingPairs) {
        doc += `      Pasangkan:\n`;
        q.matchingPairs.forEach((p) => {
          doc += `      - [ ] ${p.left}  ----->  [ ] ${p.right}\n`;
        });
      }
      if (q.helperHint) {
        doc += `      (Petunjuk Bantuan: ${q.helperHint})\n`;
      }
      doc += `   Jawaban Siswa: __________________________________________________\n\n`;
    });

    doc += `E. REFLEKSI SISWA:\n`;
    (lkpd.studentReflection?.promptQuestions || []).forEach((q: string, idx: number) => {
      doc += `   ${idx + 1}. ${q}\n      Jawaban: ____________________________________________\n`;
    });

    doc += `\nF. RUBRIK PENILAIAN GURU:\n`;
    (lkpd.teacherRubric || []).forEach((r: TeacherRubricItem, idx: number) => {
      doc += `   Indikator ${idx + 1}: ${r.indicator} (Maks: ${r.maxScore})\n`;
      doc += `   - Perlu Bimbingan : ${r.perluBimbingan}\n`;
      doc += `   - Cukup           : ${r.cukup}\n`;
      doc += `   - Baik            : ${r.baik}\n`;
      doc += `   - Sangat Baik     : ${r.sangatBaik}\n\n`;
    });

    const blob = new Blob([doc], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LKPD_Kelas_${lkpd.grade}_${lkpd.themeOrTopic.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stimulusSvg = getIllustrationSvg(lkpd.stimulus?.illustrationKey, colorMode, 220);

  return (
    <div className="space-y-6">
      {/* Notifikasi Status */}
      {msg && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
              Kelas {lkpd.grade} &bull; {lkpd.phase}
            </span>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
              {group?.name || lkpd.groupId}
            </span>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-100 text-sky-800">
              {subject?.name || lkpd.subjectId}
            </span>
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${
                lkpd.status === "published"
                  ? "bg-emerald-600 text-white"
                  : lkpd.status === "approved"
                  ? "bg-blue-600 text-white"
                  : "bg-stone-200 text-stone-700"
              }`}
            >
              {lkpd.status === "published"
                ? "Diterbitkan"
                : lkpd.status === "approved"
                ? "Disetujui"
                : "Draf"}
            </span>
            <span className="text-xs text-stone-500">v{lkpd.version}</span>
          </div>

          {isEditing ? (
            <div className="space-y-2 mt-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-xl font-bold border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
              />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label className="text-xs text-stone-500">Tema / Topik:</label>
                  <input
                    type="text"
                    value={editTheme}
                    onChange={(e) => setEditTheme(e.target.value)}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500">Alokasi Waktu (Menit):</label>
                  <input
                    type="number"
                    value={editTime}
                    onChange={(e) => setEditTime(Number(e.target.value))}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-stone-900 tracking-tight">{lkpd.title}</h1>
              <p className="text-sm text-stone-600 mt-1">
                Tema: <strong className="text-stone-800">{lkpd.themeOrTopic}</strong> &bull; Alokasi:{" "}
                <strong>{lkpd.timeAllocationMinutes} Menit</strong> &bull; Disusun oleh:{" "}
                <strong>{authorName || "Guru SDN Sedaeng II"}</strong>
              </p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdits}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
              >
                Sunting
              </button>
              <button
                onClick={handleDuplicate}
                disabled={isSaving}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
              >
                Duplikasi
              </button>
              {canApprove && lkpd.status === "draft" && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Setujui LKPD
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold"
                  >
                    Tolak / Revisi
                  </button>
                </>
              )}
              {isApproved && lkpd.status !== "published" && (
                <button
                  onClick={handlePublish}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Terbitkan LKPD
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigasi */}
      <div className="flex border-b border-stone-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("worksheet")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === "worksheet"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          1. Lembar Kerja Siswa (Pratinjau)
        </button>
        <button
          onClick={() => setActiveTab("rubric")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === "rubric"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          2. Rubrik Penilaian Guru
        </button>
        <button
          onClick={() => setActiveTab("media")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === "media"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          3. Media & Ilustrasi Pendukung ({relatedMedia.length})
        </button>
        <button
          onClick={() => setActiveTab("print")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === "print"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          4. Format Cetak Resmi & Ekspor
        </button>
      </div>

      {/* Konten Tab 1: Lembar Kerja Siswa */}
      {activeTab === "worksheet" && (
        <div
          className={`bg-white rounded-2xl border p-8 shadow-sm space-y-6 ${
            colorMode === "bw_eco" ? "filter grayscale border-stone-400" : "border-stone-200"
          }`}
        >
          {/* Box Header LKPD Siswa */}
          <div className="border-b-2 border-stone-800 pb-4">
            <div className="flex justify-between items-center text-xs text-stone-500 font-semibold mb-1">
              <span>KURIKULUM MERDEKA SD</span>
              <span>SDN SEDAENG II TOSARI &bull; KELAS RANGKAP</span>
            </div>
            <h2 className="text-xl font-black text-stone-900 tracking-tight uppercase">
              LEMBAR KERJA PESERTA DIDIK (LKPD) KELAS {lkpd.grade}
            </h2>
            <div className="text-sm font-semibold text-stone-700 mt-1">
              Mata Pelajaran: {subject?.name} &bull; Tema: {lkpd.themeOrTopic}
            </div>

            {/* Identitas Siswa */}
            <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-xs text-stone-500 block">Nama Siswa / Kelompok:</span>
                <div className="border-b border-dashed border-stone-400 h-6"></div>
              </div>
              <div>
                <span className="text-xs text-stone-500 block">Nomor Absen / Kelas:</span>
                <div className="border-b border-dashed border-stone-400 h-6">Kelas {lkpd.grade}</div>
              </div>
              <div>
                <span className="text-xs text-stone-500 block">Hari / Tanggal:</span>
                <div className="border-b border-dashed border-stone-400 h-6"></div>
              </div>
            </div>
          </div>

          {/* Tujuan Pembelajaran */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950">
            <span className="font-bold block mb-0.5">🎯 Tujuan Pembelajaran Kelas {lkpd.grade}:</span>
            [{lkpd.targetTpCode}] {lkpd.targetTpDescription}
          </div>

          {/* Petunjuk Belajar Sesuai Usia */}
          <div className="space-y-2">
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
              <span>📌</span> Petunjuk Pengerjaan:
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-stone-700 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
              {(lkpd.ageAppropriateInstructions || []).map((inst: string, idx: number) => (
                <li key={idx} className="leading-relaxed">
                  {inst}
                </li>
              ))}
            </ul>
          </div>

          {/* Stimulus Materi & Gambar */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <span>📖</span> {lkpd.stimulus?.title}
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div
                className="shrink-0 p-2 bg-white rounded-xl border border-stone-200 shadow-sm"
                dangerouslySetInnerHTML={{ __html: stimulusSvg }}
              />
              <div className="text-sm text-stone-800 leading-relaxed space-y-2">
                <p>{lkpd.stimulus?.content}</p>
                {lkpd.stimulus?.illustrationCaption && (
                  <p className="text-xs italic text-stone-500">
                    Ilustrasi: {lkpd.stimulus.illustrationCaption}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Langkah Aktivitas */}
          <div className="space-y-2">
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide">
              Langkah-Langkah Kegiatan:
            </h3>
            <div className="space-y-2">
              {(lkpd.activitySteps || []).map((step: any) => (
                <div
                  key={step.stepNumber}
                  className="p-3 bg-white rounded-xl border border-stone-200 flex items-start gap-3 shadow-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {step.stepNumber}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-stone-800">{step.instruction}</p>
                    {step.guidanceNotes && (
                      <p className="text-xs text-stone-500 mt-0.5">{step.guidanceNotes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ruang Jawaban & Latihan Siswa */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide flex items-center justify-between">
              <span>Lembar Latihan & Ruang Jawaban</span>
              <span className="text-xs text-stone-500 font-normal">
                Total Soal: {lkpd.answerSections?.length || 0}
              </span>
            </h3>

            <div className="space-y-4">
              {(lkpd.answerSections || []).map((q: AnswerSectionItem) => (
                <div
                  key={q.id}
                  className="p-4 bg-white rounded-xl border border-stone-300 space-y-3 shadow-xs"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-stone-900">
                      Soal {q.questionNumber}. ({q.points} Poin)
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 uppercase font-semibold">
                      {q.questionType.replace("_", " ")}
                    </span>
                  </div>

                  <p className="text-sm text-stone-800 font-medium">{q.questionText}</p>

                  {/* Mode Pilihan Ganda */}
                  {q.questionType === "multiple_choice" && q.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm pt-1">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg border border-stone-200 hover:border-emerald-400 bg-stone-50/50 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="w-4 h-4 rounded-full border border-stone-400 inline-block shrink-0"></span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mode Mencocokkan Pasangan (Matching) */}
                  {q.questionType === "matching" && q.matchingPairs && (
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-sm">
                      <p className="text-xs font-semibold text-stone-500">
                        Tariklah garis lurus dari kiri ke kanan:
                      </p>
                      {q.matchingPairs.map((p, i) => (
                        <div key={i} className="flex justify-between items-center gap-4 py-1">
                          <span className="font-medium text-stone-800 bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-xs">
                            {p.left}
                          </span>
                          <span className="text-stone-400 font-bold">&rarr;</span>
                          <span className="font-medium text-stone-800 bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-xs">
                            {p.right}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mode Menggambar (Drawing Area untuk kelas 1) */}
                  {q.questionType === "drawing_area" && (
                    <div className="border-2 border-dashed border-stone-300 rounded-xl h-36 flex flex-col items-center justify-center text-xs text-stone-400 bg-stone-50">
                      <span>🎨 Kotak Gambar & Warna Siswa</span>
                      <span className="text-[11px] text-stone-400 mt-1">
                        (Siswa menggambar langsung pada lembar cetak ini)
                      </span>
                    </div>
                  )}

                  {/* Mode Isian Singkat / Uraian Bergaris */}
                  {(q.questionType === "short_answer" || q.questionType === "essay") && (
                    <div className="space-y-2 pt-1">
                      <div className="border-b border-stone-300 h-6"></div>
                      <div className="border-b border-stone-300 h-6"></div>
                      {q.questionType === "essay" && (
                        <div className="border-b border-stone-300 h-6"></div>
                      )}
                    </div>
                  )}

                  {q.helperHint && (
                    <p className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                      💡 Bantuan: {q.helperHint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Refleksi Siswa */}
          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
            <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
              <span>⭐</span> Refleksi Belajarku Hari Ini:
            </h4>
            <div className="flex gap-4 items-center flex-wrap">
              <span className="text-xs font-semibold text-amber-950">
                Bagaimana perasaanmu setelah belajar?
              </span>
              <div className="flex gap-2">
                {(lkpd.studentReflection?.emoticonOptions || []).map((emo: any, i: number) => (
                  <button
                    key={i}
                    type="button"
                    className="px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-full text-xs font-bold text-stone-800 transition shadow-xs flex items-center gap-1"
                  >
                    <span>{emo.icon}</span>
                    <span>{emo.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-stone-700 pt-1">
              {(lkpd.studentReflection?.promptQuestions || []).map((pq: string, i: number) => (
                <div key={i} className="flex flex-col gap-1">
                  <span>
                    {i + 1}. {pq}
                  </span>
                  <div className="border-b border-stone-300 h-5"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Konten Tab 2: Rubrik Penilaian Guru */}
      {activeTab === "rubric" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                Rubrik Penilaian Formatif LKPD Kelas {lkpd.grade}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Standar 4 Tingkat Ketercapaian: Perlu Bimbingan &bull; Cukup &bull; Baik &bull; Sangat Baik
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
              Kriteria Guru SDN Sedaeng II
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700">
                  <th className="p-3 font-bold w-1/4">Indikator Ketercapaian TP</th>
                  <th className="p-3 font-semibold text-rose-700">Perlu Bimbingan (&lt;60)</th>
                  <th className="p-3 font-semibold text-amber-700">Cukup (60-74)</th>
                  <th className="p-3 font-semibold text-sky-700">Baik (75-89)</th>
                  <th className="p-3 font-semibold text-emerald-700">Sangat Baik (90-100)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {(lkpd.teacherRubric || []).map((rub: TeacherRubricItem, i: number) => (
                  <tr key={i} className="hover:bg-stone-50/50">
                    <td className="p-3 font-bold text-stone-900">
                      {rub.indicator}
                      <span className="block text-[11px] text-stone-400 font-normal mt-0.5">
                        Maksimal: {rub.maxScore} Poin
                      </span>
                    </td>
                    <td className="p-3 text-stone-700 bg-rose-50/30">{rub.perluBimbingan}</td>
                    <td className="p-3 text-stone-700 bg-amber-50/30">{rub.cukup}</td>
                    <td className="p-3 text-stone-700 bg-sky-50/30">{rub.baik}</td>
                    <td className="p-3 text-stone-700 bg-emerald-50/30 font-medium">
                      {rub.sangatBaik}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
            <span className="font-bold text-stone-800 block">💡 Pedoman Penilaian Multigrade Tosari:</span>
            <p>
              Pada kelas rangkap, penilaian formatif dilakukan melalui observasi aktif saat guru
              berpindah memfasilitasi kelompok, serta verifikasi hasil pengerjaan mandiri pada LKPD.
              Siswa yang berada pada kategori &quot;Perlu Bimbingan&quot; diprioritaskan untuk pendampingan
              tutor sebaya pada rotasi berikutnya.
            </p>
          </div>
        </div>
      )}

      {/* Konten Tab 3: Media & Ilustrasi Pendukung */}
      {activeTab === "media" && (
        <div className="space-y-6">
          {relatedMedia.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
              <span className="text-3xl">📦</span>
              <h4 className="text-base font-bold text-stone-800">Belum Ada Media Khusus Terkait</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Media pembelajaran seperti kartu gambar, bahan bacaan bertingkat, dan presentasi dapat
                dibuat dari menu Perpustakaan Media atau secara otomatis saat menyusun modul ajar.
              </p>
              <Link
                href="/dashboard/kurikulum/media-pembelajaran"
                className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
              >
                Buka Perpustakaan Media
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedMedia.map((m) => {
                const isCards = m.mediaType === "kartu_gambar" || m.mediaType === "kartu_aktivitas";
                const isReading = m.mediaType === "bacaan_bertingkat";
                const isSlides = m.mediaType === "presentasi";
                const isNumeracy = m.mediaType === "media_literasi_numerasi";

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-stone-100 text-stone-700 uppercase">
                          {m.mediaType.replace("_", " ")}
                        </span>
                        <span className="text-xs text-stone-400 font-semibold">{m.phase}</span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900">{m.title}</h4>
                      <p className="text-xs text-stone-600 mt-1 line-clamp-2">{m.description}</p>
                    </div>

                    {/* Preview Cuplikan Media */}
                    {isCards && (m.contentData as any)?.cards && (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100">
                        {((m.contentData as any).cards || []).slice(0, 3).map((c: any) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-lg bg-stone-50 border border-stone-200 text-center text-xs"
                          >
                            <div
                              className="mx-auto flex justify-center mb-1"
                              dangerouslySetInnerHTML={{
                                __html: getIllustrationSvg(c.illustrationKey, "color", 40),
                              }}
                            />
                            <span className="font-bold text-[11px] text-stone-800 truncate block">
                              {c.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isReading && (m.contentData as any)?.passages && (
                      <div className="space-y-1.5 pt-2 border-t border-stone-100 text-xs text-stone-700">
                        {((m.contentData as any).passages || []).map((p: any, idx: number) => (
                          <div key={idx} className="p-2 bg-stone-50 rounded-lg">
                            <span className="font-bold text-emerald-800">{p.levelLabel}:</span>{" "}
                            <span className="italic">{p.title}</span> ({p.wordCount} Kata)
                          </div>
                        ))}
                      </div>
                    )}

                    {isSlides && (m.contentData as any)?.slides && (
                      <div className="pt-2 border-t border-stone-100 text-xs">
                        <div className="p-3 bg-stone-900 text-white rounded-xl space-y-1">
                          <div className="flex justify-between text-[11px] text-stone-400">
                            <span>Slide {activeSlideIndex + 1} / {(m.contentData as any).slides.length}</span>
                            <span>{m.title}</span>
                          </div>
                          <p className="font-bold text-amber-300">
                            {(m.contentData as any).slides[activeSlideIndex]?.title}
                          </p>
                          <ul className="list-disc list-inside text-stone-300 text-[11px]">
                            {((m.contentData as any).slides[activeSlideIndex]?.bulletPoints || []).slice(0, 2).map((bp: string, i: number) => (
                              <li key={i}>{bp}</li>
                            ))}
                          </ul>
                          <div className="flex justify-end gap-1 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveSlideIndex((prev) => Math.max(0, prev - 1))
                              }
                              disabled={activeSlideIndex === 0}
                              className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 rounded text-[10px] disabled:opacity-40"
                            >
                              &larr; Prev
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveSlideIndex((prev) =>
                                  Math.min((m.contentData as any).slides.length - 1, prev + 1)
                                )
                              }
                              disabled={
                                activeSlideIndex ===
                                (m.contentData as any).slides.length - 1
                              }
                              className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 rounded text-[10px] disabled:opacity-40"
                            >
                              Next &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {isNumeracy && (m.contentData as any)?.visualElements && (
                      <div className="pt-2 border-t border-stone-100 flex gap-2 flex-wrap text-xs">
                        {((m.contentData as any).visualElements || []).map((v: any, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-md font-semibold text-amber-900"
                          >
                            {v.label}: {v.count} {v.unit}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <Link
                        href="/dashboard/kurikulum/media-pembelajaran"
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        Lihat di Perpustakaan &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Konten Tab 4: Format Cetak Resmi & Ekspor */}
      {activeTab === "print" && (
        <div className="space-y-6">
          {/* Kontrol Opsi Cetak */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-stone-600 uppercase">Pilihan Mode Cetak:</span>
              <div className="flex rounded-xl bg-stone-100 p-1">
                <button
                  type="button"
                  onClick={() => setColorMode("color")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    colorMode === "color"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  🌈 Berwarna Penuh
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode("bw_eco")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    colorMode === "bw_eco"
                      ? "bg-white text-stone-900 shadow-xs font-black"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  🌱 Hitam Putih (Hemat Tinta)
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <span>🖨️</span> Cetak / Simpan PDF
              </button>
              <button
                type="button"
                onClick={handleExportTextDocument}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <span>📄</span> Ekspor Dokumen
              </button>
            </div>
          </div>

          {/* Area Lembar Cetak Ber-Kop Resmi */}
          <div
            id="print-area"
            className={`bg-white rounded-2xl border p-10 max-w-4xl mx-auto shadow-md space-y-6 print:shadow-none print:border-none print:p-0 ${
              colorMode === "bw_eco" ? "filter grayscale border-stone-400" : "border-stone-300"
            }`}
          >
            {/* KOP SURAT RESMI */}
            <div className="border-b-4 border-double border-stone-900 pb-3 text-center">
              <h4 className="text-sm font-semibold tracking-wider text-stone-700 uppercase">
                Pemerintah Kabupaten Pasuruan &bull; Dinas Pendidikan dan Kebudayaan
              </h4>
              <h2 className="text-xl font-black text-stone-900 tracking-tight uppercase mt-0.5">
                {school?.name || "SDN SEDAENG II TOSARI"}
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                {school?.address || "Dusun Sedaeng, Desa Sedaeng, Kec. Tosari, Kab. Pasuruan, Jawa Timur 67177"}
              </p>
              <p className="text-[11px] text-stone-500">
                NPSN: {school?.npsn || "20519070"} &bull; Surel: {school?.email || "sdnsedaeng2tosari@gmail.com"}
              </p>
            </div>

            {/* Judul Dokumen Cetak */}
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-stone-900 uppercase underline decoration-2">
                LEMBAR KERJA PESERTA DIDIK (LKPD) KELAS {lkpd.grade}
              </h3>
              <p className="text-xs text-stone-700 font-bold">
                Tahun Ajaran {lkpd.academicYear} &bull; Semester {lkpd.semester}
              </p>
            </div>

            {/* Tabel Identitas Pengisian */}
            <div className="grid grid-cols-2 gap-4 text-xs border border-stone-800 p-3 rounded-lg">
              <div className="space-y-1">
                <div>
                  <strong>Mata Pelajaran:</strong> {subject?.name}
                </div>
                <div>
                  <strong>Fase / Kelas:</strong> {lkpd.phase} / Kelas {lkpd.grade}
                </div>
                <div>
                  <strong>Kelompok Belajar:</strong> {group?.name}
                </div>
                <div>
                  <strong>Alokasi Waktu:</strong> {lkpd.timeAllocationMinutes} Menit
                </div>
              </div>
              <div className="space-y-1">
                <div>
                  <strong>Nama Siswa:</strong> ____________________________
                </div>
                <div>
                  <strong>Nomor Absen:</strong> ____________
                </div>
                <div>
                  <strong>Hari / Tanggal:</strong> ____________________________
                </div>
                <div>
                  <strong>Nilai / Catatan Guru:</strong> _____________________
                </div>
              </div>
            </div>

            {/* Tujuan Pembelajaran */}
            <div className="text-xs space-y-0.5 border-l-2 border-stone-800 pl-3">
              <span className="font-bold block">Tujuan Pembelajaran (TP):</span>
              <p className="text-stone-800">
                [{lkpd.targetTpCode}] {lkpd.targetTpDescription}
              </p>
            </div>

            {/* Petunjuk Kerja */}
            <div className="space-y-1 text-xs">
              <strong className="block text-stone-900">Petunjuk Pengerjaan:</strong>
              <ol className="list-decimal list-inside space-y-0.5 text-stone-700">
                {(lkpd.ageAppropriateInstructions || []).map((inst: string, i: number) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            </div>

            {/* Stimulus & Ilustrasi Cetak */}
            <div className="border border-stone-300 rounded-lg p-3 space-y-2 text-xs">
              <strong className="block text-stone-900">{lkpd.stimulus?.title}</strong>
              <div className="flex gap-4 items-center">
                <div
                  className="shrink-0"
                  dangerouslySetInnerHTML={{
                    __html: getIllustrationSvg(lkpd.stimulus?.illustrationKey, colorMode, 180),
                  }}
                />
                <p className="text-stone-800 leading-relaxed">{lkpd.stimulus?.content}</p>
              </div>
            </div>

            {/* Soal & Ruang Isian Cetak */}
            <div className="space-y-4 pt-2">
              <strong className="block text-xs uppercase tracking-wide border-b border-stone-800 pb-1">
                Latihan & Tugas Mandiri Siswa:
              </strong>
              {(lkpd.answerSections || []).map((q: AnswerSectionItem) => (
                <div key={q.id} className="text-xs space-y-2 border-b border-dashed border-stone-300 pb-3">
                  <div className="flex justify-between font-bold text-stone-900">
                    <span>
                      {q.questionNumber}. {q.questionText}
                    </span>
                    <span className="text-[11px] font-normal">[{q.points} Poin]</span>
                  </div>

                  {q.questionType === "multiple_choice" && q.options && (
                    <div className="grid grid-cols-2 gap-2 pl-4">
                      {q.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 border border-stone-800 rounded-full inline-block"></span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.questionType === "matching" && q.matchingPairs && (
                    <div className="space-y-1 pl-4">
                      {q.matchingPairs.map((p, i) => (
                        <div key={i} className="flex justify-between max-w-md py-0.5">
                          <span>( ) {p.left}</span>
                          <span>...................</span>
                          <span>( ) {p.right}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.questionType === "drawing_area" && (
                    <div className="border border-stone-400 rounded-lg h-28 flex items-center justify-center text-stone-400 text-[11px]">
                      Ruang Menggambar Siswa
                    </div>
                  )}

                  {(q.questionType === "short_answer" || q.questionType === "essay") && (
                    <div className="space-y-2 pt-1 pl-4">
                      <div className="border-b border-stone-300 h-5"></div>
                      <div className="border-b border-stone-300 h-5"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Lembar Tanda Tangan Cetak */}
            <div className="pt-6 grid grid-cols-2 text-center text-xs">
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
                <p>Tosari, ....................................</p>
                <p className="font-bold">Guru Pengampu Kelas {lkpd.grade}</p>
                <div className="h-16"></div>
                <p className="font-bold underline">
                  {authorName || "Guru Pengampu SDN Sedaeng II"}
                </p>
                <p className="text-[11px] text-stone-500">NIP. ....................................</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Penolakan / Catatan Revisi */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-stone-900">Catatan Perbaikan / Revisi LKPD</h3>
            <p className="text-xs text-stone-600">
              Sertakan catatan atau arahan spesifik untuk guru mengenai bagian yang perlu diperbaiki.
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Soal nomor 3 terlalu panjang untuk siswa kelas 1, sederhanakan menjadi aktivitas mencocokkan gambar..."
              className="w-full text-xs border rounded-xl p-3 focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                {isSaving ? "Menyimpan..." : "Kirim Catatan Revisi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
