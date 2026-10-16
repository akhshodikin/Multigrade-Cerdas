import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { getMaterialIntersectionByIdAction } from "@/app/actions/material-intersection";
import { MaterialIntersectionDetailView } from "@/components/curriculum/MaterialIntersectionDetailView";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MaterialIntersectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireAuth(["admin", "headmaster", "teacher"]);
  const { id } = await params;

  const mapData = await getMaterialIntersectionByIdAction(id);

  if (!mapData) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Pemetaan Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 mt-1">
            Data pemetaan irisan materi dengan ID tersebut tidak ditemukan di database.
          </p>
        </div>
        <Link
          href="/dashboard/kurikulum/irisan-materi"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-sm hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-2">
      <MaterialIntersectionDetailView mapData={mapData} currentUser={currentUser} />
    </div>
  );
}
