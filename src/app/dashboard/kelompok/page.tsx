import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { Layers, Users, GraduationCap, Sparkles } from "lucide-react";

export default async function KelompokPage() {
  const groups = await db.select().from(schema.multigradeGroups).orderBy(asc(schema.multigradeGroups.id));
  const classesList = await db.select().from(schema.classes).orderBy(asc(schema.classes.id));
  const teachersList = await db.select().from(schema.users).where(eq(schema.users.role, "teacher"));
  const studentsList = await db.select().from(schema.students).where(eq(schema.students.isActive, true));

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Tiga Kelompok Pembelajaran Rangkap (Multigrade)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Struktur pengorganisasian 6 kelas asal ke dalam 3 rombongan belajar berbasis fase Kurikulum Merdeka
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
          <Layers className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {groups.map((group) => {
          const leadTeacher = teachersList.find((t) => t.id === group.leadTeacherId);
          const groupClasses = classesList.filter((c) => c.groupId === group.id);
          const groupStudents = studentsList.filter((s) => s.groupId === group.id);

          return (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                      {group.phase}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Tingkat: {groupClasses.map((c) => c.name).join(" dan ")}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">{group.name}</h2>
                  <p className="text-xs text-slate-600 mt-1">{group.description}</p>
                </div>

                <div className="flex items-center gap-4 text-xs bg-white p-3 rounded-xl border border-slate-200 shrink-0">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Guru Pengampu</span>
                    <span className="font-bold text-slate-900">{leadTeacher ? leadTeacher.name : "Belum ditentukan"}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Siswa</span>
                    <span className="font-black text-blue-600 text-sm">{groupStudents.length} Siswa</span>
                  </div>
                </div>
              </div>

              {/* Breakdown by Sub-Classes */}
              <div className="p-6">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Rincian Anggota Kelas Asal dalam Rombongan Ini:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupClasses.map((cls) => {
                    const classStudents = groupStudents.filter((s) => s.classId === cls.id);
                    return (
                      <div key={cls.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-slate-900 text-sm">{cls.name}</h3>
                          <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {classStudents.length} Siswa
                          </span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {classStudents.map((st) => (
                            <li key={st.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                              <span className="font-mono text-slate-500 font-semibold">{st.studentCode}</span>
                              <span className="font-medium text-slate-800">{st.fullName}</span>
                              <span className="text-[10px] px-1 bg-slate-200 rounded font-bold text-slate-600">{st.gender}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
