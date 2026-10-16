import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { generateStudentsXlsx } from "@/lib/excel/students-excel";
import { recordAuditLog } from "@/lib/audit/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawClass = searchParams.get("kelas") || searchParams.get("classId");
    const rawGroup = searchParams.get("kelompok") || searchParams.get("groupId");

    const filter: { classId?: number; groupId?: string } = {};
    if (rawClass) filter.classId = parseInt(rawClass, 10);
    if (rawGroup) filter.groupId = rawGroup;

    // Jika guru, batasi ekspor hanya untuk kelompoknya sendiri
    if (user.role === "teacher" && user.assignedGroupId) {
      filter.groupId = user.assignedGroupId;
    }

    const xlsxBuffer = await generateStudentsXlsx(filter);

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "EXPORT_STUDENTS_XLSX",
      targetEntity: "student",
      details: { filter, userRole: user.role },
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `data-siswa-sdn-kandangan-1-${timestamp}.xlsx`;

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal mengekspor data siswa.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
