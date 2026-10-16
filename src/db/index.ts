import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePGlite } from "drizzle-orm/pglite";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

// Persistent PostgreSQL data directory for SDN SEDAENG II
const DATA_DIR = process.env.PGLITE_DATA_DIR || path.join(process.cwd(), "data", "postgres");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Global singleton client to persist across hot reloads in Next.js development
declare global {
  // eslint-disable-next-line no-var
  var __pgliteClient: PGlite | undefined;
}

let pgliteInstance = global.__pgliteClient;

if (!pgliteInstance) {
  pgliteInstance = new PGlite(DATA_DIR);
  if (process.env.NODE_ENV !== "production") {
    global.__pgliteClient = pgliteInstance;
  }
}

export async function getPGliteClient(): Promise<PGlite> {
  return pgliteInstance!;
}

// Export Drizzle database instance
export const db = drizzlePGlite(pgliteInstance, { schema });
export type Database = typeof db;
