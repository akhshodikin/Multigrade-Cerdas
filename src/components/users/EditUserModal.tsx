"use client";

import React, { useState, useTransition } from "react";
import { Edit2, X, CheckCircle2, AlertTriangle, Save } from "lucide-react";
import { updateUserAction } from "@/app/actions/users";

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: "admin" | "headmaster" | "teacher";
  nip?: string | null;
  phone?: string | null;
  assignedGroupId?: string | null;
  isActive: boolean;
}

interface EditUserModalProps {
  user: UserData;
  isAdmin: boolean;
}

export function EditUserModal({ user, isAdmin }: EditUserModalProps) {
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
      const res = await updateUserAction(user.id, formData);
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
        title={`Edit Data Guru / GTK ${user.name}`}
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
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Data Guru &amp; Tenaga Pendidik</h3>
                  <p className="text-[11px] text-slate-500">{user.name} ({user.email})</p>
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
                {/* Nama Lengkap */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nama Lengkap &amp; Gelar
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={user.name}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                {/* Email Akun */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Akun Login
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={user.email}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50"
                    suppressHydrationWarning
                  />
                </div>

                {/* NIP */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    NIP (18 Digit)
                  </label>
                  <input
                    type="text"
                    name="nip"
                    defaultValue={user.nip || ""}
                    placeholder="Contoh: 19860315..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                {/* No Telepon / WA */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    No Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={user.phone || ""}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                {/* Peran Sistem */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Peran Sistem
                  </label>
                  <select
                    name="role"
                    required
                    defaultValue={user.role}
                    disabled={!isAdmin}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100"
                    suppressHydrationWarning
                  >
                    <option value="teacher">Guru Pengampu</option>
                    <option value="headmaster">Kepala Sekolah</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {/* Kelompok Pengampu */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Kelompok yang Ditugaskan
                  </label>
                  <select
                    name="assignedGroupId"
                    defaultValue={user.assignedGroupId || ""}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  >
                    <option value="">- Tidak Ditugaskan ke Kelompok -</option>
                    <option value="group-a">Kelompok A (Kelas 1 dan 2)</option>
                    <option value="group-b">Kelompok B (Kelas 3 dan 4)</option>
                    <option value="group-c">Kelompok C (Kelas 5 dan 6)</option>
                  </select>
                </div>

                {/* Status Akun */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Status Akun Pengguna
                  </label>
                  <select
                    name="isActive"
                    defaultValue={user.isActive ? "true" : "false"}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    suppressHydrationWarning
                  >
                    <option value="true">Aktif (Dapat Login ke Sistem)</option>
                    <option value="false">Nonaktif (Akses Masuk Diblokir)</option>
                  </select>
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
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
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
