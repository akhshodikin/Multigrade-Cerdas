import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { importCurriculumSourceAction } from "@/app/actions/curriculum";
import { FileText, Upload, AlertTriangle, CheckCircle, Clock, ShieldAlert } from "lucide-react";

export default async function DokumenSumberPage() {
  const user = await getCurrentUser();
  const sources = await db.select().from(schema.curriculumSources).orderBy(desc(schema.curriculumSources.createdAt));

  const statusBadges: Record<string, { label: string; color: string }> = {
    draft: { label: "Draf (Belum Diverifikasi)", color: "bg-amber-100 text-amber-800 border-amber-200" },
    verified: { label: "Terverifikasi Sah", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    rejected: { label: "Ditolak", color: "bg-rose-100 text-rose-800 border-rose-200" },
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Dokumen Sumber Kurikulum Merdeka
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Penyimpanan dan verifikasi dokumen acuan sah (Keputusan BSKAP No. 032/H/KR/2024 dan regulasi terkait)
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
          <FileText className="w-6 h-6" />
        </div>
      </div>

      {/* Rules Notice */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1">
        <div className="font-bold flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-blue-700" />
          <span>Aturan Integritas Sumber Dokumen:</span>
        </div>
        <p>1. Data yang baru diimpor wajib berstatus <strong>Draf</strong> sampai diperiksa dan diverifikasi oleh Kepala Sekolah atau Pengawas.</p>
        <p>2. Jika hasil ekstraksi otomatis dicurigai tidak lengkap atau meragukan, sistem otomatis menandai dokumen dengan <em>Perlu Pemeriksaan Manual</em>.</p>
        <p>3. Dilarang mengarang nomor dokumen atau referensi hukum.</p>
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-900">Daftar Dokumen Sumber ({sources.length})</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {sources.map((src) => {
            const badge = statusBadges[src.status] || { label: src.status, color: "bg-slate-100 text-slate-800" };

            return (
              <div key={src.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{src.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                      {badge.label}
                    </span>
                    {src.needsManualReview && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Perlu Pemeriksaan Manual
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                    <span><strong>Nomor:</strong> {src.documentNumber}</span>
                    <span><strong>Penerbit:</strong> {src.issuingAuthority}</span>
                    <span><strong>Tahun:</strong> {src.publicationYear}</span>
                    <span><strong>Tipe:</strong> {src.fileType.toUpperCase()}</span>
                    <span><strong>Versi:</strong> {src.version}</span>
                  </div>

                  {src.extractedText && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono line-clamp-2">
                      {src.extractedText}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400">
                    Diimpor pada: {new Date(src.createdAt).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload / Import Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-600" />
          <span>Impor Dokumen Sumber Baru (PDF, DOCX, XLSX, atau Manual)</span>
        </h3>

        <form
          action={async (formData: FormData) => {
            "use server";
            await importCurriculumSourceAction(formData);
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Judul Dokumen Resmi
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="Contoh: Keputusan Kepala BSKAP No. 032/H/KR/2024 tentang Capaian Pembelajaran"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Nomor Dokumen Regulasi
            </label>
            <input
              type="text"
              name="documentNumber"
              required
              placeholder="032/H/KR/2024"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Lembaga Penerbit
            </label>
            <input
              type="text"
              name="issuingAuthority"
              required
              defaultValue="BSKAP Kemendikbudristek"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Tahun Terbit
            </label>
            <input
              type="number"
              name="publicationYear"
              required
              defaultValue={2024}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Format Berkas
            </label>
            <select
              name="fileType"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="pdf">PDF (.pdf)</option>
              <option value="docx">Word (.docx)</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="manual">Input Teks Manual</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Unggah Berkas (Jika Menggunakan File)
            </label>
            <input
              type="file"
              name="file"
              accept=".pdf,.docx,.xlsx"
              className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Teks Dokumen Manual / Catatan Tambahan Sumber
            </label>
            <textarea
              name="manualText"
              rows={3}
              placeholder="Salin teks dokumen atau catatan kutipan resmi jika tidak mengunggah berkas..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-xs"
            />
          </div>

          <div className="sm:col-span-2 pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Simpan Dokumen Sumber (Status Draf)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
