import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import {
  GraduationCap,
  Users,
  Layers,
  School,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Ambil statistik data
  const studentsList = await db.select().from(schema.students);
  const activeStudentsCount = studentsList.filter((s) => s.isActive).length;

  const usersList = await db.select().from(schema.users);
  const teachersCount = usersList.filter((u) => u.role === "teacher" && u.isActive).length;

  const groups = await db.select().from(schema.multigradeGroups);
  const classesList = await db.select().from(schema.classes);

  const profile = await db.select().from(schema.schoolProfile).where(eq(schema.schoolProfile.id, 1));
  const school = profile[0];

  const recentLogs = await db
    .select()
    .from(schema.auditLogs)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(5);

  // Hitung siswa per kelompok
  const studentsByGroup = {
    "group-a": studentsList.filter((s) => s.groupId === "group-a" && s.isActive).length,
    "group-b": studentsList.filter((s) => s.groupId === "group-b" && s.isActive).length,
    "group-c": studentsList.filter((s) => s.groupId === "group-c" && s.isActive).length,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/60 border border-blue-400/30 text-xs font-semibold text-blue-200 mb-3">
            <span>SDN SEDAENG II Tosari</span>
            <span>&bull;</span>
            <span>Tahun Ajaran {school?.activeAcademicYear || "2024/2025"} ({school?.activeSemester || "Ganjil"})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {user?.name}!
          </h1>
          <p className="mt-2 text-sm text-blue-100 max-w-2xl">
            Sistem terpadu manajemen sekolah dan pembelajaran kelas rangkap (*multigrade teaching*) untuk 27 siswa berstandar Kurikulum Merdeka.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{activeStudentsCount}</div>
            <div className="text-xs font-semibold text-slate-500">Siswa Aktif</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{teachersCount}</div>
            <div className="text-xs font-semibold text-slate-500">Guru Pengampu</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">3</div>
            <div className="text-xs font-semibold text-slate-500">Kelompok Belajar</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <School className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">6</div>
            <div className="text-xs font-semibold text-slate-500">Tingkat Kelas Asal</div>
          </div>
        </div>
      </div>

      {/* Multigrade Group Status Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Distribusi Kelompok Belajar Rangkap</h2>
            <p className="text-xs text-slate-500">3 Kelompok Terpadu SDN SEDAENG II Tosari</p>
          </div>
          <a
            href="/dashboard/kelompok"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Detail Kelompok</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {groups.map((group) => {
            const leadTeacher = usersList.find((u) => u.id === group.leadTeacherId);
            const studentCount = studentsByGroup[group.id as keyof typeof studentsByGroup] || 0;
            const groupClasses = classesList.filter((c) => c.groupId === group.id);

            return (
              <div
                key={group.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-400 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-800 uppercase tracking-wide">
                    {group.phase}
                  </span>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {studentCount} Siswa
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{group.name}</h3>
                <div className="text-xs text-slate-600 mt-1">
                  Mencakup: {groupClasses.map((c) => c.name).join(" & ")}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">Guru Pengampu:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {leadTeacher ? leadTeacher.name : "Belum ditentukan"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit Log / Recent Activities */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">Aktivitas &amp; Audit Log Terbaru</h2>
          </div>
          <a
            href="/dashboard/audit"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Lihat Semua Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {recentLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">Belum ada aktivitas tercatat.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">{log.userName || "Sistem"}</span>{" "}
                  <span className="text-slate-600">melakukan</span>{" "}
                  <span className="font-semibold text-blue-600 px-1 py-0.5 bg-blue-50 rounded">
                    {log.action}
                  </span>{" "}
                  <span className="text-slate-500">pada entitas {log.targetEntity}</span>
                </div>
                <div className="text-[10px] text-slate-400 shrink-0 ml-2">
                  {new Date(log.createdAt).toLocaleString("id-ID")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
