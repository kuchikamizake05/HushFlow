import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
  type RawChainLog,
} from "../../services/indexer/src/db/store.js";
import { ReadRepository } from "../../services/indexer/src/api/repository.js";

const SELLER = "0x1111111111111111111111111111111111111111";
const PROVIDER = "0x2222222222222222222222222222222222222222";
const CONTRACT = "0x9999999999999999999999999999999999999999";
const FXRP = "0x3333333333333333333333333333333333333333";
const USDT0 = "0x4444444444444444444444444444444444444444";
const connectionString =
  process.env.HUSHFLOW_TEST_DATABASE_URL ??
  "postgresql://hushflow:hushflow-local-only@127.0.0.1:5432/hushflow";
const schema = `m4a_reads_${process.pid}`;
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

  const fixture = JSON.parse(
    await readFile("packages/protocol/fixtures/v1/events.json", "utf8"),
  ) as Fixture;
  const indexes = [2, 3, 5, 6, 8];
  const logs = indexes.map((index, sequence) => {
    const { expected, ...log } = fixture.logs[index]!;
    void expected;
    return { ...log, transactionHash: hash(80_000 + sequence) };
  });
  const blocks = [];
  for (let number = 123458; number <= 123464; number += 1) {
    const index = number - 123458;
    blocks.push({
      chainId: 114,
      blockNumber: String(number),
      blockHash: hash(90_000 + index),
      parentHash: hash(89_999 + index),
      timestamp: new Date(1_700_000_000_000 + index * 1_000),
    });
  }
  await new IndexerStore(pool).ingestBatch({
    chainId: 114,
    deploymentBlock: "123458",
    finalityWindow: 64,
    dataMode: "fixture",
    sourceIdentity: "read-repository-test-v1",
    contractAddress: CONTRACT,
    latestObservedBlock: "123464",
    blocks,
    logs,
  });
});

afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});

const repository = new ReadRepository(pool, {
  chainId: 114,
  fxrpToken: FXRP,
  usdt0Token: USDT0,
});

describe("M4A read repository", () => {
  it("lists RFQs with stable filters and opaque pagination", async () => {
    const page = await repository.listRfqs({
      limit: 1,
      status: "SETTLED",
      seller: SELLER,
      provider: PROVIDER,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      schemaVersion: 1,
      rfqId: "1",
      status: "SETTLED",
      providerCount: 1,
      winningProvider: PROVIDER,
      winningQuote: "2400000",
    });
    expect(page.nextCursor).toBeNull();
  });

  it("returns lifecycle detail conforming to the shared DTO", async () => {
    const detail = await repository.getRfqDetail("1");

    expect(detail?.summary.rfqId).toBe("1");
    expect(detail?.sellerCiphertext).toBe("0x1234");
    expect(detail?.providers).toEqual([
      {
        position: 0,
        provider: PROVIDER,
        quoteCiphertext: "0xabcd",
        submittedAtBlock: "123459",
        transactionHash: hash(80_001),
      },
    ]);
    expect(detail?.activity.map(({ kind }) => kind)).toEqual([
      "RFQ_CREATED",
      "QUOTE_SUBMITTED",
      "RESOLUTION_REQUESTED",
      "RFQ_FINALIZED",
      "CLAIMED",
    ]);
  });

  it("returns ciphertext only through the explicit proof read", async () => {
    const proof = await repository.getRfqProof("1");
    const market = await repository.listRfqs({ limit: 20 });

    expect(proof).toMatchObject({
      schemaVersion: 1,
      rfqId: "1",
      sellerCiphertext: "0x1234",
      providerCiphertexts: [{ provider: PROVIDER, ciphertext: "0xabcd" }],
      outcome: {
        resultType: "TRADE",
        winningProvider: PROVIDER,
        winningQuote: "2400000",
      },
    });
    expect(JSON.stringify(market)).not.toContain("0x1234");
    expect(JSON.stringify(market)).not.toContain("0xabcd");
  });

  it("derives seller and provider portfolio claim state from canonical events", async () => {
    const seller = await repository.getPortfolio(SELLER);
    const provider = await repository.getPortfolio(PROVIDER);

    expect(seller.claims).toEqual([
      expect.objectContaining({
        rfqId: "1",
        fxrpAmount: "1000000",
        usdt0Amount: "2400000",
        claimed: true,
      }),
    ]);
    expect(provider.claims).toEqual([
      expect.objectContaining({
        rfqId: "1",
        fxrpAmount: "1000000",
        usdt0Amount: "100000",
        claimed: false,
      }),
    ]);
  });

  it("computes statistics exclusively from indexed event state", async () => {
    const stats = await repository.getStats();

    expect(stats).toMatchObject({
      schemaVersion: 1,
      rfqCount: "1",
      openRfqCount: "0",
      settledRfqCount: "1",
      providerParticipationCount: "1",
      totalLotAmount: "1000000",
      settledQuoteAmount: "2400000",
      latestIndexedBlock: "123464",
    });
    expect(stats.updatedAt).toMatch(/Z$/);
  });
});
