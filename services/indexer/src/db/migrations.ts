import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { SqlClient } from "./types.js";

export type { SqlClient } from "./types.js";

export interface Migration {
  version: string;
  checksum: string;
  sql: string;
}

export class MigrationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "MigrationError";
    this.code = code;
  }
}

export async function loadMigrations(directory: string): Promise<Migration[]> {
  const filenames = (await readdir(directory))
    .filter((filename) => /^\d{3}_[a-z0-9_-]+\.sql$/.test(filename))
    .sort();

  const migrations = await Promise.all(
    filenames.map(async (filename) => {
      const sql = await readFile(join(directory, filename), "utf8");
      return {
        version: filename.slice(0, 3),
        checksum: createHash("sha256").update(sql).digest("hex"),
        sql,
      };
    }),
  );

  if (
    migrations.length === 0 ||
    new Set(migrations.map(({ version }) => version)).size !== migrations.length
  ) {
    throw new MigrationError("MIGRATION_SET_INVALID");
  }

  return migrations;
}

export async function applyMigrations(
  client: SqlClient,
  migrations: readonly Migration[],
): Promise<void> {
  await client.query("BEGIN");
  try {
    // Worker and API can start simultaneously against an empty or upgraded DB.
    // A transaction-scoped lock makes schema discovery and application atomic
    // across those independent processes.
    await client.query("SELECT pg_advisory_xact_lock(1213545569)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        checksum TEXT NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const result = await client.query(
      "SELECT version, checksum FROM schema_migrations ORDER BY version",
    );
    const applied = new Map(
      result.rows.map((row) => [String(row.version), String(row.checksum)]),
    );

    for (const migration of migrations) {
      const checksum = applied.get(migration.version);
      if (checksum && checksum !== migration.checksum) {
        throw new MigrationError("MIGRATION_CHECKSUM_MISMATCH");
      }
      if (checksum) continue;

      await client.query(migration.sql);
      await client.query(
        "INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)",
        [migration.version, migration.checksum],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof MigrationError) throw error;
    throw new MigrationError("MIGRATION_APPLY_FAILED");
  }
}
