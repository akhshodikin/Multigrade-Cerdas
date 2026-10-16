import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { generateStudentsTemplateXlsx } from "@/lib/excel/students-excel";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir." }, { status: 401 });
    }

    const xlsxBuffer = await generateStudentsTemplateXlsx();
    const filename = `template-impor-siswa-sdn-kandangan-1.xlsx`;

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal mengunduh template siswa.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
