"use client";

import React from "react";
import { logoutAction } from "@/app/actions/auth";
import { LogOut, User, Menu, Shield } from "lucide-react";
import { CurrentUser } from "@/lib/auth/session";

interface NavbarProps {
  user: CurrentUser;
  schoolName: string;
  academicYear: string;
  semester: string;
  onToggleSidebar?: () => void;
}

export function Navbar({ user, schoolName, academicYear, semester, onToggleSidebar }: NavbarProps) {
  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: "Administrator", color: "bg-purple-100 text-purple-800 border-purple-200" },
    headmaster: { label: "Kepala Sekolah", color: "bg-amber-100 text-amber-800 border-amber-200" },
    teacher: { label: "Guru Pengampu", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };

  const currentRole = roleLabels[user.role] || { label: user.role, color: "bg-slate-100 text-slate-800" };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2.5 sm:px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
              {schoolName}
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              TA {academicYear} &bull; {semester}
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">
            Sistem Pembelajaran Kelas Rangkap Terpadu (Multigrade)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-semibold text-slate-900">{user.name}</div>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${currentRole.color}`}>
              {currentRole.label}
            </span>
            {user.assignedGroupId && (
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                {user.assignedGroupId.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            title="Keluar dari sistem"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </form>
      </div>
    </header>
  );
}
