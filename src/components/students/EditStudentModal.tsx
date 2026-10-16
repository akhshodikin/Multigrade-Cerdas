"use client";

import React, { useState, useTransition } from "react";
import { Edit2, X, CheckCircle2, AlertTriangle, Save } from "lucide-react";
import { updateStudentAction } from "@/app/actions/students";

export interface StudentData {
  id: string;
  studentCode: string;
  fullName: string;
  displayName: string;
  classId: number;
  groupId: string;
  gender: string;
  birthDate?: string | null;
  guardianName?: string | null;
  isActive: boolean;
  notes?: string | null;
}

interface EditStudentModalProps {
  student: StudentData;
}

export function EditStudentModal({ student }: EditStudentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      setResult(null);
      const res = await updateStudentAction(student.id, formData);
      if (res.success) {
        setResult({ success: true, message: res.message });
        setTimeout(() => {
          setIsOpen(false);
          setResult(null);
        }, 1200);
      } else {
        setResult({
          success: false,
          message: res.message,
          errors: (res as any).errors,
        });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResult(null);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 transition"
        title={`Edit Data Siswa ${student.fullName}`}
      >
        <Edit2 className="w-3 h-3" />
        <span>Edit</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 text-left">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Data Siswa</h3>
                  <p className="text-[11px] text-slate-500">{student.fullName} ({student.studentCode})</p>
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1" suppressHydrationWarning>
              {result && (
                <div
                  className={`p-3 rounded-xl text-xs space-y-1 border ${
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
                  {result.errors && (
                    <ul className="list-disc list-inside text-[11px] text-rose-700">
                      {Object.entries(result.errors).map(([field, msgs]) => (
                        <li key={field}>{msgs.join(", ")}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kode Siswa */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Kode Siswa
                  </label>
                  <input
                    type="text"
                    name="studentCode"
                    required
                    defaultValue={student.studentCode}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                {/* Nama Panggilan */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nama Panggilan
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    required
                    defaultValue={student.displayName}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                {/* Nama Lengkap */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    defaultValue={student.fullName}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                {/* Kelas Asal */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Kelas Asal
                  </label>
                  <select
                    name="classId"
                    required
                    defaultValue={student.classId}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  >
                    <option value="1">Kelas 1 (Kelompok A)</option>
                    <option value="2">Kelas 2 (Kelompok A)</option>
                    <option value="3">Kelas 3 (Kelompok B)</option>
                    <option value="4">Kelas 4 (Kelompok B)</option>
                    <option value="5">Kelas 5 (Kelompok C)</option>
                    <option value="6">Kelas 6 (Kelompok C)</option>
                  </select>
                </div>

                {/* Jenis Kelamin */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    name="gender"
                    required
                    defaultValue={student.gender}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    defaultValue={student.birthDate || ""}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                {/* Nama Wali */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nama Wali / Orang Tua
                  </label>
                  <input
                    type="text"
                    name="guardianName"
                    defaultValue={student.guardianName || ""}
                    placeholder="Nama bapak/ibu wali"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                {/* Status Keaktifan */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Status Siswa
                  </label>
                  <select
                    name="isActive"
                    defaultValue={student.isActive ? "true" : "false"}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  >
                    <option value="true">Aktif Mengikuti Pembelajaran</option>
                    <option value="false">Nonaktif / Mutasi</option>
                  </select>
                </div>

                {/* Catatan Kebutuhan / Minat */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Catatan Kebutuhan / Minat Belajar
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={student.notes || ""}
                    placeholder="Observasi minat belajar atau pendampingan khusus..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* Footer Modal */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
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
