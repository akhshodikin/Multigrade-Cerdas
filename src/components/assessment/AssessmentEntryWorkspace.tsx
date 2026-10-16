"use client";

import React, { useState } from "react";
import type { MasteryLevel, FollowUpType, RubricCriterion } from "@/lib/assessment/types";
import { recordStudentResultsAction } from "@/app/actions/assessment";
import { generateAiSuggestedFollowUp } from "@/lib/assessment/recommendations";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AssessmentEntryWorkspaceProps {
  assessment: any;
  subject: any;
  targetClass: any;
  group: any;
  tp: any;
  students: any[];
  initialResults: any[];
}

export function AssessmentEntryWorkspace({
  assessment,
  subject,
  targetClass,
  group,
  tp,
  students,
  initialResults,
}: AssessmentEntryWorkspaceProps) {
  const router = useRouter();

  // Inisialisasi map hasil per siswa
  const [resultsMap, setResultsMap] = useState<
    Record<
      string,
      {
        score: number | "";
        masteryLevel: MasteryLevel;
        learningEvidence: string;
        teacherNotes: string;
        followUpType: FollowUpType;
        followUpNotes: string;
        aiSuggestedFollowUp: string;
        followUpCompleted: boolean;
        assessmentDate: string;
      }
    >
  >(() => {
    const map: Record<string, any> = {};
    const today = new Date().toISOString().split("T")[0];

    students.forEach((st) => {
      const existing = initialResults.find((r) => r.studentId === st.id);
      if (existing) {
        map[st.id] = {
          score: existing.score ?? "",
          masteryLevel: existing.masteryLevel || "cukup",
          learningEvidence: existing.learningEvidence || "",
          teacherNotes: existing.teacherNotes || "",
          followUpType: existing.followUpType || "tidak_perlu",
          followUpNotes: existing.followUpNotes || "",
          aiSuggestedFollowUp: existing.aiSuggestedFollowUp || "",
          followUpCompleted: existing.followUpCompleted ?? false,
          assessmentDate: existing.assessmentDate || today,
        };
      } else {
        map[st.id] = {
          score: "",
          masteryLevel: "cukup",
          learningEvidence: "",
          teacherNotes: "",
          followUpType: "tidak_perlu",
          followUpNotes: "",
          aiSuggestedFollowUp: "",
          followUpCompleted: false,
          assessmentDate: today,
        };
      }
    });
    return map;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleLevelChange = (studentId: string, level: MasteryLevel) => {
    setResultsMap((prev) => {
      const current = prev[studentId];
      const aiRec = generateAiSuggestedFollowUp(
        level,
        current.learningEvidence || "Pengamatan aktivitas pembelajaran",
        targetClass?.id || 1,
        subject?.name || "Mata Pelajaran"
      );

      return {
        ...prev,
        [studentId]: {
          ...current,
          masteryLevel: level,
          aiSuggestedFollowUp: aiRec.suggestionText,
          followUpType: aiRec.followUpType,
          followUpNotes: current.followUpNotes || aiRec.suggestionText,
        },
      };
    });
  };

  const handleEvidenceChange = (studentId: string, text: string) => {
    setResultsMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        learningEvidence: text,
      },
    }));
  };

  const handleGenerateAiAdvice = (studentId: string) => {
    const current = resultsMap[studentId];
    const aiRec = generateAiSuggestedFollowUp(
      current.masteryLevel,
      current.learningEvidence || "Aktivitas tugas mandiri",
      targetClass?.id || 1,
      subject?.name || "Mata Pelajaran"
    );

    setResultsMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        aiSuggestedFollowUp: aiRec.suggestionText,
        followUpType: aiRec.followUpType,
        followUpNotes: aiRec.suggestionText,
      },
    }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setMsg(null);

    const payload = students.map((st) => {
      const data = resultsMap[st.id];
      return {
        studentId: st.id,
        score: data.score === "" ? null : Number(data.score),
        masteryLevel: data.masteryLevel,
        learningEvidence: data.learningEvidence || "Telah mengikuti asesmen dan diobservasi guru",
        teacherNotes: data.teacherNotes || null,
        followUpType: data.followUpType,
        followUpNotes: data.followUpNotes || null,
        aiSuggestedFollowUp: data.aiSuggestedFollowUp || null,
        followUpCompleted: data.followUpCompleted,
        assessmentDate: data.assessmentDate,
      };
    });

    try {
      const res = await recordStudentResultsAction(assessment.id, payload);
      if (res.success) {
        setMsg({ type: "success", text: res.message || "Penilaian berhasil disimpan." });
        router.refresh();
      } else {
        setMsg({ type: "error", text: res.error || "Gagal menyimpan penilaian." });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Terjadi kesalahan sistem." });
    } finally {
      setIsSaving(false);
    }
  };

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

      {/* Header Sesi Asesmen */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 uppercase">
              {assessment.assessmentType}
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
              Kelas {assessment.classId} &bull; {assessment.phase}
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-800">
              {subject?.name || assessment.subjectId}
            </span>
            <span className="text-xs text-stone-500">
              Instrumen: <strong>{assessment.instrumentType.replace("_", " ")}</strong>
            </span>
          </div>

          <h1 className="text-2xl font-black text-stone-900 tracking-tight">{assessment.title}</h1>

          {tp && (
            <p className="text-xs text-emerald-900 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 mt-2 font-medium">
              🎯 <strong>Tujuan Pembelajaran:</strong> [{tp.code}] {tp.competency} &bull; {tp.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            {isSaving ? "Menyimpan..." : "💾 Simpan Semua Hasil Penilaian"}
          </button>
        </div>
      </div>

      {/* Roster Siswa & Lembar Pengamatan */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Daftar Peserta Didik ({students.length} Siswa)
            </h3>
            <p className="text-xs text-stone-500">
              Catat bukti konkret belajar, pilih tingkat ketercapaian, dan tentukan rencana tindak lanjut.
            </p>
          </div>
          <div className="text-xs text-stone-600 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              Perlu Bimbingan
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              Cukup
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
              Baik
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              Sangat Baik
            </span>
          </div>
        </div>

        <div className="divide-y divide-stone-200">
          {students.map((st, idx) => {
            const data = resultsMap[st.id] || {
              score: "",
              masteryLevel: "cukup",
              learningEvidence: "",
              teacherNotes: "",
              followUpType: "tidak_perlu",
              followUpNotes: "",
              aiSuggestedFollowUp: "",
              followUpCompleted: false,
              assessmentDate: new Date().toISOString().split("T")[0],
            };

            return (
              <div key={st.id} className="p-5 hover:bg-stone-50/50 transition space-y-3">
                {/* Baris Identitas Siswa & Level */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <strong className="text-sm text-stone-900 block">{st.fullName}</strong>
                      <span className="text-xs text-stone-500 font-mono">
                        {st.studentCode} &bull; Kelas {st.classId} ({st.gender === "L" ? "Laki-laki" : "Perempuan"})
                      </span>
                    </div>
                  </div>

                  {/* Level Ketercapaian Pills */}
                  <div className="flex rounded-xl bg-stone-100 p-1 gap-1">
                    {[
                      { id: "perlu_bimbingan", label: "Perlu Bimbingan", color: "bg-rose-600 text-white" },
                      { id: "cukup", label: "Cukup", color: "bg-amber-500 text-white" },
                      { id: "baik", label: "Baik", color: "bg-sky-600 text-white" },
                      { id: "sangat_baik", label: "Sangat Baik", color: "bg-emerald-600 text-white" },
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => handleLevelChange(st.id, lvl.id as MasteryLevel)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                          data.masteryLevel === lvl.id
                            ? `${lvl.color} shadow-xs`
                            : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Input Bukti Belajar & Tindak Lanjut */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs pt-1">
                  {/* Catatan Bukti Belajar (5 kolom) */}
                  <div className="md:col-span-5 space-y-1">
                    <label className="font-bold text-stone-700 block">
                      📌 Catatan Bukti / Unjuk Kerja Konkret:
                    </label>
                    <textarea
                      rows={2}
                      value={data.learningEvidence}
                      onChange={(e) => handleEvidenceChange(st.id, e.target.value)}
                      placeholder="Contoh: Mengelompokkan sayur dengan tepat, mampu menjelaskan alasannya secara lisan..."
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  {/* Catatan Tindak Lanjut Guru & Saran AI (6 kolom) */}
                  <div className="md:col-span-5 space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-stone-700 block">
                        🌱 Rencana Tindak Lanjut:
                      </label>
                      <button
                        type="button"
                        onClick={() => handleGenerateAiAdvice(st.id)}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-800 flex items-center gap-0.5"
                      >
                        <span>🤖</span> Minta Saran AI
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={data.followUpNotes}
                      onChange={(e) =>
                        setResultsMap((prev) => ({
                          ...prev,
                          [st.id]: { ...prev[st.id], followUpNotes: e.target.value },
                        }))
                      }
                      placeholder="Contoh: Pendampingan remedial kelompok kecil / Diberikan tantangan soal penalaran..."
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  {/* Skor & Status Checklist (2 kolom) */}
                  <div className="md:col-span-2 flex flex-col justify-between space-y-2">
                    <div>
                      <label className="font-bold text-stone-700 block">Skor (0-100):</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={data.score}
                        onChange={(e) =>
                          setResultsMap((prev) => ({
                            ...prev,
                            [st.id]: {
                              ...prev[st.id],
                              score: e.target.value === "" ? "" : Number(e.target.value),
                            },
                          }))
                        }
                        placeholder="Opsional"
                        className="w-full border rounded-lg p-1.5 focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-stone-700 font-semibold">
                      <input
                        type="checkbox"
                        checked={data.followUpCompleted}
                        onChange={(e) =>
                          setResultsMap((prev) => ({
                            ...prev,
                            [st.id]: { ...prev[st.id], followUpCompleted: e.target.checked },
                          }))
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                      />
                      <span className="text-[11px]">Tindak Lanjut Tuntas</span>
                    </label>
                  </div>
                </div>

                {/* Tautan ke Profil Siswa */}
                <div className="flex justify-end pt-1">
                  <Link
                    href={`/dashboard/asesmen/siswa/${st.id}`}
                    target="_blank"
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Lihat Rekam Jejak Portofolio {st.displayName} &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center">
          <Link
            href="/dashboard/asesmen"
            className="text-xs font-semibold text-stone-600 hover:text-stone-900"
          >
            &larr; Kembali ke Daftar Asesmen
          </Link>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            {isSaving ? "Menyimpan Data..." : "💾 Simpan Semua Hasil Penilaian"}
          </button>
        </div>
      </div>
    </div>
  );
}
