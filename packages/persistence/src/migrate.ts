import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createPool } from "./db.js";

export async function runMigrations(options: { databaseUrl: string }): Promise<void> {
  const pool = createPool({ connectionString: options.databaseUrl });
  try {
    const migrationPath = resolve("migrations", "001_init.sql");
    const sql = await readFile(migrationPath, "utf8");
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  runMigrations({ databaseUrl }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
