import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  applyMigrations,
  loadMigrations,
  type SqlClient,
} from "../../services/indexer/src/db/migrations.js";
import {
  createIndexerPool,
  type IndexerPoolClient,
} from "../../services/indexer/src/db/pool.js";
import {
  IndexerStore,
  type ChainBlock,
  type RawChainLog,
} from "../../services/indexer/src/db/store.js";

const CONTRACT = "0x9999999999999999999999999999999999999999";
const connectionString =
  process.env.HUSHFLOW_TEST_DATABASE_URL ??
  "postgresql://hushflow:hushflow-local-only@127.0.0.1:5432/hushflow";
const schema = `m4a_store_${process.pid}`;
const admin = createIndexerPool({ connectionString, max: 2 });
const pool = createIndexerPool({
  connectionString,
  max: 4,
  options: `-c search_path=${schema}`,
});

type Fixture = {
  logs: Array<RawChainLog & { expected: unknown }>;
};

function adapter(client: IndexerPoolClient): SqlClient {
  return {
    async query(text, values) {
      const result = await client.query(text, values as unknown[] | undefined);
      return { rows: result.rows as Array<Record<string, unknown>> };
    },
  };
}

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await applyMigrations(
      adapter(client),
      await loadMigrations(resolve("services/indexer/migrations")),
    );
  } finally {
    client.release();
  }
}

function hash(value: number): `0x${string}` {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function normalizeLog(log: RawChainLog, sequence: number): RawChainLog {
  return { ...log, transactionHash: hash(10_000 + sequence) };
}

async function coherentBatch() {
  const fixture = JSON.parse(
    await readFile("packages/protocol/fixtures/v1/events.json", "utf8"),
  ) as Fixture;
  const indexes = [2, 3, 5, 6, 8];
  const logs = indexes.map((index, sequence) => {
    const { expected, ...log } = fixture.logs[index]!;
    void expected;
    return normalizeLog(log, sequence);
  });
  const blocks: ChainBlock[] = [];
  for (let number = 123458; number <= 123464; number += 1) {
    const index = number - 123458;
    blocks.push({
      chainId: 114,
      blockNumber: String(number),
      blockHash: hash(20_000 + index),
      parentHash: hash(19_999 + index),
      timestamp: new Date(1_700_000_000_000 + index * 1_000),
    });
  }
  return { blocks, logs };
}

beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await migrate();
});

beforeEach(async () => {
  await pool.query(
    "TRUNCATE chain_blocks, chain_cursor, indexer_health CASCADE",
  );
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});

describe("IndexerStore PostgreSQL integration", () => {
  it("atomically persists evidence, projection, cursor, and health", async () => {
    const store = new IndexerStore(pool);
    const batch = await coherentBatch();

    await store.ingestBatch({
      chainId: 114,
      deploymentBlock: "123458",
      finalityWindow: 64,
      dataMode: "fixture",
      sourceIdentity: "store-test-v1",
      contractAddress: CONTRACT,
      latestObservedBlock: "123464",
      ...batch,
    });

    const evidence = await pool.query(
      "SELECT count(*)::int AS count FROM chain_logs",
    );
    const rfq = await pool.query(
      "SELECT status, provider_count, action_id FROM rfqs WHERE rfq_id = 1",
    );
    const cursor = await pool.query(
      "SELECT last_processed_block, last_processed_hash FROM chain_cursor WHERE chain_id = 114",
    );
    const health = await pool.query(
      "SELECT status, lag_blocks FROM indexer_health WHERE chain_id = 114",
    );

    expect(evidence.rows[0]?.count).toBe(5);
    expect(rfq.rows[0]).toMatchObject({
      status: "SETTLED",
      provider_count: 1,
      action_id:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(cursor.rows[0]).toMatchObject({
      last_processed_block: "123464",
      last_processed_hash: batch.blocks.at(-1)?.blockHash,
    });
    expect(health.rows[0]).toMatchObject({
      status: "healthy",
      lag_blocks: "0",
    });
  });

  it("ingests the same canonical batch idempotently", async () => {
    const store = new IndexerStore(pool);
    const batch = await coherentBatch();
    const input = {
      chainId: 114,
      deploymentBlock: "123458",
      finalityWindow: 64,
      dataMode: "fixture" as const,
      sourceIdentity: "store-test-v1",
      contractAddress: CONTRACT,
      latestObservedBlock: "123464",
      ...batch,
    };

    await store.ingestBatch(input);
    await store.ingestBatch(input);

    const counts = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM chain_logs) AS logs,
        (SELECT count(*)::int FROM rfqs) AS rfqs,
        (SELECT count(*)::int FROM rfq_providers) AS providers,
        (SELECT count(*)::int FROM claims) AS claims
    `);
    expect(counts.rows[0]).toEqual({
      logs: 5,
      rfqs: 1,
      providers: 1,
      claims: 1,
    });
  });

  it("rolls back the full batch when projection ordering is invalid", async () => {
    const store = new IndexerStore(pool);
    const batch = await coherentBatch();

    await expect(
      store.ingestBatch({
        chainId: 114,
        deploymentBlock: "123459",
        finalityWindow: 64,
        dataMode: "fixture",
        sourceIdentity: "store-test-v1",
        contractAddress: CONTRACT,
        latestObservedBlock: "123459",
        blocks: [batch.blocks[1]!],
        logs: [batch.logs[1]!],
      }),
    ).rejects.toThrowError("INDEXER_BATCH_REJECTED");

    const result = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM chain_blocks) AS blocks,
        (SELECT count(*)::int FROM chain_logs) AS logs,
        (SELECT count(*)::int FROM chain_cursor) AS cursors
    `);
    expect(result.rows[0]).toEqual({ blocks: 0, logs: 0, cursors: 0 });
  });

  it("retains source transaction and log identity on derived rows", async () => {
    const store = new IndexerStore(pool);
    const batch = await coherentBatch();

    await store.ingestBatch({
      chainId: 114,
      deploymentBlock: "123458",
      finalityWindow: 64,
      dataMode: "fixture",
      sourceIdentity: "store-test-v1",
      contractAddress: CONTRACT,
      latestObservedBlock: "123464",
      ...batch,
    });

    const provider = await pool.query(
      "SELECT source_transaction_hash, source_log_index FROM rfq_providers",
    );
    expect(provider.rows[0]).toEqual({
      source_transaction_hash: batch.logs[1]?.transactionHash,
      source_log_index: batch.logs[1]?.logIndex,
    });
  });

  it("rejects a block range whose parent hash breaks continuity", async () => {
    const store = new IndexerStore(pool);
    const batch = await coherentBatch();
    const blocks = batch.blocks.map((block) => ({ ...block }));
    blocks[2] = { ...blocks[2]!, parentHash: hash(999_999) };

    await expect(
      store.ingestBatch({
        chainId: 114,
        deploymentBlock: "123458",
        finalityWindow: 64,
        dataMode: "fixture",
        sourceIdentity: "store-test-v1",
        contractAddress: CONTRACT,
        latestObservedBlock: "123464",
        blocks,
        logs: batch.logs,
      }),
    ).rejects.toThrowError("INDEXER_BATCH_REJECTED");

    const result = await pool.query(
      "SELECT count(*)::int AS count FROM chain_blocks",
    );
    expect(result.rows[0]?.count).toBe(0);
  });
});
