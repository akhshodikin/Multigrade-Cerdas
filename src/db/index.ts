import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePGlite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_REGION);
const defaultDataDir = isVercel ? "/tmp/data/postgres" : path.join(process.cwd(), "data", "postgres");
const DATA_DIR = process.env.PGLITE_DATA_DIR || defaultDataDir;

declare global {
  var __pgliteClient: PGlite | undefined;
  var __postgresClient: any | undefined;
  var __drizzleDb: ReturnType<typeof drizzlePGlite<typeof schema>> | undefined;
}

let dbInstance = global.__drizzleDb;

if (!dbInstance) {
  if (databaseUrl) {
    // Hosted PostgreSQL (Vercel Postgres, Neon, Supabase, Railway, etc.)
    const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
    const client =
      global.__postgresClient ||
      postgres(databaseUrl, {
        prepare: false,
        ssl: isLocal ? false : "require",
        max: 10,
        idle_timeout: 20,
        connect_timeout: 15,
      });
    global.__postgresClient = client;
    dbInstance = drizzlePostgres(client, { schema }) as unknown as ReturnType<typeof drizzlePGlite<typeof schema>>;
  } else {
    // Persistent PostgreSQL data directory for local / offline mode
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    let pgliteInstance = global.__pgliteClient;
    if (!pgliteInstance) {
      pgliteInstance = new PGlite(DATA_DIR);
      global.__pgliteClient = pgliteInstance;
    }
    dbInstance = drizzlePGlite(pgliteInstance, { schema });
  }
  global.__drizzleDb = dbInstance;
}

export async function getPGliteClient(): Promise<PGlite> {
  if (!global.__pgliteClient) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    global.__pgliteClient = new PGlite(DATA_DIR);
  }
  return global.__pgliteClient;
}

// Export Drizzle database instance with complete schema types
export const db: ReturnType<typeof drizzlePGlite<typeof schema>> = dbInstance!;
export type Database = typeof db;


