import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { generateUsersTemplateXlsx } from "@/lib/excel/users-excel";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir." }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak: Hanya Administrator yang berwenang mengunduh template GTK." }, { status: 403 });
    }

    const xlsxBuffer = await generateUsersTemplateXlsx();
    const filename = `template-impor-guru-gtk-sdn-kandangan-1.xlsx`;

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal mengunduh template guru.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
