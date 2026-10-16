import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { ClipboardList, Shield } from "lucide-react";

export default async function AuditPage() {
  const logs = await db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt)).limit(100);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Log Audit Perubahan Penting
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekam jejak seluruh mutasi data penting, autentikasi, dan pengaturan sekolah
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
          <ClipboardList className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Riwayat Mutasi &amp; Akses ({logs.length} Rekod)</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Tindakan</th>
                <th className="px-4 py-3">Entitas Target</th>
                <th className="px-4 py-3">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{log.userName || "Sistem"}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{log.userRole || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium capitalize">
                    {log.targetEntity} {log.targetId ? `(#${log.targetId})` : ""}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-slate-500 font-mono text-[11px]">
                    {log.details ? JSON.stringify(log.details) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
