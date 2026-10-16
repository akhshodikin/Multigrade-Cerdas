import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateSchoolProfileAction } from "@/app/actions/school";
import { School, Save, ShieldAlert } from "lucide-react";

export default async function ProfilSekolahPage() {
  const user = await getCurrentUser();
  const isAuthorized = user?.role === "admin" || user?.role === "headmaster";

  const profile = await db.select().from(schema.schoolProfile).where(eq(schema.schoolProfile.id, 1));
  const school = profile[0];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Profil SDN SEDAENG II Tosari
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pengaturan identitas resmi sekolah dan tahun ajaran operasional
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
          <School className="w-6 h-6" />
        </div>
      </div>

      {!isAuthorized && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Anda masuk sebagai Guru Pengampu. Anda dapat melihat informasi profil sekolah, namun hanya Administrator dan Kepala Sekolah yang memiliki wewenang untuk menyunting.</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form
          action={async (formData: FormData) => {
            "use server";
            await updateSchoolProfileAction(formData);
          }}
          className="space-y-6"
          suppressHydrationWarning
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Resmi Sekolah
              </label>
              <input
                type="text"
                name="name"
                required
                disabled={!isAuthorized}
                defaultValue={school?.name || "SDN SEDAENG II Tosari"}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                NPSN (Nomor Pokok Sekolah Nasional)
              </label>
              <input
                type="text"
                name="npsn"
                required
                maxLength={8}
                disabled={!isAuthorized}
                defaultValue={school?.npsn || "20519000"}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                suppressHydrationWarning
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Alamat Lengkap Sekolah
              </label>
              <textarea
                name="address"
                required
                rows={2}
                disabled={!isAuthorized}
                defaultValue={school?.address || "Dusun Sedaeng, Desa Sedaeng, Kec. Tosari, Kab. Pasuruan, Jawa Timur 67177"}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Kepala Sekolah
              </label>
              <input
                type="text"
                name="headmasterName"
                required
                disabled={!isAuthorized}
                defaultValue={school?.headmasterName || "Bambang Sutrisno, S.Pd., M.Pd."}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                name="headmasterNip"
                disabled={!isAuthorized}
                defaultValue={school?.headmasterNip || "197508122000031002"}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                name="phone"
                disabled={!isAuthorized}
                defaultValue={school?.phone || "081234567890"}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Alamat Email Sekolah
              </label>
              <input
                type="email"
                name="email"
                disabled={!isAuthorized}
                defaultValue={school?.email || "sdnsedaeng2tosari@gmail.com"}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tahun Ajaran Aktif
              </label>
              <input
                type="text"
                name="activeAcademicYear"
                required
                disabled={!isAuthorized}
                defaultValue={school?.activeAcademicYear || "2024/2025"}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Semester Aktif
              </label>
              <select
                name="activeSemester"
                disabled={!isAuthorized}
                defaultValue={school?.activeSemester || "Ganjil"}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>
          </div>

          {isAuthorized && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Profil</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
