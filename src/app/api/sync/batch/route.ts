import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { processSyncBatchOnServer } from "@/lib/offline/sync-processor";
import type { OutboxItem } from "@/lib/offline/types";

export const dynamic = "force-dynamic";

/**
 * Endpoint API Sinkronisasi Batch Luring (Offline Batch Sync API)
 * POST /api/sync/batch
 * Memvalidasi autentikasi pengguna dari cookie sesi.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED: Sesi kedaluwarsa atau belum masuk.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const items: OutboxItem[] = body.items || [];

    if (!Array.isArray(items)) {
      return NextResponse.json(
        {
          success: false,
          error: "Format payload tidak valid. Diperlukan array 'items'.",
        },
        { status: 400 }
      );
    }

    const result = await processSyncBatchOnServer(items, user);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: `Kesalahan internal sinkronisasi server: ${message}`,
      },
      { status: 500 }
    );
  }
}
