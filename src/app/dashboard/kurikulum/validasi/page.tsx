import React from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Check,
  RotateCcw,
  Sliders,
  Sparkles,
} from "lucide-react";
import { updateIssueResolutionAction } from "@/app/actions/validation";
import { PEDAGOGICAL_DISCLAIMER, DEFAULT_VALIDATION_CONFIG } from "@/lib/curriculum/validation-engine";

export const dynamic = "force-dynamic";

export default async function ValidationCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string; status?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const severityFilter = resolvedSearchParams?.severity;
  const statusFilter = resolvedSearchParams?.status || "terbuka";

  // 1. Ambil seluruh masalah validasi
  const allIssues = await db
    .select()
    .from(schema.validationIssues)
    .orderBy(desc(schema.validationIssues.createdAt));

  // 2. Ambil seluruh laporan validasi terakhir
  const reports = await db
    .select()
    .from(schema.validationReports)
    .orderBy(desc(schema.validationReports.createdAt))
    .limit(5);

  // 3. Ambil data ATP aktif untuk tautan cepat
  const atpPlans = await db.select().from(schema.atpPlans);
  const atpMap = new Map(atpPlans.map((a) => [a.id, a]));

  // 4. Hitung statistik
  const totalIssuesCount = allIssues.length;
  const criticalCount = allIssues.filter((i) => i.severity === "kritis" && i.resolutionStatus === "terbuka").length;
  const warningCount = allIssues.filter((i) => i.severity === "peringatan" && i.resolutionStatus === "terbuka").length;
  const infoCount = allIssues.filter((i) => i.severity === "info" && i.resolutionStatus === "terbuka").length;
  const resolvedCount = allIssues.filter((i) => i.resolutionStatus === "selesai").length;

  // 5. Terapkan filter
  let filteredIssues = allIssues;
  if (severityFilter && severityFilter !== "all") {
    filteredIssues = filteredIssues.filter((i) => i.severity === severityFilter);
  }
  if (statusFilter && statusFilter !== "all") {
    filteredIssues = filteredIssues.filter((i) => i.resolutionStatus === statusFilter);
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
            Penjaminan Mutu &amp; Integritas Data
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-blue-600" /> Pusat Validasi Kurikulum
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Audit struktural, relasi CP–TP–ATP, urutan sekuensial, dan kepatuhan prasyarat kelas rangkap SDN Sedaeng II
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/kurikulum/atp"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-sm"
          >
            Buka Alur ATP &rarr;
          </Link>
        </div>
      </div>

      {/* Banner Peringatan Pedagogis Mutlak */}
      <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-900 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs leading-relaxed">
          <span className="font-bold uppercase tracking-wider text-amber-800">
            Penegasan Pedagogis SDN SEDAENG II Tosari:
          </span>
          <p>{PEDAGOGICAL_DISCLAIMER}</p>
        </div>
      </div>

      {/* Ringkasan Status Validasi */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Kritis */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Masalah Kritis Terbuka</span>
            <span className="text-2xl font-extrabold text-rose-600">{criticalCount}</span>
            <span className="text-[11px] text-slate-400 block">Menghambat persetujuan</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Peringatan */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Catatan Peringatan</span>
            <span className="text-2xl font-extrabold text-amber-600">{warningCount}</span>
            <span className="text-[11px] text-slate-400 block">Perlu peninjauan guru</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Info & Asistensi AI */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Saran &amp; Catatan AI</span>
            <span className="text-2xl font-extrabold text-blue-600">{infoCount}</span>
            <span className="text-[11px] text-slate-400 block">Rekomendasi telaah</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Info className="w-5 h-5" />
          </div>
        </div>

        {/* Selesai / Teratasi */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Telah Terselesaikan</span>
            <span className="text-2xl font-extrabold text-emerald-600">{resolvedCount}</span>
            <span className="text-[11px] text-slate-400 block">Terselesaikan oleh guru</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Bagian: Aturan Validasi yang Dapat Dikonfigurasi */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-600" />
          Konfigurasi Aturan Validasi Aktif
        </h3>
        <p className="text-xs text-slate-500">
          Aturan penjaminan mutu kurikulum yang diterapkan oleh mesin validasi otomatis pada setiap tahapan alur.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Dasar CP Wajib Terhubung
            </div>
            <p className="text-slate-600 text-[11px]">Memastikan setiap TP memiliki dasar CP induk yang sah (*anti-orphan*).</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Kesesuaian Fase &amp; Mata Pelajaran
            </div>
            <p className="text-slate-600 text-[11px]">Memastikan CP, TP, dan alur ATP berada pada mata pelajaran dan fase yang serasi.</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Urutan Sekuensial Rapat
            </div>
            <p className="text-slate-600 text-[11px]">Mendeteksi nomor urut ganda, celah urutan bolong, atau urutan tanpa butir.</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Kepatuhan Alur Prasyarat
            </div>
            <p className="text-slate-600 text-[11px]">Prasyarat wajib diajarkan pada nomor urut sebelum kompetensi lanjutan.</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Deteksi Siklus Melingkar
            </div>
            <p className="text-slate-600 text-[11px]">Mencegah ketergantungan prasyarat sirkular (A &rarr; B &rarr; A) dengan algoritma DFS.</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Toleransi Alokasi Jam (&plusmn;20%)
            </div>
            <p className="text-slate-600 text-[11px]">Mengingatkan pendidik jika total jam menyimpang lebih dari 20% target tahunan.</p>
          </div>
        </div>
      </div>

      {/* Bagian: Daftar Masalah Validasi & Tindakan Penyelesaian */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Daftar Masalah &amp; Rekomendasi Perbaikan ({filteredIssues.length})
            </h2>
            <p className="text-xs text-slate-500">
              Teliti setiap temuan teknis dan tandai sebagai selesai setelah penyesuaian dilakukan.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <Link
              href="/dashboard/kurikulum/validasi?status=terbuka"
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                statusFilter === "terbuka"
                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Terbuka
            </Link>
            <Link
              href="/dashboard/kurikulum/validasi?status=selesai"
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                statusFilter === "selesai"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Selesai
            </Link>
            <Link
              href="/dashboard/kurikulum/validasi?status=all"
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                statusFilter === "all"
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua
            </Link>
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Masalah Validasi yang Cocok</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Seluruh data kurikulum untuk filter ini berada dalam kondisi konsisten dan memenuhi standar teknis.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 rounded-xl border text-xs space-y-3 transition ${
                  issue.resolutionStatus === "selesai"
                    ? "bg-emerald-50/40 border-emerald-200 opacity-80"
                    : issue.severity === "kritis"
                    ? "bg-rose-50/50 border-rose-300"
                    : issue.severity === "peringatan"
                    ? "bg-amber-50/50 border-amber-300"
                    : "bg-blue-50/50 border-blue-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        issue.severity === "kritis"
                          ? "bg-rose-200 text-rose-900"
                          : issue.severity === "peringatan"
                          ? "bg-amber-200 text-amber-900"
                          : "bg-blue-200 text-blue-900"
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {issue.ruleCode}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{issue.title}</h4>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      issue.resolutionStatus === "selesai"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : issue.resolutionStatus === "diabaikan"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-rose-100 text-rose-800 border border-rose-300"
                    }`}
                  >
                    Status: {issue.resolutionStatus.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-700">
                  <div className="md:col-span-2 space-y-1">
                    <p className="leading-relaxed">{issue.description}</p>
                    <div className="p-2 bg-white rounded border border-slate-200 text-slate-800 text-[11px]">
                      <strong>💡 Rekomendasi Perbaikan:</strong> {issue.recommendation}
                    </div>
                  </div>

                  <div className="space-y-1 text-slate-500 text-[11px] border-l border-slate-200 pl-3">
                    <div>
                      <strong>Lokasi:</strong> {issue.sourceLocation}
                    </div>
                    <div>
                      <strong>Entitas:</strong> {issue.entityType.toUpperCase()} ({issue.entityId.slice(0, 8)}...)
                    </div>
                    {issue.resolutionNotes && (
                      <div className="text-emerald-700">
                        <strong>Catatan:</strong> {issue.resolutionNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tombol Perubahan Status Penyelesaian */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {issue.entityType === "atp_plan" || issue.entityType === "atp_item" ? (
                      <Link
                        href={`/dashboard/kurikulum/atp/${issue.entityId}`}
                        className="font-semibold text-blue-600 hover:text-blue-800 text-xs inline-flex items-center gap-1"
                      >
                        Buka Editor ATP Terkait &rarr;
                      </Link>
                    ) : issue.entityType === "tp" ? (
                      <Link
                        href={`/dashboard/kurikulum/tp/${issue.entityId}`}
                        className="font-semibold text-blue-600 hover:text-blue-800 text-xs inline-flex items-center gap-1"
                      >
                        Buka Editor TP Terkait &rarr;
                      </Link>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {issue.resolutionStatus !== "selesai" ? (
                      <form
                        action={async () => {
                          "use server";
                          await updateIssueResolutionAction(issue.id, "selesai", "Diselesaikan oleh pendidik.");
                        }}
                      >
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition inline-flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Tandai Selesai
                        </button>
                      </form>
                    ) : (
                      <form
                        action={async () => {
                          "use server";
                          await updateIssueResolutionAction(issue.id, "terbuka", "Dibuka kembali untuk verifikasi.");
                        }}
                      >
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Buka Kembali
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bagian: Riwayat Laporan Audit Terakhir */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          Riwayat Laporan Validasi Tersimpan ({reports.length})
        </h3>
        {reports.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Belum ada laporan audit validasi yang disimpan permanen.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-slate-800">{rep.title}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {rep.summary} &bull; Peninjau: {rep.reviewedByName || "Otomatis"} &bull;{" "}
                    {new Date(rep.createdAt).toLocaleDateString("id-ID")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-rose-700">{rep.criticalCount} Kritis</span> &bull;{" "}
                  <span className="font-semibold text-amber-700">{rep.warningCount} Peringatan</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
