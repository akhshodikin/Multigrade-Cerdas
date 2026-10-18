"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  Users,
  CheckSquare,
  History,
  PlusCircle,
  AlertCircle,
  FileDown,
  Loader2,
  School,
} from "lucide-react";
import type { ReportType, AnyReportData } from "@/lib/reports/types";
import { createTeachingJournalAction } from "@/app/actions/reports";

interface ReportHubWorkspaceProps {
  initialReportData: AnyReportData;
  initialType: ReportType;
  school: {
    name: string;
    npsn: string;
    address: string;
    headmasterName: string;
    headmasterNip: string;
    email?: string;
    activeAcademicYear: string;
    activeSemester: string;
  };
  currentUser: {
    id: string;
    name: string;
    role: string;
    assignedGroupId?: string | null;
  };
  multigradeGroups: Array<{ id: string; name: string; phase: string; grades: string }>;
  subjects: Array<{ id: string; name: string }>;
  students: Array<{ id: string; studentCode: string; displayName: string; fullName: string; classId: number; groupId: string }>;
  exportHistories: Array<{
    id: string;
    reportType: string;
    title: string;
    format: string;
    version: number;
    fileSizeBytes: number;
    checksum?: string | null;
    status: string;
    generatedByName?: string | null;
    createdAt: Date;
  }>;
}

const REPORT_TYPE_CONFIG: Record<
  ReportType,
  { label: string; icon: any; description: string }
> = {
  atp_multigrade: {
    label: "ATP Multigrade",
    icon: Calendar,
    description: "Alur Tujuan Pembelajaran per kelas & kelompok dengan alokasi JP dan urutan TP.",
  },
  irisan_materi: {
    label: "Pemetaan Irisan TP",
    icon: Sparkles,
    description: "Analisis irisan kompetensi, rotasi bertingkat, dan diferensiasi materi kelas rangkap.",
  },
  modul_ajar: {
    label: "Modul Ajar",
    icon: BookOpen,
    description: "Rencana 8 pola rotasi pembelajaran langsung vs terarah, materi, dan asesmen.",
  },
  lkpd: {
    label: "LKPD Berdiferensiasi",
    icon: FileText,
    description: "Lembar Kerja Peserta Didik berpasangan ramah usia dengan rubrik penilaian.",
  },
  jurnal_mengajar: {
    label: "Jurnal Mengajar",
    icon: ClipboardList,
    description: "Catatan harian rotasi kelas rangkap, kehadiran siswa, refleksi, dan tindak lanjut.",
  },
  rekap_asesmen: {
    label: "Rekap Asesmen",
    icon: CheckSquare,
    description: "Rekapitulasi penilaian diagnostik, formatif, sumatif, dan sebaran 4 tingkat kriteria.",
  },
  kemajuan_siswa: {
    label: "Kemajuan Belajar Siswa",
    icon: GraduationCap,
    description: "Laporan perkembangan individual 27 siswa berlandaskan bukti belajar nyata (RBAC).",
  },
  ketercapaian_tp: {
    label: "Ketercapaian TP",
    icon: Layers,
    description: "Audit cakupan dan persentase penguasaan setiap TP Fase A, B, dan C sekolah.",
  },
  daftar_tindak_lanjut: {
    label: "Daftar Tindak Lanjut",
    icon: Users,
    description: "Antrean diferensiasi remedial (benda konkret/tutor) dan pengayaan (HOTS Bromo).",
  },
  ringkasan_kepala_sekolah: {
    label: "Ringkasan Kepala Sekolah",
    icon: School,
    description: "Laporan eksekutif evaluasi mutu pembelajaran kelas rangkap & lembar pengesahan.",
  },
};

