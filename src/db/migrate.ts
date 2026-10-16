import fs from "fs";
import path from "path";
import { getPGliteClient } from "./index";

export async function runMigrations() {
  console.log("Menjalankan migrasi database PostgreSQL...");
  const client = await getPGliteClient();

  const migrationFile = path.join(process.cwd(), "drizzle", "0000_tearful_adam_destine.sql");
  if (!fs.existsSync(migrationFile)) {
    throw new Error(`Berkas migrasi tidak ditemukan: ${migrationFile}`);
  }

  const sqlContent = fs.readFileSync(migrationFile, "utf-8");
  // Split statements by --> statement-breakpoint
  const statements = sqlContent
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await client.exec(statement);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Ignore if table or constraint already exists
      if (
        !errMsg.includes("already exists") &&
        !errMsg.includes("duplicate key")
      ) {
        console.warn("Peringatan saat eksekusi migrasi:", errMsg);
      }
    }
  }

  console.log("Migrasi database PostgreSQL berhasil diselesaikan!");
}

if (process.argv[1]?.includes("migrate")) {
  runMigrations()
    .then(() => {
      console.log("Selesai.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Gagal menjalankan migrasi:", err);
      process.exit(1);
    });
}
