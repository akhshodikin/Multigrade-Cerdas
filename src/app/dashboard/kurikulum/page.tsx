import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  Layers,
  BookOpen,
  FileText,
  CheckSquare,
  Target,
  GitCommit,
  Download,
  History,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default async function KurikulumHubPage() {
  const user = await getCurrentUser();

  const sources = await db.select().from(schema.curriculumSources);
  const cps = await db.select().from(schema.capaianPembelajaran);
  const tps = await db.select().from(schema.tujuanPembelajaran);
  const atps = await db.select().from(schema.atpPlans);
  const subjects = await db.select().from(schema.subjects);
  const materialMaps = await db.select().from(schema.multigradeMaterialMaps);

  // Hitung status
  const approvedCpCount = cps.filter((c) => c.verificationStatus === "approved").length;
  const draftCpCount = cps.filter((c) => c.verificationStatus === "draft").length;
  const approvedTpCount = tps.filter((t) => t.verificationStatus === "approved").length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold mb-2 uppercase tracking-wider">
            Kurikulum Merdeka Multigrade
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bank Kurikulum Cerdas AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Penyimpanan terstruktur dan terlacak untuk Dokumen Sumber, CP Verbatim, TP, dan Alur Tujuan Pembelajaran (ATP)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/dashboard/kurikulum/ekspor"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Kurikulum</span>
          </a>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{sources.length}</div>
            <div className="text-xs font-semibold text-slate-500">Dokumen Sumber</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{cps.length}</div>
            <div className="text-xs font-semibold text-slate-500">
              Capaian (CP) &bull; {approvedCpCount} Sah
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{tps.length}</div>
            <div className="text-xs font-semibold text-slate-500">
              Tujuan (TP) &bull; {approvedTpCount} Sah
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <GitCommit className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{atps.length}</div>
            <div className="text-xs font-semibold text-slate-500">Rencana ATP</div>
          </div>
        </div>
      </div>

      {/* Navigation Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a
          href="/dashboard/kurikulum/sumber"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition group block"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
            1. Dokumen Sumber Resmi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Impor dokumen PDF, DOCX, XLSX, atau manual dengan nomor regulasi sah (Keputusan BSKAP No. 032/H/KR/2024).
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-blue-600 gap-1">
            <span>Buka Dokumen Sumber</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </a>

        <a
          href="/dashboard/kurikulum/cp"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition group block"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <CheckSquare className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition">
            2. Capaian Pembelajaran (CP)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Rumusan teks verbatim dari dokumen asli, penandaan elemen, deteksi duplikasi SHA-256, dan persetujuan.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 gap-1">
            <span>Buka Bank CP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </a>

        <a
          href="/dashboard/kurikulum/tp"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-purple-400 hover:shadow-md transition group block"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition">
            3. Tujuan Pembelajaran (TP)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Turunan kompetensi dan materi per tingkatan kelas (1-6) dan fase (A, B, C) dengan status verifikasi.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-purple-600 gap-1">
            <span>Buka Bank TP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </a>

        <a
          href="/dashboard/kurikulum/atp"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition group block"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <GitCommit className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition">
            4. Alur Tujuan Pembelajaran (ATP)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Urutan pedagogis TP, alokasi jam pelajaran (JP), semester, dan catatan diferensiasi multigrade.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-amber-600 gap-1">
            <span>Buka Alur ATP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </a>

        <a
          href="/dashboard/kurikulum/irisan-materi"
          className="bg-white p-6 rounded-2xl border-2 border-indigo-200 shadow-sm hover:border-indigo-500 hover:shadow-md transition group block bg-gradient-to-br from-indigo-50/30 to-white"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 group-hover:scale-105 transition shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
              5. Irisan Materi Multigrade (AI)
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700">
              {materialMaps.length} Pemetaan
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Analisis kesamaan konsep dan keterkaitan kompetensi antar tingkatan kelas (Kelompok A, B, C) dengan rekomendasi terpadu vs terpisah paralel.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-indigo-600 gap-1">
            <span>Kelola Irisan Materi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </a>

        <a
          href="/dashboard/kurikulum/versi"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition group block"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <History className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
            6. Riwayat Versi &amp; Komparasi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pemeriksaan audit perubahan data kurikulum dan perbandingan komparatif antar versi.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-indigo-600 gap-1">
            <span>Buka Riwayat Versi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </a>

        <a
          href="/dashboard/kurikulum/validasi"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition group block"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition">
            6. Pusat Validasi Kurikulum
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Audit mesin penjaminan mutu otomatis: relasi CP-TP-ATP, alur prasyarat, alokasi jam, dan laporan kelayakan teknis.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 gap-1">
            <span>Buka Pusat Validasi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </a>

        <a
          href="/dashboard/kurikulum/ekspor"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-400 hover:shadow-md transition group block"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Download className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition">
            7. Ekspor Data Kurikulum
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Unduh data kurikulum sah dalam format JSON terstruktur untuk backup atau integrasi modul lain.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-rose-600 gap-1">
            <span>Buka Portal Ekspor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </a>
      </div>
    </div>
  );
}
