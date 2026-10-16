import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import {
  createTujuanPembelajaranAction,
  updateTpStatusAction,
} from "@/app/actions/curriculum";
import {
  Target,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";

export default async function TujuanPembelajaranPage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string }>;
}) {
  const user = await getCurrentUser();
  const isHeadmasterOrAdmin = user?.role === "headmaster" || user?.role === "admin";

  const resolvedParams = await searchParams;
  const filterFase = resolvedParams?.fase || null;

  const tps = await db.select().from(schema.tujuanPembelajaran).orderBy(asc(schema.tujuanPembelajaran.code));
  const cps = await db.select().from(schema.capaianPembelajaran);
  const subjects = await db.select().from(schema.subjects);

  const filteredTps = tps.filter((tp) => {
    if (filterFase && tp.phase !== filterFase) return false;
    return true;
  });

  const statusBadges: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    draft: { label: "Draf", color: "bg-amber-50 text-amber-800 border-amber-300", icon: Clock },
    in_review: { label: "Ditelaah", color: "bg-blue-50 text-blue-800 border-blue-300", icon: AlertCircle },
    approved: { label: "Disetujui Sah", color: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: CheckCircle2 },
    rejected: { label: "Ditolak", color: "bg-rose-50 text-rose-800 border-rose-300", icon: XCircle },
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Bank Tujuan Pembelajaran (TP)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Penjabaran kompetensi dan lingkup materi berdasarkan Capaian Pembelajaran Kurikulum Merdeka
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
          <Target className="w-6 h-6" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Fase:
        </span>
        <a
          href="/dashboard/kurikulum/tp"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            !filterFase ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Semua ({tps.length})
        </a>
        <a
          href="/dashboard/kurikulum/tp?fase=Fase+A"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterFase === "Fase A" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Fase A (Kls 1-2)
        </a>
        <a
          href="/dashboard/kurikulum/tp?fase=Fase+B"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterFase === "Fase B" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Fase B (Kls 3-4)
        </a>
        <a
          href="/dashboard/kurikulum/tp?fase=Fase+C"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterFase === "Fase C" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Fase C (Kls 5-6)
        </a>
      </div>

      {/* List of TPs */}
      <div className="space-y-4">
        {filteredTps.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            Belum ada Tujuan Pembelajaran yang terdaftar untuk filter ini.
          </div>
        ) : (
          filteredTps.map((tp) => {
            const badge = statusBadges[tp.verificationStatus] || {
              label: tp.verificationStatus,
              color: "bg-slate-100 text-slate-800",
              icon: Clock,
            };
            const StatusIcon = badge.icon;
            const subject = subjects.find((s) => s.id === tp.subjectId);
            const linkedCp = cps.find((c) => c.id === tp.cpId);

            return (
              <div
                key={tp.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3 hover:border-slate-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                      {tp.code}
                    </span>
                    <span className="font-bold text-sm text-slate-900">{subject ? subject.name : tp.subjectId}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                      {tp.phase} {tp.targetGrade ? `(Kelas ${tp.targetGrade})` : ""}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${badge.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {badge.label}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div><strong>Kompetensi:</strong> {tp.competency}</div>
                  <div><strong>Lingkup Materi:</strong> {tp.contentScope}</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                  <strong>Rumusan TP:</strong> &ldquo;{tp.description}&rdquo;
                </div>

                {linkedCp && (
                  <div className="text-[11px] text-slate-500">
                    <strong>Rujukan Elemen CP:</strong> {linkedCp.element} &bull; {linkedCp.sourcePage || "-"}
                  </div>
                )}

                {/* Approval actions */}
                <div className="pt-2 flex justify-end gap-2 text-xs border-t border-slate-100">
                  {tp.verificationStatus === "draft" && (
                    <form
                      action={async () => {
                        "use server";
                        const fd = new FormData();
                        fd.set("status", "in_review");
                        await updateTpStatusAction(tp.id, fd);
                      }}
                    >
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                      >
                        Ajukan Penelaahan
                      </button>
                    </form>
                  )}

                  {isHeadmasterOrAdmin && tp.verificationStatus !== "approved" && (
                    <form
                      action={async () => {
                        "use server";
                        const fd = new FormData();
                        fd.set("status", "approved");
                        await updateTpStatusAction(tp.id, fd);
                      }}
                    >
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Setujui Sah
                      </button>
                    </form>
                  )}

                  {isHeadmasterOrAdmin && tp.verificationStatus !== "rejected" && (
                    <form
                      action={async () => {
                        "use server";
                        const fd = new FormData();
                        fd.set("status", "rejected");
                        await updateTpStatusAction(tp.id, fd);
                      }}
                    >
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                      >
                        Tolak
                      </button>
                    </form>
                  )}

                  <Link
                    href={`/dashboard/kurikulum/tp/${tp.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition inline-flex items-center gap-1"
                  >
                    Buka Editor TP &amp; Prasyarat &rarr;
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Add New TP */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-purple-600" />
          <span>Tambah Tujuan Pembelajaran Baru</span>
        </h3>

        <form
          action={async (formData: FormData) => {
            "use server";
            await createTujuanPembelajaranAction(formData);
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Kode TP (Unik)
            </label>
            <input
              type="text"
              name="code"
              required
              placeholder="TP-MAT-B.3-03"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Mata Pelajaran
            </label>
            <select
              name="subjectId"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:outline-none"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Fase Kurikulum
            </label>
            <select
              name="phase"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:outline-none"
            >
              <option value="Fase A">Fase A (Kelas 1 &amp; 2)</option>
              <option value="Fase B">Fase B (Kelas 3 &amp; 4)</option>
              <option value="Fase C">Fase C (Kelas 5 &amp; 6)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Target Tingkat Kelas
            </label>
            <select
              name="targetGrade"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:outline-none"
            >
              <option value="">-- Fleksibel dalam Fase --</option>
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
              <option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option>
              <option value="6">Kelas 6</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Kompetensi Utama
            </label>
            <input
              type="text"
              name="competency"
              required
              placeholder="Contoh: Menentukan nilai tempat ratusan"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Lingkup Materi / Konten
            </label>
            <input
              type="text"
              name="contentScope"
              required
              placeholder="Contoh: Bilangan cacah sampai 1.000"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Rujukan Capaian Pembelajaran (CP)
            </label>
            <select
              name="cpId"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:outline-none"
            >
              <option value="">-- Tidak Ditautkan ke CP Khusus --</option>
              {cps.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.subjectId.toUpperCase()} &bull; {cp.phase} &bull; Elemen {cp.element} ({cp.sourcePage || "-"})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Rumusan Lengkap Tujuan Pembelajaran
            </label>
            <textarea
              name="description"
              rows={3}
              required
              placeholder="Peserta didik mampu..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3 pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Tujuan Pembelajaran (Status Draf)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
