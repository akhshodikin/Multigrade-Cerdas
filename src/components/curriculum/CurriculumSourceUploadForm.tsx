"use client";

import React, { useState } from "react";
import { Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { importCurriculumSourceAction } from "@/app/actions/curriculum";

export function CurriculumSourceUploadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fileType, setFileType] = useState("pdf");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file") as File | null;

    // Proteksi batas ukuran request serverless (4.5 MB)
    const MAX_SERVERLESS_SIZE = 4.5 * 1024 * 1024;
    if (file && file.size > MAX_SERVERLESS_SIZE) {
      setErrorMessage(
        `Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas pengunggahan langsung cloud (maks 4.5 MB). Silakan gunakan format 'Input Teks Manual' untuk menyalin teks/rangkuman dokumen, atau kompres file PDF terlebih dahulu.`
      );
      return;
    }

    setLoading(true);
    try {
      const result = await importCurriculumSourceAction(formData);

      if (!result.success) {
        setErrorMessage(result.error || "Gagal mengimpor dokumen sumber.");
      } else {
        setSuccessMessage(result.message || "Dokumen berhasil disimpan sebagai Draf.");
        form.reset();
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Terjadi kesalahan sistem: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Upload className="w-4 h-4 text-blue-600" />
        <span>Impor Dokumen Sumber Baru (PDF, DOCX, XLSX, atau Manual)</span>
      </h3>

      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Gagal Menyimpan Dokumen:</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Berhasil:</p>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
            Judul Dokumen Resmi
          </label>
          <input
            type="text"
            name="title"
            required
            disabled={loading}
            placeholder="Contoh: Keputusan Kepala BSKAP No. 032/H/KR/2024 tentang Capaian Pembelajaran"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100"
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
            disabled={loading}
            placeholder="032/H/KR/2024"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100"
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
            disabled={loading}
            defaultValue="BSKAP Kemendikbudristek"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100"
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
            disabled={loading}
            defaultValue={2024}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
            Format Berkas
          </label>
          <select
            name="fileType"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            required
            disabled={loading}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100"
          >
            <option value="pdf">PDF (.pdf)</option>
            <option value="docx">Word (.docx)</option>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="manual">Input Teks Manual</option>
          </select>
        </div>

        {fileType !== "manual" && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Unggah Berkas ({fileType.toUpperCase()})
            </label>
            <input
              type="file"
              name="file"
              accept={fileType === "pdf" ? ".pdf" : fileType === "docx" ? ".docx" : ".xlsx,.xls"}
              required={fileType !== "manual"}
              disabled={loading}
              className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Batas ukuran maksimal cloud: 4.5 MB. Untuk dokumen besar, Anda dapat memilih format &quot;Input Teks Manual&quot;.
            </p>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
            {fileType === "manual" ? "Teks Dokumen Manual (Wajib Diisi)" : "Catatan Tambahan Sumber / Kutipan Tertentu (Opsional)"}
          </label>
          <textarea
            name="manualText"
            rows={4}
            required={fileType === "manual"}
            disabled={loading}
            placeholder={
              fileType === "manual"
                ? "Tempelkan rumusan Capaian Pembelajaran atau isi teks dokumen resmi di sini..."
                : "Catatan nomor halaman atau kutipan penting jika ada..."
            }
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-xs disabled:bg-slate-100"
          />
        </div>

        <div className="sm:col-span-2 pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses & Menyimpan Dokumen...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Simpan Dokumen Sumber (Status Draf)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
