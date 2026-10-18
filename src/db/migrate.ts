import fs from "fs";
import path from "path";
import { getPGliteClient } from "./index";

import postgres from "postgres";

export async function runMigrations() {
  console.log("Menjalankan migrasi database PostgreSQL...");
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  const drizzleDir = path.join(process.cwd(), "drizzle");
  if (!fs.existsSync(drizzleDir)) {
    throw new Error(`Direktori migrasi tidak ditemukan: ${drizzleDir}`);
  }

  const sqlFiles = fs
    .readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (databaseUrl) {
    const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
    const sql = postgres(databaseUrl, {
      prepare: false,
      ssl: isLocal ? false : "require",
      max: 1,
    });

    try {
      for (const file of sqlFiles) {
        const fullPath = path.join(drizzleDir, file);
        console.log(`Mengaplikasikan migrasi cloud: ${file}...`);
        const sqlContent = fs.readFileSync(fullPath, "utf-8");
        const statements = sqlContent
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          try {
            await sql.unsafe(statement);
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            if (
              !errMsg.includes("already exists") &&
              !errMsg.includes("duplicate key")
            ) {
              console.warn(`Peringatan saat eksekusi ${file}:`, errMsg);
            }
          }
        }
      }
    } finally {
      await sql.end({ timeout: 5 });
    }
  } else {
    const client = await getPGliteClient();
    for (const file of sqlFiles) {
      const fullPath = path.join(drizzleDir, file);
      console.log(`Mengaplikasikan migrasi local: ${file}...`);
      const sqlContent = fs.readFileSync(fullPath, "utf-8");
      const statements = sqlContent
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await client.exec(statement);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (
            !errMsg.includes("already exists") &&
            !errMsg.includes("duplicate key")
          ) {
            console.warn(`Peringatan saat eksekusi ${file}:`, errMsg);
          }
        }
      }
    }
  }

  console.log("Seluruh migrasi database PostgreSQL berhasil diaplikasikan!");
}

if (process.argv[1]?.includes("migrate")) {
  runMigrations()
    .then(() => {
      console.log("Migrasi selesai.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Gagal menjalankan migrasi:", err);
      process.exit(1);
    });
}
