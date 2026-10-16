import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { History, GitCompare, Clock, ShieldCheck } from "lucide-react";
import { compareSnapshots } from "@/lib/curriculum/versioning";

export default async function VersiKurikulumPage() {
  const versions = await db.select().from(schema.curriculumVersions).orderBy(desc(schema.curriculumVersions.createdAt)).limit(50);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Riwayat Versi &amp; Komparasi Kurikulum
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit penelusuran perubahan (*change history*) dan perbandingan snapshot data kurikulum
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
          <History className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Riwayat Versi Terakhir ({versions.length} Rekod)
          </h2>
        </div>

        {versions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Belum ada riwayat mutasi versi tercatat.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {versions.map((v) => {
              const diffs = compareSnapshots(
                v.previousSnapshot as Record<string, unknown> | null,
                v.currentSnapshot as Record<string, unknown> | null
              );

              return (
                <div key={v.id} className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">
                        {v.entityType}
                      </span>
                      <span className="text-xs font-bold text-slate-900">Versi {v.versionNumber}</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Tipe: {v.changeType}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      {new Date(v.createdAt).toLocaleString("id-ID")}
                    </div>
                  </div>

                  <div className="text-xs text-slate-700">
                    <strong>Pelaku:</strong> {v.changedByName || "Sistem"} &bull;{" "}
                    <strong>Alasan / Catatan:</strong> {v.changeReason || "Tanpa catatan"}
                  </div>

                  {diffs.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
                      <div className="font-bold text-[11px] text-slate-700 flex items-center gap-1">
                        <GitCompare className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Perubahan Nilai Lapangan (Diff):</span>
                      </div>
                      <div className="divide-y divide-slate-200/60 font-mono text-[11px]">
                        {diffs.map((d, i) => (
                          <div key={i} className="py-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-semibold text-slate-700">{d.field}:</span>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-rose-600 line-through truncate max-w-xs">
                                {JSON.stringify(d.previousValue)}
                              </span>
                              <span>&rarr;</span>
                              <span className="text-emerald-700 font-bold truncate max-w-xs">
                                {JSON.stringify(d.currentValue)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
