"use client";

import React, { useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { CurrentUser } from "@/lib/auth/session";

interface DashboardLayoutClientProps {
  user: CurrentUser;
  schoolName: string;
  academicYear: string;
  semester: string;
  children: React.ReactNode;
}

export function DashboardLayoutClient({
  user,
  schoolName,
  academicYear,
  semester,
  children,
}: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-800">
      <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          user={user}
          schoolName={schoolName}
          academicYear={academicYear}
          semester={semester}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
