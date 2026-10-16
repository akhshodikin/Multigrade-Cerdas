import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { createAcademicTermAction, setActiveAcademicTermAction } from "@/app/actions/school";
import { Calendar, CheckCircle, Plus, ShieldAlert } from "lucide-react";

export default async function PengaturanSemesterPage() {
  const user = await getCurrentUser();
  const isAuthorized = user?.role === "admin" || user?.role === "headmaster";

  const terms = await db.select().from(schema.academicTerms).orderBy(desc(schema.academicTerms.createdAt));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Pengaturan Tahun Ajaran &amp; Semester
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola periode kalender pendidikan aktif untuk kegiatan multigrade
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
          <Calendar className="w-6 h-6" />
        </div>
      </div>

      {!isAuthorized && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Hanya Administrator dan Kepala Sekolah yang memiliki akses untuk mengubah tahun ajaran dan semester aktif.</span>
        </div>
      )}

      {/* List of Terms */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Daftar Tahun Ajaran &amp; Semester</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {terms.map((term) => (
            <div key={term.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">
                    Tahun Ajaran {term.year}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                    Semester {term.semester}
                  </span>
                  {term.isActive && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Aktif
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Periode: {term.startDate || "Belum diatur"} s/d {term.endDate || "Belum diatur"}
                </div>
              </div>

              {isAuthorized && !term.isActive && (
                <form
                  action={async () => {
                    "use server";
                    await setActiveAcademicTermAction(term.id);
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                  >
                    Aktifkan Periode Ini
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Add New Term */}
      {isAuthorized && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Tambah Tahun Ajaran Baru</span>
          </h3>

          <form
            action={async (formData: FormData) => {
              "use server";
              await createAcademicTermAction(formData);
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Tahun Ajaran
              </label>
              <input
                type="text"
                name="year"
                placeholder="2025/2026"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Semester
              </label>
              <select
                name="semester"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                name="startDate"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                name="endDate"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Periode Baru</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
