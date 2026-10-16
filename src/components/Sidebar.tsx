"use client";

import React from "react";
import Link from "next/navigation";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  School,
  Calendar,
  Users,
  GraduationCap,
  Layers,
  ClipboardList,
  ShieldCheck,
  History,
  FileDown,
  Sparkles,
  BookOpen,
  X,
} from "lucide-react";
import { CurrentUser } from "@/lib/auth/session";

interface SidebarProps {
  user: CurrentUser;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navigationItems = [
    {
      title: "Ringkasan",
      items: [
        { name: "Dashboard Utama", href: "/dashboard", icon: LayoutDashboard },
        { name: "Kelompok Belajar Rangkap", href: "/dashboard/kelompok", icon: Layers },
      ],
    },
    {
      title: "Data Sekolah",
      items: [
        { name: "Profil Sekolah", href: "/dashboard/profil-sekolah", icon: School },
        { name: "Tahun Ajaran & Semester", href: "/dashboard/pengaturan-semester", icon: Calendar },
      ],
    },
    {
      title: "Data Pokok",
      items: [
        { name: "Data Siswa (27 Siswa)", href: "/dashboard/siswa", icon: GraduationCap },
        { name: "Guru & Tenaga Pendidik", href: "/dashboard/guru", icon: Users },
      ],
    },
    {
      title: "Bank Kurikulum",
      items: [
        { name: "Ringkasan Kurikulum", href: "/dashboard/kurikulum", icon: Layers },
        { name: "Irisan Materi AI", href: "/dashboard/kurikulum/irisan-materi", icon: Sparkles },
        { name: "Pusat Validasi", href: "/dashboard/kurikulum/validasi", icon: ShieldCheck },
        { name: "Dokumen Sumber", href: "/dashboard/kurikulum/sumber", icon: School },
        { name: "Capaian Pembelajaran (CP)", href: "/dashboard/kurikulum/cp", icon: GraduationCap },
        { name: "Tujuan Pembelajaran (TP)", href: "/dashboard/kurikulum/tp", icon: LayoutDashboard },
        { name: "Alur Tujuan (ATP)", href: "/dashboard/kurikulum/atp", icon: Calendar },
        { name: "Modul Ajar Multigrade", href: "/dashboard/kurikulum/modul-ajar", icon: BookOpen },
        { name: "Riwayat Versi", href: "/dashboard/kurikulum/versi", icon: History },
        { name: "Ekspor Kurikulum", href: "/dashboard/kurikulum/ekspor", icon: FileDown },
      ],
    },
    {
      title: "Sistem & Keamanan",
      items: [
        { name: "Log Audit Aktivitas", href: "/dashboard/audit", icon: ClipboardList },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow">
              MC
            </span>
            <div>
              <div className="text-sm font-bold text-white tracking-tight leading-none">Multigrade Cerdas</div>
              <div className="text-[10px] text-blue-400 font-medium">SDN SEDAENG II Tosari</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigationItems.map((section, idx) => (
            <div key={idx}>
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {section.title}
              </div>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.name}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* User Card in Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-medium text-slate-200 truncate">{user.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
