import React from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Play,
  Check,
  XCircle,
  RotateCcw,
  Plus,
  BookOpen,
  Sparkles,
  Award,
} from "lucide-react";
import {
  runAtpValidationAction,
  submitAtpForReviewAction,
  approveAtpWithReviewAction,
  rejectAtpAction,
  activateAtpForTeachingAction,
  updateAtpItemSequenceAndHoursAction,
  updateIssueResolutionAction,
} from "@/app/actions/validation";
import { addAtpItemAction } from "@/app/actions/curriculum";
import { validateAtpPlan, PEDAGOGICAL_DISCLAIMER } from "@/lib/curriculum/validation-engine";

export const dynamic = "force-dynamic";

export default async function AtpEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  // 1. Ambil data ATP Plan
  const [plan] = await db
    .select()
    .from(schema.atpPlans)
    .where(eq(schema.atpPlans.id, id));

  if (!plan) {
    notFound();
  }

  // 2. Ambil data Mapel
  const [subject] = await db
    .select()
    .from(schema.subjects)
    .where(eq(schema.subjects.id, plan.subjectId));

  // 3. Ambil data Penulis & Penyetuju
  const [author] = plan.authorId
    ? await db.select().from(schema.users).where(eq(schema.users.id, plan.authorId))
    : [null];

  const [approver] = plan.approvedById
    ? await db.select().from(schema.users).where(eq(schema.users.id, plan.approvedById))
    : [null];

  // 4. Ambil butir-butir ATP (items) terurut
  const items = await db
    .select({
      id: schema.atpItems.id,
      atpPlanId: schema.atpItems.atpPlanId,
      tpId: schema.atpItems.tpId,
      sequenceOrder: schema.atpItems.sequenceOrder,
      allocatedHours: schema.atpItems.allocatedHours,
      targetGrade: schema.atpItems.targetGrade,
      semester: schema.atpItems.semester,
      multigradeNotes: schema.atpItems.multigradeNotes,
      tpCode: schema.tujuanPembelajaran.code,
      tpCompetency: schema.tujuanPembelajaran.competency,
      tpContentScope: schema.tujuanPembelajaran.contentScope,
      tpDescription: schema.tujuanPembelajaran.description,
    })
    .from(schema.atpItems)
    .innerJoin(
      schema.tujuanPembelajaran,
      eq(schema.atpItems.tpId, schema.tujuanPembelajaran.id)
    )
    .where(eq(schema.atpItems.atpPlanId, plan.id))
    .orderBy(asc(schema.atpItems.sequenceOrder));

  // 5. Ambil data prasyarat dari seluruh TP dalam ATP ini untuk cek alur prasyarat
  const tpIds = items.map((i) => i.tpId);
  const prereqs = tpIds.length > 0
    ? await db
        .select()
        .from(schema.tpPrerequisites)
        .where(inArray(schema.tpPrerequisites.tpId, tpIds))
    : [];

  const tpSequenceMap = new Map(items.map((i) => [i.tpId, i.sequenceOrder]));

  // 6. Jalankan mesin validasi otomatis pada ATP ini
  const validationReport = await validateAtpPlan(plan.id);

  // 7. Ambil kandidat TP lain yang belum dimasukkan ke ATP ini (dalam mapel & fase yang sama)
  const candidateTps = await db
    .select()
    .from(schema.tujuanPembelajaran)
    .where(
      eq(schema.tujuanPembelajaran.subjectId, plan.subjectId)
    );

  const availableTps = candidateTps.filter((c) => !tpIds.includes(c.id));

  // Hitung total alokasi jam terpasang
  const totalAllocatedHours = items.reduce((sum, item) => sum + item.allocatedHours, 0);

  // Otoritas peran
  const canApprove = currentUser?.role === "admin" || currentUser?.role === "headmaster";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header & Status Lifecycle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/dashboard/kurikulum/atp"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Daftar ATP
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {plan.title}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                plan.status === "in_use"
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : plan.status === "approved"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : plan.status === "in_review"
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : plan.status === "rejected"
                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                  : "bg-slate-100 text-slate-700 border border-slate-300"
              }`}
            >
              {plan.status === "in_use"
                ? "DIGUNAKAN (AKTIF)"
                : plan.status === "approved"
                ? "DISETUJUI"
                : plan.status === "in_review"
                ? "DITINJAU"
                : plan.status === "rejected"
                ? "DITOLAK"
                : "DRAF"}
            </span>
            <span className="text-xs px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 rounded font-semibold">
              Versi {plan.version}
            </span>
          </div>

          <p className="text-slate-600 text-sm mt-1">
            Mapel: <span className="font-semibold text-slate-800">{subject?.name || plan.subjectId}</span> &bull; Fase:{" "}
            <span className="font-semibold text-slate-800">{plan.phase}</span> &bull; TA:{" "}
            <span className="font-semibold text-slate-800">{plan.academicYear}</span> &bull; Penyusun:{" "}
            <span className="font-semibold text-slate-800">{author?.name || "Guru"}</span>
          </p>
        </div>

        {/* Panel Tombol Aksi Persetujuan & Siklus Hidup */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Tombol Jalankan Validasi Teknis */}
          <form
            action={async () => {
              "use server";
              await runAtpValidationAction(plan.id);
            }}
          >
            <button
              type="submit"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 border border-slate-300"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Uji Validasi Ulang
            </button>
          </form>

          {/* 2. Ajukan Tinjauan (Jika Draf / Ditolak) */}
          {(plan.status === "draft" || plan.status === "rejected") && (
            <form
              action={async () => {
                "use server";
                await submitAtpForReviewAction(plan.id);
              }}
            >
              <button
                type="submit"
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-sm"
              >
                <Clock className="w-4 h-4" /> Ajukan Tinjauan
              </button>
            </form>
          )}

          {/* 3. Setujui / Tolak (Khusus Kepala Sekolah / Admin) */}
          {canApprove && (plan.status === "in_review" || plan.status === "draft") && (
            <>
              <form
                action={async () => {
                  "use server";
                  await approveAtpWithReviewAction(plan.id, "Disetujui setelah verifikasi alur pedagogis multigrade.");
                }}
              >
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" /> Setujui ATP
                </button>
              </form>

              {/* Form Tolak ATP dengan Alasan */}
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const notes = formData.get("rejectionNotes") as string;
                  await rejectAtpAction(plan.id, notes);
                }}
                className="inline-flex items-center gap-1"
              >
                <input
                  name="rejectionNotes"
                  placeholder="Alasan penolakan..."
                  required
                  className="px-2 py-1.5 border border-rose-300 rounded text-xs bg-white text-slate-800 w-36"
                />
                <button
                  type="submit"
                  className="px-2.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  Tolak
                </button>
              </form>
            </>
          )}

          {/* 4. Terapkan untuk Pembelajaran Aktif ("digunakan") */}
          {plan.status === "approved" && (
            <form
              action={async () => {
                "use server";
                await activateAtpForTeachingAction(plan.id);
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-4 h-4" /> Terapkan untuk Pembelajaran
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Banner Peringatan Pedagogis Mutlak */}
      <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-900 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs leading-relaxed">
          <span className="font-bold uppercase tracking-wider text-amber-800">
            Perhatian Pedagogis Kelas Rangkap Tosari:
          </span>
          <p>{PEDAGOGICAL_DISCLAIMER}</p>
        </div>
      </div>

      {/* Banner Penolakan (Jika status rejected) */}
      {plan.status === "rejected" && plan.rejectionNotes && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold">Catatan Penolakan oleh Kepala Sekolah / Peninjau:</span>
            <p className="font-medium bg-white p-2.5 rounded border border-rose-200 text-rose-800">
              {plan.rejectionNotes}
            </p>
          </div>
        </div>
      )}

      {/* Ringkasan Alokasi Jam & Validasi Teknis */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Kartu Jam Pelajaran */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Jam Terpasang</span>
            <span className="text-2xl font-extrabold text-slate-900">{totalAllocatedHours} JP</span>
            <span className="text-xs text-slate-400 block">dari target {plan.totalHours} JP</span>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
              totalAllocatedHours >= plan.totalHours * 0.9 && totalAllocatedHours <= plan.totalHours * 1.1
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Kartu Masalah Kritis */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Masalah Kritis Teknis</span>
            <span
              className={`text-2xl font-extrabold ${
                validationReport.criticalCount > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {validationReport.criticalCount} Masalah
            </span>
            <span className="text-xs text-slate-400 block">
              {validationReport.criticalCount === 0 ? "Bebas masalah kritis" : "Wajib diperbaiki"}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
              validationReport.criticalCount > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {validationReport.criticalCount > 0 ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
        </div>

        {/* Kartu Catatan Peringatan & Info */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Catatan &amp; Saran</span>
            <span className="text-2xl font-extrabold text-amber-600">
              {validationReport.warningCount + validationReport.infoCount} Catatan
            </span>
            <span className="text-xs text-slate-400 block">
              {validationReport.warningCount} Peringatan &bull; {validationReport.infoCount} Info
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
            <Info className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Bagian: Diagram & Daftar Urutan TP dalam ATP */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Diagram Urutan Alur Tujuan Pembelajaran ({items.length} Langkah)
            </h2>
            <p className="text-xs text-slate-500">
              Urutan sekuensial langkah belajar. Guru dapat meninjau alokasi jam dan mengubah urutan maju-mundur.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="font-semibold text-slate-800 text-sm">Belum Ada TP dalam Alur ATP Ini</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Pilih Tujuan Pembelajaran dari daftar di bawah untuk menyusun urutan alur.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, idx) => {
              // Cek status prasyarat untuk butir ini
              const itemPrereqs = prereqs.filter((p) => p.tpId === item.tpId);
              const prereqViolations = itemPrereqs.filter((p) => {
                const pSeq = tpSequenceMap.get(p.prerequisiteTpId);
                return pSeq !== undefined && pSeq >= item.sequenceOrder;
              });

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    prereqViolations.length > 0
                      ? "border-rose-300 bg-rose-50/40"
                      : "border-slate-200 bg-slate-50/60 hover:border-blue-300"
                  }`}
                >
                  {/* Nomor Urut & Node Flowchart */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow">
                      {item.sequenceOrder}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                          {item.tpCode}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold">
                          Kelas {item.targetGrade}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold">
                          Semester {item.semester}
                        </span>
                        {item.multigradeNotes && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-medium">
                            🔀 {item.multigradeNotes}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm">{item.tpCompetency}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{item.tpDescription}</p>

                      {/* Status Prasyarat Belajar */}
                      {itemPrereqs.length > 0 && (
                        <div className="pt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="font-semibold text-slate-500">Prasyarat:</span>
                          {itemPrereqs.map((pr) => {
                            const pSeq = tpSequenceMap.get(pr.prerequisiteTpId);
                            const isViolated = pSeq !== undefined && pSeq >= item.sequenceOrder;
                            const isMissing = pSeq === undefined;

                            return (
                              <span
                                key={pr.id}
                                className={`px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${
                                  isViolated
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : isMissing
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                }`}
                              >
                                {isViolated ? (
                                  <>❌ Urutan {pSeq} (Melanggar urutan)</>
                                ) : isMissing ? (
                                  <>⚠️ Belum ada di ATP</>
                                ) : (
                                  <>✓ Diajarkan di Urutan {pSeq}</>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kontrol Peninjauan Alokasi Waktu (JP) & Pengurutan */}
                  <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 justify-end">
                    {/* Alokasi Jam Pelajaran (JP) */}
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block">Alokasi JP</span>
                      <span className="font-extrabold text-slate-800 text-sm px-2.5 py-1 bg-white border border-slate-300 rounded block">
                        {item.allocatedHours} JP
                      </span>
                    </div>

                    {/* Tombol Urutan Naik / Turun */}
                    <div className="flex flex-col gap-1">
                      {idx > 0 && (
                        <form
                          action={async () => {
                            "use server";
                            // Tukar urutan dengan item sebelumnya
                            const prevItem = items[idx - 1];
                            const updatedPayload = [
                              { id: item.id, sequenceOrder: prevItem.sequenceOrder, allocatedHours: item.allocatedHours },
                              { id: prevItem.id, sequenceOrder: item.sequenceOrder, allocatedHours: prevItem.allocatedHours },
                            ];
                            await updateAtpItemSequenceAndHoursAction(plan.id, updatedPayload);
                          }}
                        >
                          <button
                            type="submit"
                            title="Pindahkan ke atas"
                            className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      )}

                      {idx < items.length - 1 && (
                        <form
                          action={async () => {
                            "use server";
                            // Tukar urutan dengan item setelahnya
                            const nextItem = items[idx + 1];
                            const updatedPayload = [
                              { id: item.id, sequenceOrder: nextItem.sequenceOrder, allocatedHours: item.allocatedHours },
                              { id: nextItem.id, sequenceOrder: item.sequenceOrder, allocatedHours: nextItem.allocatedHours },
                            ];
                            await updateAtpItemSequenceAndHoursAction(plan.id, updatedPayload);
                          }}
                        >
                          <button
                            type="submit"
                            title="Pindahkan ke bawah"
                            className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      )}
                    </div>

                    <Link
                      href={`/dashboard/kurikulum/tp/${item.tpId}`}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
                    >
                      Edit TP
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Formulir Tambah TP ke Alur ATP */}
        {availableTps.length > 0 && (
          <div className="pt-6 border-t border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> Masukkan TP ke dalam Alur Ini
            </h3>
            <form
              action={async (formData: FormData) => {
                "use server";
                formData.set("atpPlanId", plan.id);
                formData.set("sequenceOrder", (items.length + 1).toString());
                await addAtpItemAction(formData);
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs"
            >
              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Pilih TP</label>
                <select
                  name="tpId"
                  required
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                >
                  {availableTps.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.code} - {tp.competency} (Kelas {tp.targetGrade || "?"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Kelas</label>
                <select
                  name="targetGrade"
                  defaultValue={plan.phase === "Fase A" ? 1 : plan.phase === "Fase B" ? 3 : 5}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                >
                  {plan.phase === "Fase A" ? (
                    <>
                      <option value={1}>Kelas 1 (Fase A)</option>
                      <option value={2}>Kelas 2 (Fase A)</option>
                    </>
                  ) : plan.phase === "Fase B" ? (
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

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Semester</label>
                <select
                  name="semester"
                  defaultValue="Ganjil"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alokasi Waktu (JP)</label>
                <input
                  name="allocatedHours"
                  type="number"
                  min="1"
                  max="40"
                  defaultValue="4"
                  required
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-semibold text-slate-700 block mb-1">Catatan Kelas Rangkap (Multigrade)</label>
                <input
                  name="multigradeNotes"
                  placeholder="misal: Diskusi terarah di Kelas 3 sementara Kelas 4 latihan mandiri"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                >
                  Tambahkan ke Urutan Alur
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bagian: Laporan Temuan Validasi Terintegrasi */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Laporan Rincian Masalah Validasi Teknis ({validationReport.totalIssues})
            </h3>
            <p className="text-xs text-slate-500">{validationReport.summary}</p>
          </div>
        </div>

        {validationReport.issues.length === 0 ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <strong>Alur ATP Bersih:</strong> Tidak ada masalah struktural, kekosongan referensi, celah urutan, atau pelanggaran prasyarat yang terdeteksi.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {validationReport.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                  issue.severity === "kritis"
                    ? "bg-rose-50/60 border-rose-300 text-rose-900"
                    : issue.severity === "peringatan"
                    ? "bg-amber-50/60 border-amber-300 text-amber-900"
                    : "bg-blue-50/60 border-blue-200 text-blue-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        issue.severity === "kritis"
                          ? "bg-rose-200 text-rose-900"
                          : issue.severity === "peringatan"
                          ? "bg-amber-200 text-amber-900"
                          : "bg-blue-200 text-blue-900"
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="font-bold text-slate-900">{issue.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{issue.sourceLocation}</span>
                </div>

                <p className="text-slate-700 leading-relaxed">{issue.description}</p>
                <div className="pt-1 border-t border-slate-200/60 text-slate-600">
                  <strong>Rekomendasi Perbaikan:</strong> {issue.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