export function ReportHubWorkspace({
  initialReportData,
  initialType,
  school,
  currentUser,
  multigradeGroups,
  subjects,
  students,
  exportHistories,
}: ReportHubWorkspaceProps) {
  const [activeType, setActiveType] = useState<ReportType>(initialType);
  const [reportData, setReportData] = useState<AnyReportData>(initialReportData);
  const [viewMode, setViewMode] = useState<"preview" | "history" | "new_journal">("preview");

  // Filter States
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ""
  );

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Journal Form State
  const [journalForm, setJournalForm] = useState({
    date: new Date().toISOString().split("T")[0],
    groupId: multigradeGroups[0]?.id || "group-a",
    subjectId: subjects[0]?.id || "matematika",
    allocatedHours: 2,
    lowerGrade: 1,
    higherGrade: 2,
    lowerGradeTpCode: "TP-MAT-1.1",
    lowerGradeTpText: "Membilang bilangan cacah 1-20",
    higherGradeTpCode: "TP-MAT-2.1",
    higherGradeTpText: "Nilai tempat bilangan sampai 100",
    rotationActivityDescription:
      "Guru membimbing Kelas 1 memanipulasi kartu bilangan konkret saat Kelas 2 eksplorasi mandiri.",
    attendancePresent: 9,
    attendanceSick: 0,
    attendancePermit: 0,
    attendanceAbsent: 0,
    learningEvidenceSummary: "Siswa tuntas memahami konsep dasar.",
    challengesEncountered: "Tidak ada kendala berarti.",
    teacherReflection: "Rotasi berjalan tertib dan tepat waktu.",
    nextActionPlan: "Lanjutkan latihan pada LKPD berikutnya.",
  });
  const [journalSuccess, setJournalSuccess] = useState<string | null>(null);

  // Build export query string
  const buildExportUrl = (format: "pdf" | "docx" | "xlsx") => {
    const params = new URLSearchParams({
      type: activeType,
      format,
    });
    if (selectedGroup) params.append("groupId", selectedGroup);
    if (selectedSubject) params.append("subjectId", selectedSubject);
    if (activeType === "kemajuan_siswa" && selectedStudentId) {
      params.append("studentId", selectedStudentId);
    }
    return `/api/reports/export?${params.toString()}`;
  };

  const handlePrint = () => {
    window.print();
  };

  // Submit New Teaching Journal
  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setJournalSuccess(null);

    startTransition(async () => {
      try {
        const res = await createTeachingJournalAction(journalForm);
        if (res.success) {
          setJournalSuccess("Jurnal mengajar kelas rangkap berhasil dicatat ke database!");
          setTimeout(() => {
            setViewMode("preview");
            window.location.reload();
          }, 1200);
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Hub Laporan */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden print:hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider">
              <School className="w-3.5 h-3.5" />
              {school.name} &bull; NPSN {school.npsn}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pusat Laporan &amp; Ekspor Resmi Multigrade
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Menyediakan 10 jenis dokumen kurikulum, jurnal harian, dan asesmen nyata.
              Format siap cetak A4 (PDF), dokumen penyuntingan (DOCX), serta rekap data tabular (XLSX).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold shadow transition-all border border-slate-700"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              Cetak A4 Layar
            </button>
            <a
              href={buildExportUrl("pdf")}
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all"
            >
              <Download className="w-4 h-4" />
              Unduh PDF
            </a>
            <a
              href={buildExportUrl("docx")}
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
            >
              <FileDown className="w-4 h-4" />
              Unduh DOCX
            </a>
            <a
              href={buildExportUrl("xlsx")}
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Unduh XLSX
            </a>
          </div>
        </div>
      </div>

      {/* 2. Selektor 10 Tipe Laporan (Horizontal Scroll di HP, Grid di Desktop) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {(Object.keys(REPORT_TYPE_CONFIG) as ReportType[]).map((typeKey) => {
            const cfg = REPORT_TYPE_CONFIG[typeKey];
            const Icon = cfg.icon;
            const isActive = activeType === typeKey;

            return (
              <button
                key={typeKey}
                onClick={() => {
                  setActiveType(typeKey);
                  window.location.href = `/dashboard/laporan?type=${typeKey}`;
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Panel Kontrol Filter & Tab Tampilan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 print:hidden">
        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Kelompok Belajar Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Kelompok:</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">Semua Kelompok</option>
              {multigradeGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.grades})
                </option>
              ))}
            </select>
          </div>

          {/* Mata Pelajaran Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Mapel:</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">Semua Mapel</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Siswa Selector (khusus laporan kemajuan_siswa) */}
          {activeType === "kemajuan_siswa" && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Siswa:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  window.location.href = `/dashboard/laporan?type=kemajuan_siswa&studentId=${e.target.value}`;
                }}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    [{st.studentCode}] {st.fullName} (Kls {st.classId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("preview")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "preview"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pratinjau A4
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "history"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Riwayat Versi ({exportHistories.length})
          </button>
          {activeType === "jurnal_mengajar" && (
            <button
              onClick={() => setViewMode("new_journal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "new_journal"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              + Input Jurnal Baru
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4. Konten Utama Berdasarkan View Mode */}
      {viewMode === "preview" && (
        /* Kertas A4 Simulasi Layar (Print Friendly Layout) */
        <div className="bg-white border border-slate-300 shadow-lg rounded-xl max-w-4xl mx-auto p-8 sm:p-12 text-slate-900 print:border-none print:shadow-none print:p-0 print:max-w-none">
          {/* KOP Surat Resmi SDN SEDAENG II TOSARI */}
          <div className="text-center pb-4 border-b-2 border-black space-y-1">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
              Pemerintah Kabupaten Pasuruan &bull; Dinas Pendidikan dan Kebudayaan
            </h4>
            <h2 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-slate-950">
              {school.name}
            </h2>
            <p className="text-[11px] text-slate-700 italic">
              {school.address} &bull; NPSN: {school.npsn} &bull; Email: {school.email}
            </p>
          </div>
          <div className="border-b border-black mt-0.5 mb-6"></div>

          {/* Judul Laporan */}
          <div className="text-center space-y-1 mb-6">
            <h3 className="text-base sm:text-lg font-black uppercase tracking-wide">
              {reportData.title}
            </h3>
            <p className="text-xs text-slate-600 font-medium italic">
              {reportData.subtitle}
            </p>
            <div className="pt-2 text-[11px] font-mono text-slate-700 flex flex-wrap items-center justify-center gap-3">
              <span>Tahun Ajaran: <strong>{reportData.metadata.academicYear}</strong></span>
              <span>&bull;</span>
              <span>Semester: <strong>{reportData.metadata.semester}</strong></span>
              <span>&bull;</span>
              <span>Versi: <strong>v{reportData.metadata.version}</strong></span>
              <span>&bull;</span>
              <span>Tanggal: <strong>{reportData.signature.dateFormatted}</strong></span>
            </div>
          </div>

          {/* Tabel Konten Dinamis */}
          <div className="overflow-x-auto my-6">
            <ReportContentRenderer data={reportData} />
          </div>

          {/* Catatan Pedagogis jika Kemajuan Belajar Siswa */}
          {reportData.reportType === "kemajuan_siswa" && (
            <div className="my-6 p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-xs space-y-1 print:bg-white print:border-slate-800">
              <p className="font-bold">Catatan Pedagogis Resmi:</p>
              <p className="italic leading-relaxed">
                {(reportData as any).nonNumericalMasteryDisclaimer}
              </p>
            </div>
          )}

          {/* Blok Tanda Tangan Resmi Pengesahan */}
          <div className="grid grid-cols-2 gap-8 pt-10 text-xs text-center border-t border-slate-200 mt-10 print:border-none">
            <div className="space-y-16">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">{reportData.signature.headmasterTitle}</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">
                  {reportData.signature.headmasterName}
                </p>
                <p>NIP. {reportData.signature.headmasterNip}</p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p>
                  {reportData.signature.location},{" "}
                  {reportData.signature.dateFormatted}
                </p>
                <p className="font-bold">{reportData.signature.teacherTitle}</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">
                  {reportData.signature.teacherName}
                </p>
                <p>NIP. {reportData.signature.teacherNip}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat Versi Dokumen */}
      {viewMode === "history" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Log Riwayat Versi Ekspor Dokumen
            </h3>
            <span className="text-xs text-slate-500">
              Menampilkan {exportHistories.length} berkas terakhir
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Waktu Ekspor</th>
                  <th className="p-3">Jenis Laporan</th>
                  <th className="p-3">Format</th>
                  <th className="p-3">Versi</th>
                  <th className="p-3">Ukuran</th>
                  <th className="p-3">Dibuat Oleh</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Checksum SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {exportHistories.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 font-sans italic">
                      Belum ada riwayat berkas yang diekspor.
                    </td>
                  </tr>
                ) : (
                  exportHistories.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/70">
                      <td className="p-3 text-slate-500 font-sans">
                        {new Date(h.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 font-sans">
                        {h.title}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            h.format === "pdf"
                              ? "bg-rose-100 text-rose-800"
                              : h.format === "docx"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {h.format}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">v{h.version}</td>
                      <td className="p-3 font-sans">
                        {h.fileSizeBytes > 0
                          ? `${(h.fileSizeBytes / 1024).toFixed(1)} KB`
                          : "-"}
                      </td>
                      <td className="p-3 font-sans text-slate-600">
                        {h.generatedByName || "-"}
                      </td>
                      <td className="p-3">
                        {h.status === "success" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-sans font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-sans font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" /> Gagal
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 text-[10px] truncate max-w-xs">
                        {h.checksum ? h.checksum.slice(0, 16) + "..." : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Formulir Input Jurnal Mengajar Baru */}
      {viewMode === "new_journal" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Catat Jurnal Pembelajaran Kelas Rangkap Hari Ini
          </h3>

          {journalSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{journalSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveJournal} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Kegiatan</label>
                <input
                  type="date"
                  required
                  value={journalForm.date}
                  onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kelompok Belajar</label>
                <select
                  value={journalForm.groupId}
                  onChange={(e) => {
                    const g = e.target.value;
                    const parsed = g === "group-a" ? [1, 2] : g === "group-b" ? [3, 4] : [5, 6];
                    setJournalForm({
                      ...journalForm,
                      groupId: g,
                      lowerGrade: parsed[0],
                      higherGrade: parsed[1],
                    });
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                >
                  {multigradeGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.grades})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mata Pelajaran</label>
                <select
                  value={journalForm.subjectId}
                  onChange={(e) => setJournalForm({ ...journalForm, subjectId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Uraian Rotasi Kelas Rangkap (Staggered)</label>
              <textarea
                required
                rows={3}
                value={journalForm.rotationActivityDescription}
                onChange={(e) => setJournalForm({ ...journalForm, rotationActivityDescription: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5 leading-relaxed"
                placeholder="Deskripsikan pergerakan bimbingan langsung guru vs aktivitas mandiri siswa..."
              />
            </div>

            <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-[11px]">Hadir (Anak)</label>
                <input
                  type="number"
                  min={0}
                  value={journalForm.attendancePresent}
                  onChange={(e) => setJournalForm({ ...journalForm, attendancePresent: parseInt(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded p-1.5 text-center font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-[11px]">Sakit</label>
                <input
                  type="number"
                  min={0}
                  value={journalForm.attendanceSick}
                  onChange={(e) => setJournalForm({ ...journalForm, attendanceSick: parseInt(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded p-1.5 text-center"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-[11px]">Izin</label>
                <input
                  type="number"
                  min={0}
                  value={journalForm.attendancePermit}
                  onChange={(e) => setJournalForm({ ...journalForm, attendancePermit: parseInt(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded p-1.5 text-center"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-[11px]">Alpa</label>
                <input
                  type="number"
                  min={0}
                  value={journalForm.attendanceAbsent}
                  onChange={(e) => setJournalForm({ ...journalForm, attendanceAbsent: parseInt(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded p-1.5 text-center"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Refleksi Guru Pengampu</label>
              <textarea
                required
                rows={2}
                value={journalForm.teacherReflection}
                onChange={(e) => setJournalForm({ ...journalForm, teacherReflection: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2"
                placeholder="Bagaimana efektivitas bimbingan dan respon peserta didik?"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Rencana Tindak Lanjut Pertemuan Berikutnya</label>
              <input
                type="text"
                required
                value={journalForm.nextActionPlan}
                onChange={(e) => setJournalForm({ ...journalForm, nextActionPlan: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2"
                placeholder="Contoh: Penguatan konsep nilai tempat bagi 2 siswa..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Simpan Jurnal Mengajar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * Komponen Renderer Tabel untuk masing-masing tipe laporan
 */
function ReportContentRenderer({ data }: { data: AnyReportData }) {
  switch (data.reportType) {
    case "atp_multigrade":
      return (
        <table className="w-full text-left text-xs border-collapse border border-slate-800">
          <thead className="bg-slate-100 font-bold border-b border-slate-800">
            <tr>
              <th className="border border-slate-800 p-2 text-center w-8">No</th>
              <th className="border border-slate-800 p-2 w-28">Kode TP</th>
              <th className="border border-slate-800 p-2">Tujuan Pembelajaran (Kompetensi)</th>
              <th className="border border-slate-800 p-2 text-center w-20">Sasaran</th>
              <th className="border border-slate-800 p-2 text-center w-16">JP</th>
              <th className="border border-slate-800 p-2">Catatan Rotasi Multigrade</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it) => (
              <tr key={it.sequenceOrder} className="border-b border-slate-300">
                <td className="border border-slate-800 p-2 text-center font-bold">{it.sequenceOrder}</td>
                <td className="border border-slate-800 p-2 font-mono font-semibold">{it.tpCode}</td>
                <td className="border border-slate-800 p-2">{it.tpDescription}</td>
                <td className="border border-slate-800 p-2 text-center">Kelas {it.targetGrade}</td>
                <td className="border border-slate-800 p-2 text-center font-bold">{it.allocatedHours}</td>
                <td className="border border-slate-800 p-2 text-slate-700">{it.multigradeNotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "irisan_materi":
      return (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-300 rounded">
            <div>
              <p className="font-bold">Tema Bersama:</p>
              <p className="text-slate-800">{data.theme}</p>
            </div>
            <div>
              <p className="font-bold">Strategi Pengelompokan:</p>
              <p className="capitalize font-semibold text-blue-700">{data.intersectionType.replace("_", " ")}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse border border-slate-800">
            <thead className="bg-slate-100 font-bold border-b border-slate-800">
              <tr>
                <th className="border border-slate-800 p-2 text-center w-8">No</th>
                <th className="border border-slate-800 p-2 w-32">Langkah Pembelajaran</th>
                <th className="border border-slate-800 p-2 text-center w-16">Waktu</th>
                <th className="border border-slate-800 p-2">Aktivitas Kelas {data.lowerGrade}</th>
                <th className="border border-slate-800 p-2">Aktivitas Kelas {data.higherGrade}</th>
              </tr>
            </thead>
            <tbody>
              {data.rotationSteps.map((st) => (
                <tr key={st.stepNumber} className="border-b border-slate-300">
                  <td className="border border-slate-800 p-2 text-center font-bold">{st.stepNumber}</td>
                  <td className="border border-slate-800 p-2 font-semibold">{st.stepName}</td>
                  <td className="border border-slate-800 p-2 text-center">{st.durationMinutes}&apos;</td>
                  <td className="border border-slate-800 p-2">{st.lowerGradeActivity}</td>
                  <td className="border border-slate-800 p-2">{st.higherGradeActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "modul_ajar":
      return (
        <div className="space-y-4 text-xs">
          <table className="w-full text-left border-collapse border border-slate-800">
            <thead className="bg-slate-100 font-bold border-b border-slate-800">
              <tr>
                <th className="border border-slate-800 p-2 text-center w-8">No</th>
                <th className="border border-slate-800 p-2 w-28">Langkah Rotasi</th>
                <th className="border border-slate-800 p-2 text-center w-14">Waktu</th>
                <th className="border border-slate-800 p-2 w-36">Peran Guru</th>
                <th className="border border-slate-800 p-2">Aktivitas Kls Rendah</th>
                <th className="border border-slate-800 p-2">Aktivitas Kls Tinggi</th>
              </tr>
            </thead>
            <tbody>
              {data.rotationSteps.map((st) => (
                <tr key={st.stepNumber} className="border-b border-slate-300">
                  <td className="border border-slate-800 p-2 text-center font-bold">{st.stepNumber}</td>
                  <td className="border border-slate-800 p-2 font-semibold">{st.stepName}</td>
                  <td className="border border-slate-800 p-2 text-center">{st.durationMinutes}&apos;</td>
                  <td className="border border-slate-800 p-2 text-slate-800">{st.teacherRole}</td>
                  <td className="border border-slate-800 p-2">{st.lowerGradeActivity}</td>
                  <td className="border border-slate-800 p-2">{st.higherGradeActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "lkpd":
      return (
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-300 rounded space-y-1">
            <p className="font-bold">Stimulus Pembelajaran:</p>
            <p className="italic leading-relaxed">{data.stimulusText}</p>
          </div>
          <table className="w-full text-left border-collapse border border-slate-800">
            <thead className="bg-slate-100 font-bold border-b border-slate-800">
              <tr>
                <th className="border border-slate-800 p-2 text-center w-12">No</th>
                <th className="border border-slate-800 p-2 w-28">Tipe Soal</th>
                <th className="border border-slate-800 p-2">Instruksi &amp; Pertanyaan</th>
                <th className="border border-slate-800 p-2 text-center w-16">Poin</th>
              </tr>
            </thead>
            <tbody>
              {data.questions.map((q) => (
                <tr key={q.number} className="border-b border-slate-300">
                  <td className="border border-slate-800 p-2 text-center font-bold">{q.number}</td>
                  <td className="border border-slate-800 p-2 uppercase text-[10px] font-semibold">{q.type}</td>
                  <td className="border border-slate-800 p-2">{q.questionText}</td>
                  <td className="border border-slate-800 p-2 text-center font-bold">{q.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "jurnal_mengajar":
      return (
        <table className="w-full text-left text-xs border-collapse border border-slate-800">
          <thead className="bg-slate-100 font-bold border-b border-slate-800">
            <tr>
              <th className="border border-slate-800 p-2 w-24">Tanggal</th>
              <th className="border border-slate-800 p-2 w-28">Kelompok / Tingkat</th>
              <th className="border border-slate-800 p-2 w-24">Mata Pelajaran</th>
              <th className="border border-slate-800 p-2">Uraian Rotasi &amp; Pembelajaran</th>
              <th className="border border-slate-800 p-2 text-center w-20">Kehadiran</th>
              <th className="border border-slate-800 p-2 w-48">Refleksi &amp; Tindak Lanjut</th>
            </tr>
          </thead>
          <tbody>
            {data.journals.map((j, idx) => (
              <tr key={idx} className="border-b border-slate-300">
                <td className="border border-slate-800 p-2 font-mono">{j.date}</td>
                <td className="border border-slate-800 p-2">
                  <div className="font-bold">{j.groupName}</div>
                  <div className="text-[10px] text-slate-600">{j.grades}</div>
                </td>
                <td className="border border-slate-800 p-2 font-semibold">{j.subjectName}</td>
                <td className="border border-slate-800 p-2 text-slate-800 leading-relaxed">
                  {j.rotationDescription}
                </td>
                <td className="border border-slate-800 p-2 text-center">
                  <span className="font-bold text-emerald-800">{j.attendance.present}</span> hadir
                </td>
                <td className="border border-slate-800 p-2 text-[11px]">
                  <p className="italic">&ldquo;{j.teacherReflection}&rdquo;</p>
                  <p className="font-semibold text-blue-900 mt-1">&rarr; {j.nextActionPlan}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "rekap_asesmen":
      return (
        <table className="w-full text-left text-xs border-collapse border border-slate-800">
          <thead className="bg-slate-100 font-bold border-b border-slate-800">
            <tr>
              <th className="border border-slate-800 p-2">Judul Sesi</th>
              <th className="border border-slate-800 p-2 w-24">Tipe</th>
              <th className="border border-slate-800 p-2 w-28">Mapel</th>
              <th className="border border-slate-800 p-2 text-center w-16">Kode TP</th>
              <th className="border border-slate-800 p-2 text-center w-14">Jml</th>
              <th className="border border-slate-800 p-2 text-center w-14">Rata2</th>
              <th className="border border-slate-800 p-2 text-center w-40">PB / C / B / SB</th>
            </tr>
          </thead>
          <tbody>
            {data.sessions.map((s, idx) => (
              <tr key={idx} className="border-b border-slate-300">
                <td className="border border-slate-800 p-2 font-semibold">{s.title}</td>
                <td className="border border-slate-800 p-2 uppercase text-[10px]">{s.assessmentType}</td>
                <td className="border border-slate-800 p-2">{s.subjectName}</td>
                <td className="border border-slate-800 p-2 text-center font-mono font-bold">{s.tpCode}</td>
                <td className="border border-slate-800 p-2 text-center">{s.totalAssessed}</td>
                <td className="border border-slate-800 p-2 text-center font-bold">{s.averageScore}</td>
                <td className="border border-slate-800 p-2 text-center font-mono text-[11px]">
                  {s.masteryDistribution.perluBimbingan} / {s.masteryDistribution.cukup} / {s.masteryDistribution.baik} / {s.masteryDistribution.sangatBaik}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "kemajuan_siswa":
      return (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-300 rounded text-center">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Nama Siswa</p>
              <p className="font-bold text-slate-900">{data.student.fullName}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Kode Identitas</p>
              <p className="font-bold text-slate-900 font-mono">{data.student.studentCode}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Kelas &amp; Kelompok</p>
              <p className="font-bold text-slate-900">Kelas {data.student.classId} ({data.student.groupName})</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Tingkat Penguasaan</p>
              <p className="font-bold text-blue-700">{data.masterySummary.masteryPercentage}% TP Tuntas</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse border border-slate-800">
            <thead className="bg-slate-100 font-bold border-b border-slate-800">
              <tr>
                <th className="border border-slate-800 p-2 w-28">Mata Pelajaran</th>
                <th className="border border-slate-800 p-2 w-24 text-center">Kode TP</th>
                <th className="border border-slate-800 p-2 w-28 text-center">Kriteria</th>
                <th className="border border-slate-800 p-2 text-center w-14">Skor</th>
                <th className="border border-slate-800 p-2">Bukti Belajar Nyata (Evidence)</th>
                <th className="border border-slate-800 p-2 w-36">Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody>
              {data.tpRecords.map((r, idx) => (
                <tr key={idx} className="border-b border-slate-300">
                  <td className="border border-slate-800 p-2 font-semibold">{r.subjectName}</td>
                  <td className="border border-slate-800 p-2 text-center font-mono font-bold">{r.tpCode}</td>
                  <td className="border border-slate-800 p-2 text-center uppercase text-[10px] font-semibold">
                    {r.masteryLevel.replace("_", " ")}
                  </td>
                  <td className="border border-slate-800 p-2 text-center font-bold">
                    {r.score !== null ? r.score : "-"}
                  </td>
                  <td className="border border-slate-800 p-2">{r.evidence}</td>
                  <td className="border border-slate-800 p-2 text-[11px] capitalize">
                    {r.followUpType.replace(/_/g, " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "ketercapaian_tp":
      return (
        <table className="w-full text-left text-xs border-collapse border border-slate-800">
          <thead className="bg-slate-100 font-bold border-b border-slate-800">
            <tr>
              <th className="border border-slate-800 p-2 w-28">Mapel</th>
              <th className="border border-slate-800 p-2 text-center w-16">Fase/Kls</th>
              <th className="border border-slate-800 p-2 text-center w-20">Kode TP</th>
              <th className="border border-slate-800 p-2">Rumusan Kompetensi TP</th>
              <th className="border border-slate-800 p-2 text-center w-14">Tuntas</th>
              <th className="border border-slate-800 p-2 text-center w-14">%</th>
              <th className="border border-slate-800 p-2 w-48">Rekomendasi Alur</th>
            </tr>
          </thead>
          <tbody>
            {data.tpStats.map((t, idx) => (
              <tr key={idx} className="border-b border-slate-300">
                <td className="border border-slate-800 p-2 font-semibold">{t.subjectName}</td>
                <td className="border border-slate-800 p-2 text-center font-mono text-[11px]">
                  {t.phase} &bull; Kls {t.grade}
                </td>
                <td className="border border-slate-800 p-2 text-center font-mono font-bold">{t.tpCode}</td>
                <td className="border border-slate-800 p-2">{t.competency}</td>
                <td className="border border-slate-800 p-2 text-center font-bold">{t.masteredCount}</td>
                <td className="border border-slate-800 p-2 text-center font-bold text-blue-800">
                  {t.masteryPercentage}%
                </td>
                <td className="border border-slate-800 p-2 text-[11px] text-slate-700">
                  {t.statusRecommendation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "daftar_tindak_lanjut":
      return (
        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-rose-800 uppercase tracking-wider mb-2">
              Antrean Remedial Terbimbing (Perlu Bimbingan Konkret):
            </h4>
            <table className="w-full text-left border-collapse border border-slate-800">
              <thead className="bg-rose-50 font-bold border-b border-slate-800 text-rose-950">
                <tr>
                  <th className="border border-slate-800 p-2 w-28">Kode Siswa</th>
                  <th className="border border-slate-800 p-2 w-32">Nama Siswa</th>
                  <th className="border border-slate-800 p-2 w-28">Mapel</th>
                  <th className="border border-slate-800 p-2 text-center w-20">Kode TP</th>
                  <th className="border border-slate-800 p-2">Temuan Bukti Belajar</th>
                  <th className="border border-slate-800 p-2">Rencana Aksi Remedial</th>
                  <th className="border border-slate-800 p-2 text-center w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.remedialQueue.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-300">
                    <td className="border border-slate-800 p-2 font-mono font-semibold">{r.studentCode}</td>
                    <td className="border border-slate-800 p-2 font-medium">{r.studentName}</td>
                    <td className="border border-slate-800 p-2">{r.subjectName}</td>
                    <td className="border border-slate-800 p-2 text-center font-mono">{r.tpCode}</td>
                    <td className="border border-slate-800 p-2 text-slate-700">{r.evidence}</td>
                    <td className="border border-slate-800 p-2">{r.actionPlan}</td>
                    <td className="border border-slate-800 p-2 text-center">
                      {r.isCompleted ? (
                        <span className="text-emerald-700 font-bold">Tuntas</span>
                      ) : (
                        <span className="text-amber-700 font-bold">Aktif</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold text-emerald-800 uppercase tracking-wider mb-2">
              Peluang Pengayaan Eksploratif (Sangat Baik / HOTS Bromo):
            </h4>
            <table className="w-full text-left border-collapse border border-slate-800">
              <thead className="bg-emerald-50 font-bold border-b border-slate-800 text-emerald-950">
                <tr>
                  <th className="border border-slate-800 p-2 w-28">Kode Siswa</th>
                  <th className="border border-slate-800 p-2 w-32">Nama Siswa</th>
                  <th className="border border-slate-800 p-2 w-28">Mapel</th>
                  <th className="border border-slate-800 p-2 text-center w-20">Kode TP</th>
                  <th className="border border-slate-800 p-2">Capaian Unggul</th>
                  <th className="border border-slate-800 p-2">Rencana Tantangan Pengayaan</th>
                  <th className="border border-slate-800 p-2 text-center w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.enrichmentQueue.map((e, idx) => (
                  <tr key={idx} className="border-b border-slate-300">
                    <td className="border border-slate-800 p-2 font-mono font-semibold">{e.studentCode}</td>
                    <td className="border border-slate-800 p-2 font-medium">{e.studentName}</td>
                    <td className="border border-slate-800 p-2">{e.subjectName}</td>
                    <td className="border border-slate-800 p-2 text-center font-mono">{e.tpCode}</td>
                    <td className="border border-slate-800 p-2 text-slate-700">{e.evidence}</td>
                    <td className="border border-slate-800 p-2">{e.challengePlan}</td>
                    <td className="border border-slate-800 p-2 text-center">
                      {e.isCompleted ? (
                        <span className="text-emerald-700 font-bold">Tuntas</span>
                      ) : (
                        <span className="text-blue-700 font-bold">Berjalan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "ringkasan_kepala_sekolah":
      return (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-300 rounded text-center">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Peserta Didik Aktif</p>
              <p className="font-extrabold text-slate-900 text-sm">{data.kpiStats.totalStudents} Siswa</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Guru Pengampu</p>
              <p className="font-extrabold text-slate-900 text-sm">{data.kpiStats.totalTeachers} Guru</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Kehadiran Kelas</p>
              <p className="font-extrabold text-emerald-700 text-sm">{data.kpiStats.overallAttendanceRatePct}%</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Rata-rata Ketuntasan</p>
              <p className="font-extrabold text-blue-700 text-sm">{data.kpiStats.overallTpMasteryRatePct}%</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse border border-slate-800">
            <thead className="bg-slate-100 font-bold border-b border-slate-800">
              <tr>
                <th className="border border-slate-800 p-2 w-32">Kelompok Belajar</th>
                <th className="border border-slate-800 p-2 w-28">Tingkatan</th>
                <th className="border border-slate-800 p-2">Guru Pengampu</th>
                <th className="border border-slate-800 p-2 text-center w-20">Jurnal Log</th>
                <th className="border border-slate-800 p-2 text-center w-24">Ketuntasan</th>
                <th className="border border-slate-800 p-2 text-center w-20">Remedial</th>
                <th className="border border-slate-800 p-2 text-center w-20">Pengayaan</th>
              </tr>
            </thead>
            <tbody>
              {data.groupPerformance.map((gp) => (
                <tr key={gp.groupId} className="border-b border-slate-300">
                  <td className="border border-slate-800 p-2 font-bold">{gp.groupName}</td>
                  <td className="border border-slate-800 p-2">Kelas {gp.grades}</td>
                  <td className="border border-slate-800 p-2">{gp.leadTeacher}</td>
                  <td className="border border-slate-800 p-2 text-center font-bold">{gp.totalJournalsLogged} log</td>
                  <td className="border border-slate-800 p-2 text-center font-bold text-blue-800">
                    {gp.masteryPercentage}%
                  </td>
                  <td className="border border-slate-800 p-2 text-center font-semibold text-rose-700">
                    {gp.remedialPendingCount} anak
                  </td>
                  <td className="border border-slate-800 p-2 text-center font-semibold text-emerald-700">
                    {gp.enrichmentCount} anak
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-3 bg-slate-50 border border-slate-300 rounded space-y-1">
            <p className="font-bold">Pernyataan Pengesahan Supervisi Kepala Sekolah:</p>
            <p className="italic leading-relaxed">{data.headmasterEndorsementStatement}</p>
          </div>
        </div>
      );
  }
}
