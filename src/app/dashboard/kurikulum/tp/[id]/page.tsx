import React from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, ne, and } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Target,
  FileText,
  GitBranch,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2,
  Plus,
  Save,
} from "lucide-react";
import {
  addTpPrerequisiteAction,
  removeTpPrerequisiteAction,
  updateTpPedagogicalAction,
} from "@/app/actions/validation";
import { validateSingleTp } from "@/lib/curriculum/validation-engine";

export const dynamic = "force-dynamic";

export default async function TpEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Ambil data TP
  const [tp] = await db
    .select()
    .from(schema.tujuanPembelajaran)
    .where(eq(schema.tujuanPembelajaran.id, id));

  if (!tp) {
    notFound();
  }

  // 2. Ambil data CP Induk
  const [cp] = tp.cpId
    ? await db
        .select()
        .from(schema.capaianPembelajaran)
        .where(eq(schema.capaianPembelajaran.id, tp.cpId))
    : [null];

  // 3. Ambil data Mapel
  const [subject] = await db
    .select()
    .from(schema.subjects)
    .where(eq(schema.subjects.id, tp.subjectId));

  // 4. Ambil relasi prasyarat TP ini
  const currentPrereqs = await db
    .select({
      id: schema.tpPrerequisites.id,
      prerequisiteTpId: schema.tpPrerequisites.prerequisiteTpId,
      prerequisiteType: schema.tpPrerequisites.prerequisiteType,
      notes: schema.tpPrerequisites.notes,
      prereqCode: schema.tujuanPembelajaran.code,
      prereqCompetency: schema.tujuanPembelajaran.competency,
      prereqGrade: schema.tujuanPembelajaran.targetGrade,
    })
    .from(schema.tpPrerequisites)
    .innerJoin(
      schema.tujuanPembelajaran,
      eq(schema.tpPrerequisites.prerequisiteTpId, schema.tujuanPembelajaran.id)
    )
    .where(eq(schema.tpPrerequisites.tpId, tp.id));

  // 5. Ambil kandidat TP lain dalam mata pelajaran & fase yang sama (selain diri sendiri) untuk dijadikan prasyarat
  const candidateTps = await db
    .select()
    .from(schema.tujuanPembelajaran)
    .where(
      and(
        eq(schema.tujuanPembelajaran.subjectId, tp.subjectId),
        ne(schema.tujuanPembelajaran.id, tp.id)
      )
    );

  // 6. Jalankan validasi cepat untuk TP ini
  const validationIssues = await validateSingleTp(tp.id);

  // 7. Riwayat versi TP
  const versions = await db
    .select()
    .from(schema.curriculumVersions)
    .where(eq(schema.curriculumVersions.entityId, tp.id))
    .orderBy(desc(schema.curriculumVersions.createdAt));

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header & Navigasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/dashboard/kurikulum/tp"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Bank TP
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Editor Tujuan Pembelajaran
            </h1>
            <span className="font-mono text-xs px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md font-bold">
              {tp.code}
            </span>
            <span className="text-xs px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 rounded font-semibold">
              Versi {tp.version}
            </span>
          </div>
          <p className="text-slate-600 text-sm mt-1">
            Mapel: <span className="font-semibold text-slate-800">{subject?.name || tp.subjectId}</span> &bull; Fase:{" "}
            <span className="font-semibold text-slate-800">{tp.phase}</span> &bull; Target:{" "}
            <span className="font-semibold text-blue-700">Kelas {tp.targetGrade || "1-6"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cp ? (
            <Link
              href={`/dashboard/kurikulum/cp/${cp.id}`}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-blue-600" /> Lihat CP Induk
            </Link>
          ) : null}
        </div>
      </div>

      {/* Box Peringatan Validasi (Jika ada masalah) */}
      {validationIssues.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/70 text-rose-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
            <ShieldAlert className="w-5 h-5 text-rose-600" /> Ditemukan Masalah Validasi pada TP Ini:
          </div>
          <ul className="list-disc pl-6 space-y-1 text-xs">
            {validationIssues.map((issue, idx) => (
              <li key={idx}>
                <span className="font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 bg-rose-200 text-rose-900 rounded mr-1.5">
                  {issue.severity}
                </span>
                <span className="font-bold">{issue.title}:</span> {issue.description}{" "}
                <em className="text-rose-700">({issue.recommendation})</em>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Referensi CP Induk (Readonly Box) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" /> Dasar Capaian Pembelajaran (CP) Induk
          </span>
          {cp ? (
            <span className="text-xs text-blue-600 font-semibold">Elemen: {cp.element}</span>
          ) : (
            <span className="text-xs text-rose-600 font-bold">⚠️ TP Yatim (Belum Terhubung ke CP)</span>
          )}
        </div>
        {cp ? (
          <p className="text-xs text-slate-700 leading-relaxed font-serif italic bg-white p-3 rounded-lg border border-slate-200">
            &ldquo;{cp.originalSourceText}&rdquo;
          </p>
        ) : (
          <p className="text-xs text-rose-600 italic">
            TP ini tidak memiliki rujukan CP resmi. Mohon hubungkan ke CP yang sah agar dapat dipertanggungjawabkan dalam kurikulum.
          </p>
        )}
      </div>

      {/* Grid: Formulir Editor Pedagogis TP & Pengelola Prasyarat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Editor Pedagogis TP */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Target className="w-5 h-5 text-blue-600" /> Penyesuaian Rumusan TP (Pedagogis)
          </h2>
          <p className="text-xs text-slate-500">
            Anda dapat menyusun rumusan TP berbeda menurut kebutuhan kelas dan karakter murid tanpa mengubah teks resmi CP induk.
          </p>

          <form
            action={async (formData: FormData) => {
              "use server";
              const competency = formData.get("competency") as string;
              const contentScope = formData.get("contentScope") as string;
              const description = formData.get("description") as string;
              const targetGrade = parseInt(formData.get("targetGrade") as string, 10);
              const sourceType = formData.get("sourceType") as "verbatim_source" | "derived_teacher" | "ai_assisted";
              const changeReason = formData.get("changeReason") as string;

              await updateTpPedagogicalAction(tp.id, {
                competency,
                contentScope,
                description,
                targetGrade,
                sourceType,
                changeReason,
              });
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fokus Kompetensi</label>
                <input
                  name="competency"
                  defaultValue={tp.competency}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Kelas</label>
                <select
                  name="targetGrade"
                  defaultValue={tp.targetGrade || (tp.phase === "Fase A" ? 1 : tp.phase === "Fase B" ? 3 : 5)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                >
                  <option value={1}>Kelas 1 (Fase A - Kelompok A)</option>
                  <option value={2}>Kelas 2 (Fase A - Kelompok A)</option>
                  <option value={3}>Kelas 3 (Fase B - Kelompok B)</option>
                  <option value={4}>Kelas 4 (Fase B - Kelompok B)</option>
                  <option value={5}>Kelas 5 (Fase C - Kelompok C)</option>
                  <option value={6}>Kelas 6 (Fase C - Kelompok C)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Lingkup Materi</label>
              <input
                name="contentScope"
                defaultValue={tp.contentScope}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Rumusan Lengkap Tujuan Pembelajaran (TP)</label>
              <textarea
                name="description"
                defaultValue={tp.description}
                rows={4}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Asal Penyusunan (Source Attribution)</label>
                <select
                  name="sourceType"
                  defaultValue={tp.sourceType}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                >
                  <option value="derived_teacher">🏛️ Diturunkan Mandiri oleh Guru</option>
                  <option value="ai_assisted">🤖 Asistensi AI (Google AI Studio)</option>
                  <option value="verbatim_source">📜 Kutipan Sumber Langsung</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alasan Perubahan (Audit Trail)</label>
                <input
                  name="changeReason"
                  placeholder="misal: Menyesuaikan gaya belajar siswa kelas rangkap"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Simpan Perubahan TP
              </button>
            </div>
          </form>
        </div>

        {/* Kolom 3: Manajer Prasyarat Pembelajaran */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <GitBranch className="w-5 h-5 text-indigo-600" /> Prasyarat Belajar
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Kompetensi yang wajib atau dianjurkan telah dikuasai murid sebelum memulai TP ini.
            </p>

            {/* Daftar Prasyarat Aktif */}
            <div className="space-y-2 mb-6">
              {currentPrereqs.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-400">
                  Belum ada prasyarat yang ditetapkan untuk TP ini.
                </div>
              ) : (
                currentPrereqs.map((pr) => (
                  <div
                    key={pr.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-blue-700">{pr.prereqCode}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            pr.prerequisiteType === "wajib"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {pr.prerequisiteType.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5">{pr.prereqCompetency}</div>
                    </div>
                    <form
                      action={async () => {
                        "use server";
                        await removeTpPrerequisiteAction(pr.id, tp.id);
                      }}
                    >
                      <button
                        type="submit"
                        title="Hapus prasyarat"
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>

            {/* Tambah Prasyarat Baru */}
            <form
              action={async (formData: FormData) => {
                "use server";
                const prerequisiteTpId = formData.get("prerequisiteTpId") as string;
                const prerequisiteType = formData.get("prerequisiteType") as "wajib" | "dianjurkan";
                const notes = formData.get("notes") as string;

                await addTpPrerequisiteAction(tp.id, prerequisiteTpId, prerequisiteType, notes);
              }}
              className="space-y-3 pt-3 border-t border-slate-100 text-xs"
            >
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-600" /> Tautkan TP Prasyarat
              </h4>

              <div>
                <label className="text-slate-600 block mb-1">Pilih TP Prasyarat:</label>
                <select
                  name="prerequisiteTpId"
                  required
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="">-- Pilih Tujuan Pembelajaran --</option>
                  {candidateTps.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.competency} (Kls {c.targetGrade || "?"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Sifat Prasyarat:</label>
                <select
                  name="prerequisiteType"
                  defaultValue="wajib"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="wajib">Wajib (Harus diajarkan sebelumnya)</option>
                  <option value="dianjurkan">Dianjurkan (Penguatan)</option>
                </select>
              </div>

              <div>
                <input
                  name="notes"
                  placeholder="Catatan prasyarat (opsional)"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded transition"
              >
                Tambahkan Prasyarat
              </button>
            </form>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            Mesin validasi otomatis mencegah siklus prasyarat sirkular (A &rarr; B &rarr; A).
          </div>
        </div>
      </div>

      {/* Bagian: Riwayat Versi TP */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500" />
          Riwayat Audit &amp; Perubahan Versi TP ({versions.length})
        </h3>
        {versions.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Belum ada catatan mutasi riwayat untuk TP ini.</p>
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
