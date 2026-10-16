import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import {
  createAtpPlanAction,
  addAtpItemAction,
} from "@/app/actions/curriculum";
import {
  GitCommit,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";

export default async function AlurTujuanPembelajaranPage() {
  const user = await getCurrentUser();

  const atps = await db.select().from(schema.atpPlans).orderBy(desc(schema.atpPlans.createdAt));
  const atpItems = await db.select().from(schema.atpItems).orderBy(asc(schema.atpItems.sequenceOrder));
  const tps = await db.select().from(schema.tujuanPembelajaran);
  const subjects = await db.select().from(schema.subjects);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Alur Tujuan Pembelajaran (ATP) Multigrade
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pengurutan alur pembelajaran, alokasi jam pelajaran (JP), semester, dan catatan pengelolaan kelas rangkap
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
          <GitCommit className="w-6 h-6" />
        </div>
      </div>

      {/* List of ATP Plans */}
      <div className="space-y-6">
        {atps.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            Belum ada Rencana ATP yang terdaftar.
          </div>
        ) : (
          atps.map((atp) => {
            const subject = subjects.find((s) => s.id === atp.subjectId);
            const items = atpItems.filter((i) => i.atpPlanId === atp.id);

            return (
              <div
                key={atp.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* ATP Header */}
                <div className="p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-amber-100 text-amber-800">
                        {atp.phase}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {subject ? subject.name : atp.subjectId}
                      </span>
                      <span className="text-xs text-slate-500">&bull; TA {atp.academicYear}</span>
                    </div>
                    <h2 className="text-lg font-black text-slate-900">{atp.title}</h2>
                  </div>

                  <div className="flex items-center gap-3 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Alokasi</span>
                      <span className="font-black text-amber-600 text-sm">{atp.totalHours} JP</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                      <span className="font-bold text-emerald-700 capitalize">{atp.status}</span>
                    </div>
                  </div>
                </div>

                {/* Sequenced Items List */}
                <div className="p-6 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Urutan Langkah Tujuan Pembelajaran ({items.length} Langkah):
                  </div>

                  {items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada butir TP yang ditautkan ke alur ini.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                      {items.map((item) => {
                        const tp = tps.find((t) => t.id === item.tpId);

                        return (
                          <div key={item.id} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                                {item.sequenceOrder}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-purple-700">{tp?.code || "-"}</span>
                                  <span className="font-semibold text-slate-900">{tp?.competency}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                    Kelas {item.targetGrade} &bull; {item.semester}
                                  </span>
                                </div>
                                <p className="text-slate-600 mt-1">{tp?.description}</p>
                                {item.multigradeNotes && (
                                  <div className="mt-1 text-[11px] text-amber-800 bg-amber-50/60 px-2 py-0.5 rounded border border-amber-200">
                                    <strong>Catatan Multigrade:</strong> {item.multigradeNotes}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="px-2.5 py-1 rounded bg-slate-100 font-bold text-slate-700">
                                {item.allocatedHours} JP
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Item form */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        await addAtpItemAction(formData);
                      }}
                      className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs"
                    >
                      <input type="hidden" name="atpPlanId" value={atp.id} />

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Pilih TP</label>
                        <select
                          name="tpId"
                          required
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none"
                        >
                          {tps
                            .filter((t) => t.subjectId === atp.subjectId && t.phase === atp.phase)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.code}: {t.competency.slice(0, 40)}...
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Urutan</label>
                        <input
                          type="number"
                          name="sequenceOrder"
                          defaultValue={items.length + 1}
                          required
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Alokasi (JP)</label>
                        <input
                          type="number"
                          name="allocatedHours"
                          defaultValue={4}
                          required
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Target Kelas</label>
                        <select
                          name="targetGrade"
                          required
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none"
                        >
                          <option value="1">Kelas 1</option>
                          <option value="2">Kelas 2</option>
                          <option value="3">Kelas 3</option>
                          <option value="4">Kelas 4</option>
                          <option value="5">Kelas 5</option>
                          <option value="6">Kelas 6</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          name="multigradeNotes"
                          placeholder="Catatan diferensiasi multigrade / tutor sebaya..."
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none"
                        />
                      </div>

                      <div>
                        <button
                          type="submit"
                          className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition"
                        >
                          + Tambah ke Alur
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Add New ATP Plan */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-600" />
          <span>Buat Rencana Alur Tujuan Pembelajaran (ATP) Baru</span>
        </h3>

        <form
          action={async (formData: FormData) => {
            "use server";
            await createAtpPlanAction(formData);
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Judul Rencana ATP
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="Contoh: ATP Matematika Fase B SDN SEDAENG II Tosari"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Mata Pelajaran
            </label>
            <select
              name="subjectId"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            >
              <option value="Fase A">Fase A (Kelas 1 &amp; 2)</option>
              <option value="Fase B">Fase B (Kelas 3 &amp; 4)</option>
              <option value="Fase C">Fase C (Kelas 5 &amp; 6)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Total Jam Pelajaran (JP) Setahun
            </label>
            <input
              type="number"
              name="totalHours"
              required
              defaultValue={72}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Rencana ATP (Status Draf)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
