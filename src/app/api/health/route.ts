import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";

export async function GET() {
  try {
    // Quick probe to ensure database responsiveness
    const school = await db.query.schoolProfile.findFirst();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "multigrade-cerdas-ai",
      school: school?.name || "SDN SEDAENG II TOSARI",
      npsn: school?.npsn || "20519069",
      uptime: process.uptime(),
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: errorMsg,
    }, { status: 503 });
  }
}
