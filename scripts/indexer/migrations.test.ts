import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MigrationError,
  applyMigrations,
  loadMigrations,
  type SqlClient,
} from "../../services/indexer/src/db/migrations.js";

const migrationDirectory = resolve("services/indexer/migrations");

class FakeClient implements SqlClient {
  readonly calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  applied: Array<{ version: string; checksum: string }> = [];

  async query(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: readonly Record<string, unknown>[] }> {
    this.calls.push({ text, ...(values ? { values } : {}) });
    if (text.includes("SELECT version, checksum")) {
      return { rows: this.applied };
    }
    if (text.includes("INSERT INTO schema_migrations") && values) {
      this.applied.push({
        version: String(values[0]),
        checksum: String(values[1]),
      });
    }
    return { rows: [] };
  }
}

describe("indexer SQL migrations", () => {
  it("loads ordered migrations with stable SHA-256 checksums", async () => {
    const migrations = await loadMigrations(migrationDirectory);

    expect(migrations.map(({ version }) => version)).toEqual(["001"]);
    expect(migrations[0]?.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(migrations[0]?.sql).toContain("CREATE TABLE chain_logs");
  });

  it("defines evidence, derived, cursor, and health tables", async () => {
    const [migration] = await loadMigrations(migrationDirectory);
    const sql = migration?.sql ?? "";

    for (const table of [
      "schema_migrations",
      "chain_cursor",
      "chain_blocks",
      "chain_logs",
      "rfqs",
      "rfq_providers",
      "fcc_actions",
      "rfq_outcomes",
      "claims",
      "transactions",
      "indexer_health",
    ]) {
      expect(sql).toMatch(
        new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${table}`),
      );
    }
  });

  it("enforces canonical evidence and uint256 storage constraints", async () => {
    const [migration] = await loadMigrations(migrationDirectory);
    const sql = migration?.sql ?? "";

    expect(sql).toContain(
      "PRIMARY KEY (chain_id, transaction_hash, log_index)",
    );
    expect(sql).toContain("NUMERIC(78, 0)");
    expect(sql).toContain("ON DELETE CASCADE");
    expect(sql).toMatch(/CHECK \(.*~ '\^0x\[0-9a-f\]\{40\}\$'/s);
    expect(sql).toMatch(/CHECK \(.*~ '\^0x\[0-9a-f\]\{64\}\$'/s);
  });

  it("contains no forbidden private-data columns", async () => {
    const [migration] = await loadMigrations(migrationDirectory);
    const sql = (migration?.sql ?? "").toLowerCase();

    for (const forbidden of [
      "seller_minimum",
      "plaintext_quote",
      "decrypted_input",
      "private_key",
      "database_password",
      "tunnel_token",
    ]) {
      expect(sql).not.toContain(forbidden);
    }
  });

  it("applies each migration once inside one transaction", async () => {
    const client = new FakeClient();
    const migrations = await loadMigrations(migrationDirectory);

    await applyMigrations(client, migrations);
    await applyMigrations(client, migrations);

    expect(client.applied).toHaveLength(1);
    expect(client.calls.filter(({ text }) => text === "BEGIN")).toHaveLength(2);
    expect(client.calls.filter(({ text }) => text === "COMMIT")).toHaveLength(
      2,
    );
  });

  it("rolls back and fails closed on checksum drift", async () => {
    const client = new FakeClient();
    const migrations = await loadMigrations(migrationDirectory);
    client.applied = [{ version: "001", checksum: "0".repeat(64) }];

    await expect(applyMigrations(client, migrations)).rejects.toThrow(
      MigrationError,
    );
    expect(client.calls.at(-1)?.text).toBe("ROLLBACK");
  });
});
