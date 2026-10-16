import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import {
  createCapaianPembelajaranAction,
  updateCpStatusAction,
} from "@/app/actions/curriculum";
import {
  CheckSquare,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export default async function CapaianPembelajaranPage({
  searchParams,
}: {
  searchParams: Promise<{ mapel?: string; fase?: string }>;
}) {
  const user = await getCurrentUser();
  const isHeadmasterOrAdmin = user?.role === "headmaster" || user?.role === "admin";

  const resolvedParams = await searchParams;
  const filterMapel = resolvedParams?.mapel || null;
  const filterFase = resolvedParams?.fase || null;

  const subjects = await db.select().from(schema.subjects).orderBy(asc(schema.subjects.name));
  const sources = await db.select().from(schema.curriculumSources);
  const cps = await db.select().from(schema.capaianPembelajaran).orderBy(asc(schema.capaianPembelajaran.subjectId), asc(schema.capaianPembelajaran.phase));

  const filteredCps = cps.filter((cp) => {
    if (filterMapel && cp.subjectId !== filterMapel) return false;
    if (filterFase && cp.phase !== filterFase) return false;
    return true;
  });

  const statusBadges: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    draft: { label: "Draf Baru", color: "bg-amber-50 text-amber-800 border-amber-300", icon: Clock },
    in_review: { label: "Sedang Ditelaah", color: "bg-blue-50 text-blue-800 border-blue-300", icon: AlertCircle },
    approved: { label: "Disetujui Sah", color: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: CheckCircle2 },
    rejected: { label: "Perlu Revisi / Ditolak", color: "bg-rose-50 text-rose-800 border-rose-300", icon: XCircle },
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Bank Capaian Pembelajaran (CP) Resmi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Penyimpanan rumusan CP dan elemen resmi Kurikulum Merdeka (BSKAP 032/H/KR/2024) dengan verifikasi ketat
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
          <CheckSquare className="w-6 h-6" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Fase:
        </span>
        <Link
          href="/dashboard/kurikulum/cp"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            !filterFase ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Semua Fase ({cps.length})
        </Link>
        <Link
          href="/dashboard/kurikulum/cp?fase=Fase+A"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterFase === "Fase A" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Fase A (Kls 1 &amp; 2)
        </Link>
        <Link
          href="/dashboard/kurikulum/cp?fase=Fase+B"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterFase === "Fase B" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Fase B (Kls 3 &amp; 4)
        </Link>
        <Link
          href="/dashboard/kurikulum/cp?fase=Fase+C"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterFase === "Fase C" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Fase C (Kls 5 &amp; 6)
        </Link>
      </div>

      {/* List of CPs */}
      <div className="space-y-4">
        {filteredCps.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            Belum ada Capaian Pembelajaran yang cocok dengan filter yang dipilih.
          </div>
        ) : (
          filteredCps.map((cp) => {
            const badge = statusBadges[cp.verificationStatus] || {
              label: cp.verificationStatus,
              color: "bg-slate-100 text-slate-800",
              icon: Clock,
            };
            const StatusIcon = badge.icon;
            const sourceDoc = sources.find((s) => s.id === cp.sourceDocumentId);
            const subject = subjects.find((s) => s.id === cp.subjectId);

            return (
              <div
                key={cp.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-slate-300 transition"
              >
                {/* Header CP */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {subject ? subject.name : cp.subjectId}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                      {cp.phase}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                      Elemen: {cp.element}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${badge.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">v{cp.version}</span>
                  </div>
                </div>

                {/* Citation */}
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <strong>Dokumen:</strong> {sourceDoc ? sourceDoc.title : "Keputusan BSKAP No. 032/H/KR/2024"}
                  </span>
                  <span><strong>Halaman:</strong> {cp.sourcePage || "-"}</span>
                  {cp.sourceSection && <span><strong>Bagian:</strong> {cp.sourceSection}</span>}
                </div>

                {/* Verbatim Source Text Box */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Kutipan Rumusan Sumber Resmi (Verbatim):</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-sans font-medium">
                    &ldquo;{cp.originalSourceText}&rdquo;
                  </p>
                </div>

                {/* AI Interpretation (Strictly Separate) */}
                {cp.aiInterpretation && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800 mb-1">
                      Catatan Interpretasi / Rekomendasi Diferensiasi AI (Non-Verbatim):
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{cp.aiInterpretation}</p>
                  </div>
                )}

                {/* Footer & Approval Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs border-t border-slate-100">
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-sm">
                    Hash Duplikasi: {cp.duplicateHash.slice(0, 16)}...
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Guru dapat mengajukan penelaahan */}
                    {cp.verificationStatus === "draft" && (
                      <form
                        action={async () => {
                          "use server";
                          const fd = new FormData();
                          fd.set("status", "in_review");
                          await updateCpStatusAction(cp.id, fd);
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

                    {/* Kepala Sekolah / Admin dapat menyetujui atau menolak */}
                    {isHeadmasterOrAdmin && cp.verificationStatus !== "approved" && (
                      <form
                        action={async () => {
                          "use server";
                          const fd = new FormData();
                          fd.set("status", "approved");
                          fd.set("reviewNotes", "Disetujui sebagai CP resmi sekolah");
                          await updateCpStatusAction(cp.id, fd);
                        }}
                      >
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Setujui Resmi
                        </button>
                      </form>
                    )}

                    {isHeadmasterOrAdmin && cp.verificationStatus !== "rejected" && (
                      <form
                        action={async () => {
                          "use server";
                          const fd = new FormData();
                          fd.set("status", "rejected");
                          fd.set("reviewNotes", "Ditolak / perlu perbaikan sumber");
                          await updateCpStatusAction(cp.id, fd);
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
                      href={`/dashboard/kurikulum/cp/${cp.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1"
                    >
                      Detail &amp; Dekonstruksi TP &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Add New CP */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-600" />
          <span>Tambah Rumusan Capaian Pembelajaran Baru</span>
        </h3>

        <form
          action={async (formData: FormData) => {
            "use server";
            await createCapaianPembelajaranAction(formData);
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Mata Pelajaran
            </label>
            <select
              name="subjectId"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="Fase A">Fase A (Kelas 1 &amp; 2)</option>
              <option value="Fase B">Fase B (Kelas 3 &amp; 4)</option>
              <option value="Fase C">Fase C (Kelas 5 &amp; 6)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Elemen CP
            </label>
            <input
              type="text"
              name="element"
              required
              placeholder="Contoh: Menyimak / Bilangan / Pemahaman IPAS"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Rujukan Dokumen Sumber
            </label>
            <select
              name="sourceDocumentId"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              {sources.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.documentNumber} - {src.title.slice(0, 45)}...
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Nomor Halaman Sumber
            </label>
            <input
              type="text"
              name="sourcePage"
              required
              placeholder="Hal. 142"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Bagian / Lampiran Dokumen
            </label>
            <input
              type="text"
              name="sourceSection"
              placeholder="Lampiran I - Matematika Fase B"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Rumusan Teks Verbatim CP Resmi (Tanpa Perubahan)
            </label>
            <textarea
              name="originalSourceText"
              rows={4}
              required
              placeholder="Salin teks rumusan Capaian Pembelajaran persis seperti yang tertulis pada dokumen BSKAP..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Catatan Interpretasi / Diferensiasi AI (Opsional - Terpisah dari Teks Resmi)
            </label>
            <textarea
              name="aiInterpretation"
              rows={2}
              placeholder="Catatan bantuan pedagogis atau pemetaan multigrade..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none text-xs"
            />
          </div>

          <div className="sm:col-span-3 pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Capaian Pembelajaran (Status Draf)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
