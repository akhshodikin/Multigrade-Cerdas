import { NextResponse } from "next/server";
import { runMigrations } from "@/db/migrate";
import { runSeed } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("[Setup API] Menjalankan migrasi database...");
    await runMigrations();

    console.log("[Setup API] Menjalankan seeding data awal...");
    await runSeed();

    return NextResponse.json({
      success: true,
      message: "Database Multigrade Cerdas AI berhasil diinisialisasi dan diisi dengan data awal SDN SEDAENG II TOSARI!",
      accounts: [
        { role: "admin", email: "admin@sedaeng2.sch.id", defaultPassword: "Sedaeng2#Tosari" },
        { role: "headmaster", email: "kepsek@sedaeng2.sch.id", defaultPassword: "Sedaeng2#Tosari" },
        { role: "teacher", email: "guru.a@sedaeng2.sch.id", defaultPassword: "Sedaeng2#Tosari" },
      ],
      loginUrl: "/login",
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Setup API Error]:", errorMsg);
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        hint: "Pastikan DATABASE_URL atau POSTGRES_URL diatur dengan benar di Environment Variables Vercel.",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
