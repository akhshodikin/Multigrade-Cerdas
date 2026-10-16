import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { generateUsersXlsx } from "@/lib/excel/users-excel";
import { recordAuditLog } from "@/lib/audit/logger";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir." }, { status: 401 });
    }

    if (user.role !== "admin" && user.role !== "headmaster") {
      return NextResponse.json({ error: "Akses ditolak: Hanya Administrator dan Kepala Sekolah yang berwenang mengekspor data GTK." }, { status: 403 });
    }

    const xlsxBuffer = await generateUsersXlsx();

    await recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "EXPORT_USERS_XLSX",
      targetEntity: "user",
      details: { userRole: user.role },
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `data-guru-gtk-sdn-kandangan-1-${timestamp}.xlsx`;

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal mengekspor data guru.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
