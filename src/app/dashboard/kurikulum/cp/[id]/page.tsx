import React from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  ArrowLeft,
  FileText,
  Sparkles,
  Layers,
  History,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { createTujuanPembelajaranAction } from "@/app/actions/curriculum";

export const dynamic = "force-dynamic";

export default async function CpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Ambil data CP
  const [cp] = await db
    .select()
    .from(schema.capaianPembelajaran)
    .where(eq(schema.capaianPembelajaran.id, id));

  if (!cp) {
    notFound();
  }

  // 2. Ambil data mapel
  const [subject] = await db
    .select()
    .from(schema.subjects)
    .where(eq(schema.subjects.id, cp.subjectId));

  // 3. Ambil data dokumen sumber
  const [sourceDoc] = cp.sourceDocumentId
    ? await db
        .select()
        .from(schema.curriculumSources)
        .where(eq(schema.curriculumSources.id, cp.sourceDocumentId))
    : [null];

  // 4. Ambil seluruh TP yang diturunkan dari CP ini
  const derivedTps = await db
    .select()
    .from(schema.tujuanPembelajaran)
    .where(eq(schema.tujuanPembelajaran.cpId, cp.id))
    .orderBy(schema.tujuanPembelajaran.code);

  // 5. Ambil riwayat versi CP ini
  const versions = await db
    .select()
    .from(schema.curriculumVersions)
    .where(eq(schema.curriculumVersions.entityId, cp.id))
    .orderBy(desc(schema.curriculumVersions.createdAt));

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/dashboard/kurikulum/cp"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Bank CP
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Detail Capaian Pembelajaran
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                cp.verificationStatus === "approved" || cp.verificationStatus === "in_use"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : cp.verificationStatus === "in_review"
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : cp.verificationStatus === "rejected"
                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                  : "bg-slate-100 text-slate-700 border border-slate-300"
              }`}
            >
              {cp.verificationStatus.toUpperCase()} &bull; v{cp.version}
            </span>
          </div>
          <p className="text-slate-600 text-sm mt-1">
            Mata Pelajaran: <span className="font-semibold text-slate-800">{subject?.name || cp.subjectId}</span> &bull;{" "}
            Fase: <span className="font-semibold text-slate-800">{cp.phase}</span> &bull; Elemen:{" "}
            <span className="font-semibold text-blue-700">{cp.element}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/kurikulum/validasi"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Cek di Pusat Validasi
          </Link>
        </div>
      </div>

      {/* Grid: 2 Kolom Konten Sumber vs Interpretasi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom 1: KUTIPAN RESMI VERBATIM */}
        <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> KUTIPAN RESMI VERBATIM
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              🏛️
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Rumusan Asli Dokumen Regulasi</h3>
              <p className="text-xs text-slate-500">Teks murni dari regulasi pemerintah tanpa modifikasi</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm leading-relaxed font-serif whitespace-pre-wrap">
            &ldquo;{cp.originalSourceText}&rdquo;
          </div>

          {/* Metadata Rujukan Dokumen */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Dokumen Rujukan:</span>
              <span className="font-semibold text-slate-800">
                {sourceDoc ? sourceDoc.title : "BSKAP No. 032/H/KR/2024"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Halaman &amp; Bagian:</span>
              <span className="font-semibold text-slate-800">
                {cp.sourcePage ? `Halaman ${cp.sourcePage}` : "-"} &bull; {cp.sourceSection || "Utama"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Hash SHA-256 Integritas Data:</span>
              <code className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono break-all block mt-0.5">
                {cp.duplicateHash}
              </code>
            </div>
          </div>
        </div>

        {/* Kolom 2: INTERPRETASI PEDAGOGIS & REKOMENDASI AI */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> CATATAN PEMETAAN &amp; AI
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                🧠
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Interpretasi &amp; Catatan Khusus Guru</h3>
                <p className="text-xs text-slate-500">Terpisah dari teks resmi sumber untuk menjaga kemurnian CP</p>
              </div>
            </div>

            <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-lg text-slate-800 text-sm leading-relaxed">
              {cp.aiInterpretation ? (
                <p className="whitespace-pre-wrap">{cp.aiInterpretation}</p>
              ) : (
                <p className="text-slate-400 italic">
                  Belum ada interpretasi pedagogis atau rekomendasi asistensi AI untuk CP ini. Pendidik dapat menambahkan catatan dekonstruksi materi untuk kelas rangkap.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            Prinsip Antigravity: Teks sumber resmi selalu dilindungi dari halusinasi atau perubahan sepihak.
          </div>
        </div>
      </div>

      {/* Bagian: Tujuan Pembelajaran (TP) yang Diturunkan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Tujuan Pembelajaran (TP) Terkait ({derivedTps.length})
            </h2>
            <p className="text-xs text-slate-500">
              Dekonstruksi kompetensi yang disusun berbeda menurut kebutuhan kelas tanpa mengubah teks CP resmi
            </p>
          </div>
        </div>

        {derivedTps.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h4 className="font-semibold text-slate-800 text-sm">Belum Ada TP untuk CP Ini</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Susun Tujuan Pembelajaran berdasarkan CP ini menggunakan formulir di bawah.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {derivedTps.map((tp) => (
              <div
                key={tp.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">
                      {tp.code}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold">
                      Kelas {tp.targetGrade || "1-6"}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">{tp.competency}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-2">{tp.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Lingkup: {tp.contentScope}</span>
                  <Link
                    href={`/dashboard/kurikulum/tp/${tp.id}`}
                    className="font-semibold text-blue-600 hover:text-blue-800 transition"
                  >
                    Buka Editor TP &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulir Cepat Tambah TP */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Susun TP Baru dari CP Ini
          </h3>
          <form
            action={async (formData: FormData) => {
              "use server";
              formData.set("cpId", cp.id);
              formData.set("subjectId", cp.subjectId);
              formData.set("phase", cp.phase);
              await createTujuanPembelajaranAction(formData);
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs"
          >
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Kode TP</label>
              <input
                name="code"
                placeholder="misal: TP-MAT-B.1-03"
                required
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Fokus Kompetensi</label>
              <input
                name="competency"
                placeholder="misal: Membandingkan bilangan cacah"
                required
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Target Kelas</label>
              <select
                name="targetGrade"
                defaultValue={cp.phase === "Fase A" ? 1 : cp.phase === "Fase B" ? 3 : 5}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                {cp.phase === "Fase A" ? (
                  <>
                    <option value={1}>Kelas 1 (Fase A)</option>
                    <option value={2}>Kelas 2 (Fase A)</option>
                  </>
                ) : cp.phase === "Fase B" ? (
                  <>
                    <option value={3}>Kelas 3 (Fase B)</option>
                    <option value={4}>Kelas 4 (Fase B)</option>
                  </>
                ) : (
                  <>
                    <option value={5}>Kelas 5 (Fase C)</option>
                    <option value={6}>Kelas 6 (Fase C)</option>
                  </>
                )}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="font-semibold text-slate-700 block mb-1">Lingkup Materi</label>
              <input
                name="contentScope"
                placeholder="misal: Bilangan cacah sampai 1.000"
                required
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="font-semibold text-slate-700 block mb-1">Rumusan Lengkap Tujuan Pembelajaran (TP)</label>
              <textarea
                name="description"
                rows={2}
                placeholder="Peserta didik dapat memahami dan membandingkan..."
                required
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-sans"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                Simpan Tujuan Pembelajaran
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bagian: Riwayat Audit & Versi */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500" />
          Riwayat Audit &amp; Versi CP ({versions.length})
        </h3>
        {versions.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Belum ada catatan mutasi riwayat untuk CP ini.</p>
        ) : (
          <div className="space-y-3">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-800">Versi {ver.versionNumber}</span> &bull;{" "}
                  <span className="text-slate-600">{ver.changeReason || ver.changeType}</span>
                </div>
                <div className="text-slate-500">
                  {ver.changedByName || "Sistem"} &bull;{" "}
                  {ver.createdAt ? new Date(ver.createdAt).toLocaleDateString("id-ID") : "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
