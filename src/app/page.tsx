import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { LogIn, LayoutDashboard, ArrowRight, ShieldCheck } from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto">
      <header className="mb-10 border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-2 tracking-wide uppercase">
              Fondasi Aplikasi &amp; Pengelolaan Data Sekolah (Tahap 1)
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Multigrade Cerdas AI
            </h1>
            <p className="text-slate-600 mt-1 text-base">
              SDN SEDAENG II Tosari &bull; Manajemen Pembelajaran Kelas Rangkap Berbasis Kurikulum Merdeka
            </p>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <a
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Buka Dashboard ({user.name})</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <a
                href="/login"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Sistem</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 inline-block px-2 py-0.5 rounded mb-2">
            Kelompok A &bull; Fase A
          </div>
          <h2 className="text-xl font-bold text-slate-800">Kelas 1 &amp; Kelas 2</h2>
          <p className="text-sm text-slate-600 mt-2">
            Fokus: Literasi &amp; Numerasi dasar, modul visual, instruksi suara/audio, diferensiasi konten pemula.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Status Pengelolaan:</span>
            <span className="font-semibold text-emerald-600">Siap Dikelola</span>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded mb-2">
            Kelompok B &bull; Fase B
          </div>
          <h2 className="text-xl font-bold text-slate-800">Kelas 3 &amp; Kelas 4</h2>
          <p className="text-sm text-slate-600 mt-2">
            Fokus: Penguatan konsep kontekstual, IPAS awal, latihan bertingkat mandiri &amp; kolaboratif sebaya.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Status Pengelolaan:</span>
            <span className="font-semibold text-emerald-600">Siap Dikelola</span>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 inline-block px-2 py-0.5 rounded mb-2">
            Kelompok C &bull; Fase C
          </div>
          <h2 className="text-xl font-bold text-slate-800">Kelas 5 &amp; Kelas 6</h2>
          <p className="text-sm text-slate-600 mt-2">
            Fokus: Literasi kritis, pemecahan masalah numerasi kompleks, kepemimpinan tutor sebaya multigrade.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Status Pengelolaan:</span>
            <span className="font-semibold text-emerald-600">Siap Dikelola</span>
          </div>
        </div>
      </section>

      <section className="bg-slate-100 rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-3">
          Prinsip Desain Operasional Sekolah Terpencil (27 Siswa)
        </h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">&check;</span>
            <span><strong>Basis Data PostgreSQL &amp; Drizzle ORM:</strong> Data tersimpan persisten di server dengan relasi kelas asal &amp; kelompok multigrade yang konsisten.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">&check;</span>
            <span><strong>Autentikasi &amp; RBAC Server-Side:</strong> Akses guru, kepala sekolah, dan administrator divalidasi ketat pada lapisan server.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">&check;</span>
            <span><strong>Audit Trail Mutasi Data:</strong> Setiap pembaruan profil, pendaftaran siswa, dan perubahan semester tercatat dalam log audit.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">&check;</span>
            <span><strong>Responsif HP Android &amp; Laptop:</strong> Antarmuka dapat dioperasikan nyaman melalui smartphone guru maupun laptop kelas.</span>
          </li>
        </ul>
      </section>
    </main>
  );
}
