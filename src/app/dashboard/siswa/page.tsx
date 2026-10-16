import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc } from "drizzle-orm";
import { createStudentFormAction, toggleStudentStatusFormAction } from "@/app/actions/students";
import { GraduationCap, UserPlus, CheckCircle2, XCircle, Filter } from "lucide-react";
import { StudentExcelActions } from "@/components/students/StudentExcelActions";
import { EditStudentModal } from "@/components/students/EditStudentModal";

export default async function SiswaPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string; kelompok?: string }>;
}) {
  const currentUser = await getCurrentUser();
  const resolvedParams = await searchParams;
  const filterKelas = resolvedParams?.kelas ? Number(resolvedParams.kelas) : null;
  const filterKelompok = resolvedParams?.kelompok || null;

  let query = db.select().from(schema.students);
  const allStudents = await query.orderBy(asc(schema.students.classId), asc(schema.students.studentCode));

  const filteredStudents = allStudents.filter((s) => {
    if (filterKelas && s.classId !== filterKelas) return false;
    if (filterKelompok && s.groupId !== filterKelompok) return false;
    return true;
  });

  const classesList = await db.select().from(schema.classes).orderBy(asc(schema.classes.id));
  const groupsList = await db.select().from(schema.multigradeGroups);

  const groupLabels: Record<string, { label: string; color: string }> = {
    "group-a": { label: "Kelompok A (Fase A)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    "group-b": { label: "Kelompok B (Fase B)", color: "bg-blue-50 text-blue-700 border-blue-200" },
    "group-c": { label: "Kelompok C (Fase C)", color: "bg-purple-50 text-purple-700 border-purple-200" },
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Data Siswa SDN Kandangan I Tosari
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data siswa terdaftar beserta pemetaan kelas asal (1 s/d 6) dan kelompok kelas rangkap (A, B, C)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StudentExcelActions
            canImport={currentUser?.role === "admin" || currentUser?.role === "headmaster" || currentUser?.role === "teacher"}
            filterKelas={filterKelas}
            filterKelompok={filterKelompok}
          />
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 hidden sm:block">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Filter:
        </span>
        <a
          href="/dashboard/siswa"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            !filterKelas && !filterKelompok
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Semua ({allStudents.length})
        </a>
        <a
          href="/dashboard/siswa?kelompok=group-a"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterKelompok === "group-a"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Kelompok A (Kls 1-2)
        </a>
        <a
          href="/dashboard/siswa?kelompok=group-b"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterKelompok === "group-b"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Kelompok B (Kls 3-4)
        </a>
        <a
          href="/dashboard/siswa?kelompok=group-c"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filterKelompok === "group-c"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Kelompok C (Kls 5-6)
        </a>
      </div>

      {/* Table of Students */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Siswa ({filteredStudents.length} ditampilkan)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Kode Siswa</th>
                <th className="px-4 py-3">Nama Lengkap &amp; Panggilan</th>
                <th className="px-4 py-3">Kelas Asal</th>
                <th className="px-4 py-3">Kelompok Rangkap</th>
                <th className="px-4 py-3">L/P</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s) => {
                const groupBadge = groupLabels[s.groupId] || { label: s.groupId, color: "bg-slate-100 text-slate-800" };

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{s.studentCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{s.fullName}</div>
                      <div className="text-[11px] text-slate-500">Panggilan: {s.displayName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                        Kelas {s.classId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${groupBadge.color}`}>
                        {groupBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${s.gender === "L" ? "text-blue-600" : "text-rose-600"}`}>
                        {s.gender}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                          <XCircle className="w-3.5 h-3.5" />
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(currentUser?.role === "admin" ||
                          currentUser?.role === "headmaster" ||
                          (currentUser?.role === "teacher" &&
                            (!currentUser.assignedGroupId || currentUser.assignedGroupId === s.groupId))) && (
                          <EditStudentModal
                            student={{
                              id: s.id,
                              studentCode: s.studentCode,
                              fullName: s.fullName,
                              displayName: s.displayName,
                              classId: s.classId,
                              groupId: s.groupId,
                              gender: s.gender,
                              birthDate: s.birthDate,
                              guardianName: s.guardianName,
                              isActive: s.isActive,
                              notes: s.notes,
                            }}
                          />
                        )}
                        <form action={toggleStudentStatusFormAction}>
                          <input type="hidden" name="studentId" value={s.id} />
                          <input type="hidden" name="currentStatus" value={String(s.isActive)} />
                          <button
                            type="submit"
                            className={`px-2 py-1 rounded text-[11px] font-bold border transition ${
                              s.isActive
                                ? "text-rose-700 border-rose-200 hover:bg-rose-50"
                                : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            }`}
                          >
                            {s.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Add Student */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-600" />
          <span>Daftarkan Siswa Baru</span>
        </h3>

        <form
          action={createStudentFormAction}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Kode Siswa (Unik)
            </label>
            <input
              type="text"
              name="studentCode"
              required
              placeholder="SDN2-A-10"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Nama Siswa (Sintetis)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Nama Panggilan
            </label>
            <input
              type="text"
              name="displayName"
              required
              placeholder="Panggilan / Inisial"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Tingkat Kelas Asal
            </label>
            <select
              name="classId"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="1">Kelas 1 &rarr; Masuk Kelompok A (Fase A)</option>
              <option value="2">Kelas 2 &rarr; Masuk Kelompok A (Fase A)</option>
              <option value="3">Kelas 3 &rarr; Masuk Kelompok B (Fase B)</option>
              <option value="4">Kelas 4 &rarr; Masuk Kelompok B (Fase B)</option>
              <option value="5">Kelas 5 &rarr; Masuk Kelompok C (Fase C)</option>
              <option value="6">Kelas 6 &rarr; Masuk Kelompok C (Fase C)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Jenis Kelamin
            </label>
            <select
              name="gender"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Nama Wali / Catatan
            </label>
            <input
              type="text"
              name="guardianName"
              placeholder="Orang Tua / Wali Siswa"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3 pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Simpan Data Siswa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
