import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { OfflineSyncManagerView } from "@/components/offline/OfflineSyncManagerView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pusat Sinkronisasi & Mode Offline - Multigrade Cerdas AI",
  description:
    "Pusat manajemen sinkronisasi data luring (offline-first), deteksi konflik, dan cadangan darurat SDN Kandangan I Tosari.",
};

export default async function OfflineSyncPage() {
  const user = await requireAuth(["admin", "headmaster", "teacher"]);

  return <OfflineSyncManagerView user={user} />;
}
