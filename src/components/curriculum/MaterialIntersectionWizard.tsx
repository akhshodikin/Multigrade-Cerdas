"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Layers,
  Cpu,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Check,
  Edit3,
} from "lucide-react";
import {
  generateMaterialIntersectionAction,
  createManualIntersectionAction,
  getTpsForGroupAndSubjectAction,
} from "@/app/actions/material-intersection";
import { ProviderInfo } from "@/lib/ai/provider-factory";

interface MaterialIntersectionWizardProps {
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
  providers: ProviderInfo[];
}

export function MaterialIntersectionWizard({
  groups,
  subjects,
  providers,
}: MaterialIntersectionWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Wizard Tab: "ai" or "manual"
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");

  // Form State
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [academicYear, setAcademicYear] = useState("2024/2025");
  const [semester, setSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [durationMinutes, setDurationMinutes] = useState(70);
  const [studentConditions, setStudentConditions] = useState("");
  const [providerId, setProviderId] = useState<"auto" | "gemini" | "mock_local">("auto");

  // TP Data state
  const [isLoadingTps, setIsLoadingTps] = useState(false);
  const [gradesInfo, setGradesInfo] = useState<{ lowerGrade: number; higherGrade: number }>({
    lowerGrade: 1,
    higherGrade: 2,
  });
  const [lowerGradeTps, setLowerGradeTps] = useState<
    Array<{ id: string; code: string; competency: string; description: string }>
  >([]);
  const [higherGradeTps, setHigherGradeTps] = useState<
    Array<{ id: string; code: string; competency: string; description: string }>
  >([]);

  // Selection state
  const [selectedLowerTpIds, setSelectedLowerTpIds] = useState<string[]>([]);
  const [selectedHigherTpIds, setSelectedHigherTpIds] = useState<string[]>([]);

  // Manual Mode form states
  const [manualTheme, setManualTheme] = useState("");
  const [manualStrategy, setManualStrategy] = useState<
    "terpadu_sebagian" | "terpisah_paralel" | "terpadu_penuh"
  >("terpadu_sebagian");
  const [manualSharedOpening, setManualSharedOpening] = useState("");
  const [manualLowerActivity, setManualLowerActivity] = useState("");
  const [manualHigherActivity, setManualHigherActivity] = useState("");
  const [manualSharedClosing, setManualSharedClosing] = useState("");
  const [manualTeacherNotes, setManualTeacherNotes] = useState("");

  // Status & Error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [piiWarning, setPiiWarning] = useState<string | null>(null);

  // Fetch TPs whenever group or subject changes
  useEffect(() => {
    if (!groupId || !subjectId) return;

    setIsLoadingTps(true);
    setErrorMessage(null);

    getTpsForGroupAndSubjectAction(groupId, subjectId)
      .then((res) => {
        if (res.success && res.data) {
          setGradesInfo(res.data.grades);
          setLowerGradeTps(res.data.lowerGradeTps);
          setHigherGradeTps(res.data.higherGradeTps);
          // Default select all available
          setSelectedLowerTpIds(res.data.lowerGradeTps.map((t) => t.id));
          setSelectedHigherTpIds(res.data.higherGradeTps.map((t) => t.id));
        } else {
          setErrorMessage(res.error || "Gagal memuat TP untuk kelompok dan mapel yang dipilih.");
        }
      })
      .catch((err) => {
        setErrorMessage(err.message || "Gagal memuat TP.");
      })
      .finally(() => {
        setIsLoadingTps(false);
      });
  }, [groupId, subjectId]);

  // Check PII on student conditions input
  const handleStudentConditionsChange = (text: string) => {
    setStudentConditions(text);
    const piiRegex = /\b\d{10,16}\b|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (piiRegex.test(text)) {
      setPiiWarning(
        "Peringatan Privasi: Teks terdeteksi mengandung nomor NIK/NISN/HP atau email. Jangan memasukkan data pribadi siswa!"
      );
    } else {
      setPiiWarning(null);
    }
  };

  const toggleLowerTp = (id: string) => {
    setSelectedLowerTpIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleHigherTp = (id: string) => {
    setSelectedHigherTpIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle AI Submission
  const handleGenerateAi = () => {
    setErrorMessage(null);

    if (selectedLowerTpIds.length === 0 || selectedHigherTpIds.length === 0) {
      setErrorMessage(
        `Pilih minimal 1 TP untuk Kelas ${gradesInfo.lowerGrade} dan 1 TP untuk Kelas ${gradesInfo.higherGrade}.`
      );
      return;
    }

    if (piiWarning) {
      setErrorMessage("Hapus data pribadi (PII) dari deskripsi kondisi siswa sebelum melanjutkan.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await generateMaterialIntersectionAction({
          groupId,
          subjectId,
          academicYear,
          semester,
          durationMinutes,
          studentConditions: studentConditions.trim() || undefined,
          selectedLowerTpIds,
          selectedHigherTpIds,
          providerId,
        });

        if (res.success) {
          router.push(`/dashboard/kurikulum/irisan-materi/${res.data.mapId}`);
        } else {
          setErrorMessage(res.error || "Gagal menghasilkan analisis irisan materi.");
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan internal.");
      }
    });
  };

  // Handle Manual Submission
  const handleCreateManual = () => {
    setErrorMessage(null);

    if (!manualTheme.trim()) {
      setErrorMessage("Tema atau konteks bersama wajib diisi.");
      return;
    }

    if (selectedLowerTpIds.length === 0 || selectedHigherTpIds.length === 0) {
      setErrorMessage("Pilih minimal 1 TP sumber untuk masing-masing kelas.");
      return;
    }

    startTransition(async () => {
      try {
        const selectedGroup = groups.find((g) => g.id === groupId);
        const selectedSubject = subjects.find((s) => s.id === subjectId);

        const lowerTps = lowerGradeTps.filter((t) => selectedLowerTpIds.includes(t.id));
        const higherTps = higherGradeTps.filter((t) => selectedHigherTpIds.includes(t.id));

        const structuredOutput = {
          sharedTheme: manualTheme,
          mappingStrategy: manualStrategy,
          strategyRationale:
            manualStrategy === "terpisah_paralel"
              ? "Disusun oleh guru untuk pembelajaran kelas rangkap dengan materi berbeda melalui metode rotasi kelas bergiliran."
              : "Disusun oleh guru untuk menggabungkan konsep inti pembelajaran bersama dengan diferensiasi tugas.",
          sourceTpsSideBySide: lowerTps.map((lt, idx) => {
            const ht = higherTps[idx] || higherTps[0];
            return {
              lowerGradeTp: {
                id: lt.id,
                code: lt.code,
                grade: gradesInfo.lowerGrade,
                competency: lt.competency,
                description: lt.description,
              },
              higherGradeTp: {
                id: ht.id,
                code: ht.code,
                grade: gradesInfo.higherGrade,
                competency: ht.competency,
                description: ht.description,
              },
              relationship: manualStrategy === "terpisah_paralel" ? ("tidak_beririsan" as const) : ("irisan_kuat" as const),
              relationshipNote:
                manualStrategy === "terpisah_paralel"
                  ? "Kompetensi dasar berbeda tingkatan; fokus pada pemahaman mandiri bertahap."
                  : "Memiliki irisan topik bahasan yang dapat diantarkan bersama.",
            };
          }),
          mergedTps:
            manualStrategy !== "terpisah_paralel"
              ? [
                  {
                    title: manualTheme,
                    lowerGradeTpId: lowerTps[0].id,
                    higherGradeTpId: higherTps[0].id,
                    sharedCoreConcept: manualTheme,
                    rationale: "Konsep diajarkan secara terpadu melalui pemodelan guru.",
                  },
                ]
              : [],
          separateTps:
            manualStrategy === "terpisah_paralel"
              ? [
                  {
                    tpId: lowerTps[0].id,
                    grade: gradesInfo.lowerGrade,
                    reasonForSeparation: "Tingkat pemahaman masih konkret dan membutuhkan bimbingan guru.",
                    suggestedSoloActivity: "Bimbingan langsung guru dengan media visual/konkret.",
                  },
                  {
                    tpId: higherTps[0].id,
                    grade: gradesInfo.higherGrade,
                    reasonForSeparation: "Tingkat pemahaman lebih abstrak dan dapat bekerja mandiri.",
                    suggestedSoloActivity: "Lembar aktivitas eksplorasi mandiri atau berpasangan.",
                  },
                ]
              : [],
          prerequisitesAnalysis: [],
          recommendedActivities: {
            sharedOpeningActivity:
              manualSharedOpening ||
              "Pengantar bersama: Guru menyampaikan apersepsi kontekstual lingkungan Tosari kepada seluruh kelompok.",
            lowerGradeActivity:
              manualLowerActivity ||
              `Aktivitas Kelas ${gradesInfo.lowerGrade}: Bimbingan terbimbing guru mengenai konsep dasar secara bertahap.`,
            higherGradeActivity:
              manualHigherActivity ||
              `Aktivitas Kelas ${gradesInfo.higherGrade}: Eksplorasi mandiri dengan Lembar Kerja Siswa / tugas aplikasi.`,
            sharedClosingActivity:
              manualSharedClosing ||
              "Penutup bersama: Guru merangkum pembelajaran, refleksi bersama, dan apresiasi kerja seluruh siswa.",
          },
          differentiatedOutcomes: {
            lowerGrade: {
              content: `Materi esensial Kelas ${gradesInfo.lowerGrade}`,
              process: "Bimbingan langsung bertahap (Direct Instruction)",
              product: "Hasil karya/tugas sederhana terarah",
            },
            higherGrade: {
              content: `Materi pengembangan Kelas ${gradesInfo.higherGrade}`,
              process: "Aktivitas mandiri & kolaborasi teman sebaya",
              product: "Penyelesaian masalah dan analisis mandiri",
            },
          },
          assessmentRecommendations: {
            lowerGradeAssessment: `Asesmen formatif observasi bimbingan langsung Kelas ${gradesInfo.lowerGrade}`,
            higherGradeAssessment: `Rubrik penilaian penugasan mandiri Kelas ${gradesInfo.higherGrade}`,
            sharedObservationCriteria: [
              "Keaktifan dan partisipasi dalam pembelajaran bersama",
              "Kemandirian dalam menyelesaikan peran tugas kelompok",
            ],
          },
          mappingBasis: {
            pedagogicalNotes:
              manualTeacherNotes ||
              `Pemetaan manual oleh guru pengampu ${selectedGroup?.name} (${selectedSubject?.name}).`,
            referencedTpIds: [...selectedLowerTpIds, ...selectedHigherTpIds],
            referencedCpElements: ["Elemen Kurikulum Merdeka Terpilih"],
          },
          confidence: {
            level: "tinggi" as const,
            score: 100,
            disclaimer:
              "Pemetaan disusun secara manual oleh guru pengampu profesional SDN Sedaeng II Tosari.",
          },
        };

        const res = await createManualIntersectionAction({
          groupId,
          subjectId,
          academicYear,
          semester,
          durationMinutes,
          sharedTheme: manualTheme,
          studentConditions: studentConditions.trim() || undefined,
          mappingStrategy: manualStrategy,
          structuredOutput,
          teacherNotes: manualTeacherNotes.trim() || undefined,
        });

        if (res.success) {
          router.push(`/dashboard/kurikulum/irisan-materi/${res.data.mapId}`);
        } else {
          setErrorMessage(res.error || "Gagal menyimpan pemetaan manual.");
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan internal.");
      }
    });
  };

  const selectedGroup = groups.find((g) => g.id === groupId);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Penyusun Irisan Materi Multigrade
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Analisis keterkaitan kompetensi Kurikulum Merdeka antar tingkatan kelas untuk menentukan
          kapan materi dapat digabungkan dan kapan pembelajaran harus berjalan terpisah secara paralel.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "ai"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Generator AI Multigrade (Rekomendasi Cerdas)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "manual"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Pemetaan Manual Guru (Offline Total)</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Terjadi Kendala:</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* PII Alert */}
      {piiWarning && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Perhatian Privasi Data Siswa:</div>
            <div>{piiWarning}</div>
          </div>
        </div>
      )}

      {/* Parameters Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>1. Parameter Kelompok Belajar &amp; Mata Pelajaran</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Kelompok */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kelompok Belajar Rangkap
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          {/* Tahun & Semester */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tahun &amp; Semester</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-2/3 px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
                placeholder="2024/2025"
              />
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as "Ganjil" | "Genap")}
                className="w-1/3 px-2 py-2 text-xs rounded-xl border border-slate-200 font-medium"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

          {/* Alokasi Waktu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Durasi Sesi (Menit)
            </label>
            <input
              type="number"
              min={35}
              max={240}
              step={5}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 70)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
            />
          </div>
        </div>

        {/* Student Context (PII-free) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Karakteristik &amp; Kebutuhan Siswa (Pedagogis / Lingkungan, Tanpa Nama Pribadi)
          </label>
          <textarea
            rows={2}
            value={studentConditions}
            onChange={(e) => handleStudentConditionsChange(e.target.value)}
            placeholder="Contoh: Siswa kelas 1 dalam tahap transisi membaca konkret, siswa kelas 2 siap belajar mandiri; gunakan konteks perkebunan sayur / kearifan lokal Tosari..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="text-[11px] text-slate-400 mt-0.5">
            * Dilarang mencantumkan nama lengkap siswa, nomor NIK, NISN, atau kontak wali murid.
          </div>
        </div>

        {/* AI Provider Options (Only visible in AI tab) */}
        {activeTab === "ai" && (
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Penyedia Mesin Rekomendasi AI
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  providerId === "auto"
                    ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="auto"
                  checked={providerId === "auto"}
                  onChange={() => setProviderId("auto")}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">Otomatis (Rekomendasi)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Gunakan Gemini jika kunci API aktif, atau gunakan mesin heuristik Tosari saat offline.
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  providerId === "gemini"
                    ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="gemini"
                  checked={providerId === "gemini"}
                  onChange={() => setProviderId("gemini")}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">Google Gemini 3.8 Flash</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Penalaran cerdas Google AI Studio via SDK resmi @google/genai.
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  providerId === "mock_local"
                    ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="mock_local"
                  checked={providerId === "mock_local"}
                  onChange={() => setProviderId("mock_local")}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">Heuristik Lokal Tosari (Offline)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Analisis berbasis aturan lokal tanpa bergantung pada koneksi internet.
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* TP Selection Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>2. Pilih Tujuan Pembelajaran (TP) Sumber Berdampingan</span>
          </h2>
          <div className="text-xs text-slate-500">
            Terpilih: <strong>{selectedLowerTpIds.length}</strong> (Kelas {gradesInfo.lowerGrade}) &bull;{" "}
            <strong>{selectedHigherTpIds.length}</strong> (Kelas {gradesInfo.higherGrade})
          </div>
        </div>

        {isLoadingTps ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
            <div className="text-xs">Memuat Tujuan Pembelajaran dari database...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lower Grade TPs Column */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-blue-900">
                    Kelas {gradesInfo.lowerGrade} (Tingkatan Rendah)
                  </span>
                  <div className="text-[10px] text-blue-700">Tersedia: {lowerGradeTps.length} TP</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLowerTpIds(
                      selectedLowerTpIds.length === lowerGradeTps.length
                        ? []
                        : lowerGradeTps.map((t) => t.id)
                    )
                  }
                  className="text-[11px] font-bold text-blue-800 underline hover:text-blue-950"
                >
                  {selectedLowerTpIds.length === lowerGradeTps.length ? "Batal Semua" : "Pilih Semua"}
                </button>
              </div>

              {lowerGradeTps.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  Belum ada TP untuk Kelas {gradesInfo.lowerGrade} pada mata pelajaran ini. Silakan input di Bank TP terlebih dahulu.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {lowerGradeTps.map((tp) => {
                    const isSelected = selectedLowerTpIds.includes(tp.id);
                    return (
                      <div
                        key={tp.id}
                        onClick={() => toggleLowerTp(tp.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition select-none flex items-start gap-2.5 ${
                          isSelected
                            ? "bg-blue-50/70 border-blue-400 ring-1 ring-blue-300"
                            : "bg-white border-slate-200 hover:border-slate-300 opacity-70"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition ${
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-mono font-bold text-blue-800">{tp.code}</div>
                          <div className="font-semibold text-slate-900 mt-0.5">{tp.competency}</div>
                          <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                            {tp.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Higher Grade TPs Column */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-purple-900">
                    Kelas {gradesInfo.higherGrade} (Tingkatan Tinggi)
                  </span>
                  <div className="text-[10px] text-purple-700">Tersedia: {higherGradeTps.length} TP</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedHigherTpIds(
                      selectedHigherTpIds.length === higherGradeTps.length
                        ? []
                        : higherGradeTps.map((t) => t.id)
                    )
                  }
                  className="text-[11px] font-bold text-purple-800 underline hover:text-purple-950"
                >
                  {selectedHigherTpIds.length === higherGradeTps.length ? "Batal Semua" : "Pilih Semua"}
                </button>
              </div>

              {higherGradeTps.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  Belum ada TP untuk Kelas {gradesInfo.higherGrade} pada mata pelajaran ini. Silakan input di Bank TP terlebih dahulu.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {higherGradeTps.map((tp) => {
                    const isSelected = selectedHigherTpIds.includes(tp.id);
                    return (
                      <div
                        key={tp.id}
                        onClick={() => toggleHigherTp(tp.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition select-none flex items-start gap-2.5 ${
                          isSelected
                            ? "bg-purple-50/70 border-purple-400 ring-1 ring-purple-300"
                            : "bg-white border-slate-200 hover:border-slate-300 opacity-70"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition ${
                            isSelected
                              ? "bg-purple-600 border-purple-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-mono font-bold text-purple-800">{tp.code}</div>
                          <div className="font-semibold text-slate-900 mt-0.5">{tp.competency}</div>
                          <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                            {tp.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual Authoring Fields (Only in Manual Tab) */}
      {activeTab === "manual" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-indigo-600" />
            <span>3. Rincian Pemetaan Manual Guru</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tema / Topik Bersama *
              </label>
              <input
                type="text"
                value={manualTheme}
                onChange={(e) => setManualTheme(e.target.value)}
                placeholder="Contoh: Operasi Hitung Pertanian Sayur Tosari"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Strategi Pelaksanaan Multigrade
              </label>
              <select
                value={manualStrategy}
                onChange={(e) =>
                  setManualStrategy(
                    e.target.value as "terpadu_sebagian" | "terpisah_paralel" | "terpadu_penuh"
                  )
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
              >
                <option value="terpadu_sebagian">
                  Terpadu Sebagian (Tema Bersama, Tugas Berbeda Sesuai Kelas)
                </option>
                <option value="terpisah_paralel">
                  Terpisah Paralel (Rotasi Guru: Bimbingan Langsung vs Kerja Mandiri)
                </option>
                <option value="terpadu_penuh">
                  Terpadu Penuh (Konsep Esensial Sama dengan Tingkat Kedalaman Berbeda)
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Aktivitas Pembuka Bersama
              </label>
              <input
                type="text"
                value={manualSharedOpening}
                onChange={(e) => setManualSharedOpening(e.target.value)}
                placeholder="Apersepsi dan pengantar konteks lingkungan oleh guru kepada seluruh siswa..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Aktivitas Kelas {gradesInfo.lowerGrade} (Bimbingan Langsung)
                </label>
                <textarea
                  rows={2}
                  value={manualLowerActivity}
                  onChange={(e) => setManualLowerActivity(e.target.value)}
                  placeholder="Guru mendampingi secara bertahap menggunakan alat peraga konkret..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Aktivitas Kelas {gradesInfo.higherGrade} (Mandiri / Kolaboratif)
                </label>
                <textarea
                  rows={2}
                  value={manualHigherActivity}
                  onChange={(e) => setManualHigherActivity(e.target.value)}
                  placeholder="Siswa mengerjakan lembar tantangan eksplorasi atau pemecahan masalah..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Aktivitas Penutup Bersama
              </label>
              <input
                type="text"
                value={manualSharedClosing}
                onChange={(e) => setManualSharedClosing(e.target.value)}
                placeholder="Refleksi pembelajaran, unjuk hasil karya, dan evaluasi singkat..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Guru Pengampu
              </label>
              <input
                type="text"
                value={manualTeacherNotes}
                onChange={(e) => setManualTeacherNotes(e.target.value)}
                placeholder="Catatan penyesuaian khusus atau alokasi pendampingan..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 transition"
        >
          Batal
        </button>

        {activeTab === "ai" ? (
          <button
            type="button"
            onClick={handleGenerateAi}
            disabled={
              isPending ||
              selectedLowerTpIds.length === 0 ||
              selectedHigherTpIds.length === 0 ||
              Boolean(piiWarning)
            }
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-100 transition flex items-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menganalisis Kesamaan Konsep AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Jalankan Rekomendasi AI Multigrade</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreateManual}
            disabled={isPending || !manualTheme.trim()}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-md transition flex items-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Pemetaan Manual...</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                <span>Simpan Pemetaan Manual Guru</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
