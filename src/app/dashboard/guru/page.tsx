import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { createUserFormAction, toggleUserStatusFormAction } from "@/app/actions/users";
import { Users, UserPlus, Shield, CheckCircle2, XCircle } from "lucide-react";
import { UserExcelActions } from "@/components/users/UserExcelActions";
import { EditUserModal } from "@/components/users/EditUserModal";

export default async function GuruPage() {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  const usersList = await db.select().from(schema.users);
  const groupsList = await db.select().from(schema.multigradeGroups);

  const roleBadges: Record<string, { label: string; color: string }> = {
    admin: { label: "Admin", color: "bg-purple-100 text-purple-800 border-purple-200" },
    headmaster: { label: "Kepala Sekolah", color: "bg-amber-100 text-amber-800 border-amber-200" },
    teacher: { label: "Guru", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Data Guru &amp; Tenaga Pendidik
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pengelolaan guru pengampu kelas rangkap (Kelompok A, B, C) SDN Kandangan I Tosari
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UserExcelActions isAdmin={isAdmin} />
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 hidden sm:block">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table of Users */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Daftar Pendidik &amp; Staf ({usersList.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nama &amp; Email</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Pengampu Kelompok</th>
                <th className="px-4 py-3">NIP / Kontak</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersList.map((u) => {
                const badge = roleBadges[u.role] || { label: u.role, color: "bg-slate-100 text-slate-800" };
                const assignedGroup = groupsList.find((g) => g.id === u.assignedGroupId);

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {assignedGroup ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {assignedGroup.name} ({assignedGroup.phase})
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      <div>NIP: {u.nip || "-"}</div>
                      <div className="text-[10px] text-slate-400">Telp: {u.phone || "-"}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      {u.isActive ? (
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
                    {isAdmin && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <EditUserModal
                            user={{
                              id: u.id,
                              name: u.name,
                              email: u.email,
                              role: u.role as any,
                              nip: u.nip,
                              phone: u.phone,
                              assignedGroupId: u.assignedGroupId,
                              isActive: u.isActive,
                            }}
                            isAdmin={isAdmin}
                          />
                          {u.id !== currentUser.id && (
                            <form action={toggleUserStatusFormAction}>
                              <input type="hidden" name="userId" value={u.id} />
                              <input type="hidden" name="currentStatus" value={String(u.isActive)} />
                              <button
                                type="submit"
                                className={`px-2 py-1 rounded text-[11px] font-bold border transition ${
                                  u.isActive
                                    ? "text-rose-700 border-rose-200 hover:bg-rose-50"
                                    : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                }`}
                              >
                                {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Teacher Form (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>Tambah Pendidik / Staf Baru</span>
          </h3>

          <form
            action={createUserFormAction}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Nama Lengkap &amp; Gelar
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Nama Guru, S.Pd."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Alamat Email
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="nama@sedaeng2.sch.id"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Peran Pengguna
              </label>
              <select
                name="role"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="teacher">Guru Pengampu</option>
                <option value="headmaster">Kepala Sekolah</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Tugaskan ke Kelompok Belajar
              </label>
              <select
                name="assignedGroupId"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="">-- Tidak Ditugaskan Khusus --</option>
                <option value="group-a">Kelompok A (Kelas 1 &amp; 2 - Fase A)</option>
                <option value="group-b">Kelompok B (Kelas 3 &amp; 4 - Fase B)</option>
                <option value="group-c">Kelompok C (Kelas 5 &amp; 6 - Fase C)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                NIP / NUPTK
              </label>
              <input
                type="text"
                name="nip"
                placeholder="1985..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Nomor Telepon
              </label>
              <input
                type="text"
                name="phone"
                placeholder="081..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Simpan Pendidik</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
