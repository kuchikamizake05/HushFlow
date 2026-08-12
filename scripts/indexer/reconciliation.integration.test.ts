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
const schema = `m4a_reconcile_${process.pid}`;
const admin = createIndexerPool({ connectionString, max: 2 });
const pool = createIndexerPool({
  connectionString,
  max: 4,
  options: `-c search_path=${schema}`,
});

type Fixture = { logs: Array<RawChainLog & { expected: unknown }> };

function hash(value: number): `0x${string}` {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function adapter(client: IndexerPoolClient): SqlClient {
  return {
    async query(text, values) {
      const result = await client.query(text, values as unknown[] | undefined);
      return { rows: result.rows as Array<Record<string, unknown>> };
    },
  };
}

async function batch() {
  const fixture = JSON.parse(
    await readFile("packages/protocol/fixtures/v1/events.json", "utf8"),
  ) as Fixture;
  const indexes = [2, 3, 5, 6, 8];
  const logs = indexes.map((index, sequence) => {
    const { expected, ...log } = fixture.logs[index]!;
    void expected;
    return { ...log, transactionHash: hash(30_000 + sequence) };
  });
  const blocks: ChainBlock[] = logs.map((log, index) => ({
    chainId: 114,
    blockNumber: log.blockNumber,
    blockHash: hash(40_000 + index),
    parentHash: hash(39_999 + index),
    timestamp: new Date(1_700_000_000_000 + index * 1_000),
  }));
  return { blocks, logs };
}

async function projectionSnapshot() {
  const result = await pool.query(`
    SELECT jsonb_build_object(
      'rfqs', (SELECT jsonb_agg(to_jsonb(r) ORDER BY rfq_id) FROM rfqs r),
      'providers', (SELECT jsonb_agg(to_jsonb(p) ORDER BY rfq_id, position) FROM rfq_providers p),
      'actions', (SELECT jsonb_agg(to_jsonb(a) ORDER BY rfq_id) FROM fcc_actions a),
      'outcomes', (SELECT jsonb_agg(to_jsonb(o) ORDER BY rfq_id) FROM rfq_outcomes o),
      'claims', (SELECT jsonb_agg(to_jsonb(c) ORDER BY rfq_id, account) FROM claims c)
    ) AS snapshot
  `);
  return result.rows[0]?.snapshot;
}

beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  const client = await pool.connect();
  try {
    await applyMigrations(
      adapter(client),
      await loadMigrations(resolve("services/indexer/migrations")),
    );
  } finally {
    client.release();
  }
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

async function ingest(store: IndexerStore) {
  const value = await batch();
  await store.ingestBatch({
    chainId: 114,
    deploymentBlock: "123458",
    finalityWindow: 64,
    contractAddress: CONTRACT,
    latestObservedBlock: "123464",
    ...value,
  });
  return value;
}

describe("restart, replay, and reorg reconciliation", () => {
  it("verifies the persisted cursor block before restart", async () => {
    const store = new IndexerStore(pool);
    const value = await ingest(store);

    await expect(
      store.verifyCursor(114, value.blocks.at(-1)!),
    ).resolves.toBeUndefined();
    await expect(
      store.verifyCursor(114, {
        ...value.blocks.at(-1)!,
        blockHash: hash(99_999),
      }),
    ).rejects.toThrowError("INDEXER_CURSOR_MISMATCH");
  });

  it("replays canonical evidence into an identical derived snapshot", async () => {
    const store = new IndexerStore(pool);
    await ingest(store);
    const before = await projectionSnapshot();

    await store.replay(114);
    const firstReplay = await projectionSnapshot();
    await store.replay(114);
    const secondReplay = await projectionSnapshot();

    expect(firstReplay).toEqual(before);
    expect(secondReplay).toEqual(before);
  });

  it("removes orphaned evidence and rewinds to the nearest ancestor", async () => {
    const store = new IndexerStore(pool);
    const value = await ingest(store);
    const ancestor = value.blocks[2]!;
    const replacement: ChainBlock[] = [
      ancestor,
      {
        ...value.blocks[3]!,
        blockHash: hash(50_003),
        parentHash: ancestor.blockHash,
      },
      {
        ...value.blocks[4]!,
        blockHash: hash(50_004),
        parentHash: hash(50_003),
      },
    ];

    const result = await store.reconcileWindow(114, replacement);

    expect(result).toEqual({ reorg: true, ancestorBlock: "123461" });
    const rfq = await pool.query(
      "SELECT status, action_id FROM rfqs WHERE rfq_id = 1",
    );
    const cursor = await pool.query(
      "SELECT last_processed_block, last_processed_hash FROM chain_cursor WHERE chain_id = 114",
    );
    const counts = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM chain_logs) AS logs,
        (SELECT count(*)::int FROM rfq_outcomes) AS outcomes,
        (SELECT count(*)::int FROM claims) AS claims
    `);
    expect(rfq.rows[0]).toMatchObject({
      status: "OPEN",
      action_id:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(cursor.rows[0]).toEqual({
      last_processed_block: "123461",
      last_processed_hash: ancestor.blockHash,
    });
    expect(counts.rows[0]).toEqual({ logs: 3, outcomes: 0, claims: 0 });
  });

  it("fails closed when no ancestor exists inside the supplied window", async () => {
    const store = new IndexerStore(pool);
    const value = await ingest(store);

    await expect(
      store.reconcileWindow(114, [
        { ...value.blocks[0]!, blockHash: hash(70_000) },
      ]),
    ).rejects.toThrowError("INDEXER_REORG_REPLAY_REQUIRED");

    const health = await pool.query(
      "SELECT status, detail_code FROM indexer_health WHERE chain_id = 114",
    );
    expect(health.rows[0]).toEqual({
      status: "degraded",
      detail_code: "REORG_REPLAY_REQUIRED",
    });
  });
});
