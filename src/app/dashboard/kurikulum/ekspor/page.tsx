import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { Download, FileJson, CheckCircle2 } from "lucide-react";

export default async function EksporKurikulumPage() {
  const cps = await db.select().from(schema.capaianPembelajaran);
  const tps = await db.select().from(schema.tujuanPembelajaran);
  const atps = await db.select().from(schema.atpPlans);
  const sources = await db.select().from(schema.curriculumSources);

  const exportPayload = {
    metadata: {
      school: "SDN SEDAENG II Tosari",
      exportedAt: new Date().toISOString(),
      sourceRegulation: "Keputusan Kepala BSKAP No. 032/H/KR/2024",
      totalDocuments: sources.length,
      totalCp: cps.length,
      totalTp: tps.length,
      totalAtp: atps.length,
    },
    dokumenSumber: sources,
    capaianPembelajaran: cps,
    tujuanPembelajaran: tps,
    alurTujuanPembelajaran: atps,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Ekspor Data Kurikulum Merdeka
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Unduh seluruh rekaman kurikulum resmi (CP, TP, ATP, Dokumen Sumber) dalam format JSON terstandar
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
          <Download className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Salinan Data Kurikulum Lengkap (JSON)</h2>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Siap Diunduh
          </span>
        </div>

        <p className="text-xs text-slate-600">
          Berkas JSON ini memuat seluruh data Capaian Pembelajaran verbatim, Tujuan Pembelajaran terstruktur, dan Alur Tujuan Pembelajaran resmi SDN SEDAENG II Tosari.
        </p>

        <textarea
          readOnly
          value={jsonString}
          rows={14}
          className="w-full font-mono text-[11px] p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none"
        />

        <div className="pt-2 flex justify-end">
          <a
            href={`data:text/json;charset=utf-8,${encodeURIComponent(jsonString)}`}
            download={`Kurikulum_SDN_SEDAENG_II_${new Date().toISOString().split("T")[0]}.json`}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Berkas Kurikulum (.json)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
