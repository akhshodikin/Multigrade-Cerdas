"use client";

import React, { useState, useTransition } from "react";
import { Download, Upload, FileSpreadsheet, X, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { importUsersFromXlsxAction } from "@/app/actions/users";

interface UserExcelActionsProps {
  isAdmin: boolean;
}

export function UserExcelActions({ isAdmin }: UserExcelActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    warnings?: string[];
  } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      setResult(null);
      const res = await importUsersFromXlsxAction(formData);
      setResult({
        success: res.success,
        message: res.message,
        warnings: res.warnings || (res as any).errors,
      });

      if (res.success) {
        form.reset();
      }
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Tombol Unduh Data Guru/GTK */}
        <a
          href="/api/users/export"
          download
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
          title="Unduh Daftar Pendidik &amp; Staf ke Berkas Excel (.xlsx)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh Excel</span>
        </a>

        {isAdmin && (
          <>
            {/* Tombol Unduh Format Template */}
            <a
              href="/api/users/template"
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition"
              title="Unduh Lembar Template Excel untuk Pengisian Data Guru &amp; GTK"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Format Template</span>
            </a>

            {/* Tombol Buka Modal Unggah */}
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setIsOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Data (XLSX)</span>
            </button>
          </>
        )}
      </div>

      {/* Modal Dialog Unggah XLSX */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Unggah Data Guru &amp; GTK (Excel .xlsx)</h3>
                  <p className="text-[11px] text-slate-500">Impor massal akun pendidik dan staf SDN SEDAENG II TOSARI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form & Petunjuk */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4" suppressHydrationWarning>
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <HelpCircle className="w-4 h-4" />
                  <span>Petunjuk Impor Data GTK:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800/90">
                  <li>Kolom <strong>Email</strong> bersifat unik sebagai ID login akun.</li>
                  <li>Jika email sudah terdaftar, profil pengguna akan <em>diperbarui</em>.</li>
                  <li>Kolom <strong>Peran</strong>: <code>teacher</code> (Guru), <code>headmaster</code> (Kepala Sekolah), atau <code>admin</code> (Administrator).</li>
                  <li>Kolom <strong>Kelompok Pengampu</strong> diisi untuk Guru: <code>group-a</code>, <code>group-b</code>, atau <code>group-c</code>.</li>
                  <li>Kata sandi awal otomatis disetel ke default aman jika kolom dikosongkan.</li>
                </ul>
              </div>

              {/* Feedback Hasil */}
              {result && (
                <div
                  className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                    result.success
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                      : "bg-rose-50 text-rose-900 border-rose-200"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    )}
                    <span>{result.message}</span>
                  </div>
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="text-[11px] text-slate-700 pt-1 space-y-0.5 border-t border-slate-200/60">
                      <p className="font-semibold text-amber-800">Catatan Validasi Baris:</p>
                      <ul className="list-disc list-inside max-h-28 overflow-y-auto space-y-0.5 font-mono text-[10px]">
                        {result.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Input Berkas */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Pilih Berkas Spreadsheet (.xlsx)
                </label>
                <input
                  type="file"
                  name="file"
                  required
                  accept=".xlsx,.xls"
                  className="w-full text-xs file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-xl p-1.5 cursor-pointer bg-slate-50"
                  suppressHydrationWarning
                />
              </div>

              {/* Footer Modal */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Memproses Data...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Proses &amp; Simpan Data GTK</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default UserExcelActions;
