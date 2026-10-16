import React from "react";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Lock, Mail, School, ShieldCheck } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <School className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Multigrade Cerdas AI
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-blue-200">
          SDN SEDAENG II Tosari &bull; Manajemen Pembelajaran Kelas Rangkap
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMessage}
            </div>
          )}

          <form action={loginAction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  placeholder="nama@sedaeng2.sch.id"
                  defaultValue="admin@sedaeng2.sch.id"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  defaultValue="Sedaeng2#Tosari"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Masuk ke Sistem</span>
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-600 mb-2">Akun Uji Coba Cepat (Password: Sedaeng2#Tosari):</p>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <button
                type="button"
                onClick={undefined}
                className="text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 flex justify-between items-center text-slate-700"
              >
                <span><strong>Admin:</strong> admin@sedaeng2.sch.id</span>
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">Admin</span>
              </button>
              <button
                type="button"
                onClick={undefined}
                className="text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 flex justify-between items-center text-slate-700"
              >
                <span><strong>Kepsek:</strong> kepsek@sedaeng2.sch.id</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Kepsek</span>
              </button>
              <button
                type="button"
                onClick={undefined}
                className="text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 flex justify-between items-center text-slate-700"
              >
                <span><strong>Guru A (Kls 1-2):</strong> guru.a@sedaeng2.sch.id</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Guru A</span>
              </button>
              <button
                type="button"
                onClick={undefined}
                className="text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 flex justify-between items-center text-slate-700"
              >
                <span><strong>Guru B (Kls 3-4):</strong> guru.b@sedaeng2.sch.id</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">Guru B</span>
              </button>
              <button
                type="button"
                onClick={undefined}
                className="text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 flex justify-between items-center text-slate-700"
              >
                <span><strong>Guru C (Kls 5-6):</strong> guru.c@sedaeng2.sch.id</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">Guru C</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
