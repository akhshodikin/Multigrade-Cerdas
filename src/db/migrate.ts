import { getPGliteClient } from "./index";
import postgres from "postgres";
import { BUNDLED_MIGRATIONS } from "./bundled-migrations";

export async function runMigrations() {
  console.log("Menjalankan migrasi database PostgreSQL...");
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (databaseUrl) {
    const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
    const sql = postgres(databaseUrl, {
      prepare: false,
      ssl: isLocal ? false : "require",
      max: 1,
    });

    try {
      for (const item of BUNDLED_MIGRATIONS) {
        console.log(`Mengaplikasikan migrasi cloud: ${item.name}...`);
        const statements = item.sql
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
              console.warn(`Peringatan saat eksekusi ${item.name}:`, errMsg);
            }
          }
        }
      }
    } finally {
      await sql.end({ timeout: 5 });
    }
  } else {
    const client = await getPGliteClient();
    for (const item of BUNDLED_MIGRATIONS) {
      console.log(`Mengaplikasikan migrasi local: ${item.name}...`);
      const statements = item.sql
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
            console.warn(`Peringatan saat eksekusi ${item.name}:`, errMsg);
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
