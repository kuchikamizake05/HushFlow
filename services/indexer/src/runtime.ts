import { fileURLToPath } from "node:url";

import type { PoolClient } from "pg";

import {
  applyMigrations,
  loadMigrations,
  type SqlClient,
} from "./db/migrations.js";
import { createIndexerPool } from "./db/pool.js";

function adapter(client: PoolClient): SqlClient {
  return {
    async query(text, values) {
      const result = await client.query(text, values as unknown[] | undefined);
      return { rows: result.rows as Array<Record<string, unknown>> };
    },
  };
}

export async function createMigratedPool(databaseUrl: string) {
  const pool = createIndexerPool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await applyMigrations(
      adapter(client),
      await loadMigrations(getMigrationDirectory()),
    );
    client.release();
    return pool;
  } catch (error) {
    client.release();
    await pool.end();
    throw error;
  }
}

export function getMigrationDirectory(): string {
  return fileURLToPath(new URL("../migrations", import.meta.url));
}
