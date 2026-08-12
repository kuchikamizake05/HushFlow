import { describe, expect, it, vi } from "vitest";

import type { IndexerConfig } from "../../services/indexer/src/config.js";
import type {
  ChainBlock,
  IngestionBatch,
  RawChainLog,
} from "../../services/indexer/src/db/store.js";
import {
  WorkerError,
  runWorkerCycle,
  type ChainSource,
  type WorkerStore,
} from "../../services/indexer/src/worker/run.js";

const CONTRACT = "0x9999999999999999999999999999999999999999";
const config: IndexerConfig = {
  mode: "fixture",
  databaseUrl: "postgresql://local-test",
  port: 8787,
  batchSize: 2,
  finalityWindow: 64,
  pollIntervalMs: 3_000,
};

function hash(value: number): `0x${string}` {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function block(value: number): ChainBlock {
  return {
    chainId: 114,
    blockNumber: String(value),
    blockHash: hash(value),
    parentHash: hash(value - 1),
    timestamp: new Date(value * 1_000),
  };
}

class FakeSource implements ChainSource {
  readonly chainId = 114;
  readonly contractAddress = CONTRACT;
  readonly deploymentBlock = 10n;
  readonly getHead = vi.fn(async () => 13n);
  readonly getBlocks = vi.fn(async (from: bigint, to: bigint) => {
    const values: ChainBlock[] = [];
    for (let value = from; value <= to; value += 1n) {
      values.push(block(Number(value)));
    }
    return values;
  });
  readonly getLogs = vi.fn(async (): Promise<RawChainLog[]> => []);
}

class FakeStore implements WorkerStore {
  cursor: { blockNumber: string; blockHash: string } | null = null;
  readonly batches: IngestionBatch[] = [];
  readonly health: Array<{
    chainId: number;
    status: string;
    detailCode?: string;
  }> = [];
  readonly verifyCursor = vi.fn(async () => undefined);

  async readCursor() {
    return this.cursor;
  }

  async ingestBatch(batch: IngestionBatch) {
    this.batches.push(batch);
  }

  async markHealth(input: {
    chainId: number;
    status: string;
    detailCode?: string;
  }) {
    this.health.push(input);
  }
}

describe("single indexer worker cycle", () => {
  it("ingests one bounded ordered range from deployment block", async () => {
    const source = new FakeSource();
    const store = new FakeStore();

    const result = await runWorkerCycle(config, store, source);

    expect(result).toEqual({ fromBlock: "10", toBlock: "11", ingested: true });
    expect(source.getBlocks).toHaveBeenCalledWith(10n, 11n);
    expect(source.getLogs).toHaveBeenCalledWith(10n, 11n);
    expect(store.batches[0]).toMatchObject({
      chainId: 114,
      deploymentBlock: "10",
      latestObservedBlock: "13",
      finalityWindow: 64,
    });
  });

  it("verifies and resumes immediately after the persisted cursor", async () => {
    const source = new FakeSource();
    const store = new FakeStore();
    store.cursor = { blockNumber: "11", blockHash: hash(11) };

    const result = await runWorkerCycle(config, store, source);

    expect(store.verifyCursor).toHaveBeenCalledWith(114, block(11));
    expect(source.getBlocks).toHaveBeenLastCalledWith(12n, 13n);
    expect(result).toEqual({ fromBlock: "12", toBlock: "13", ingested: true });
  });

  it("does not ingest when already at chain head", async () => {
    const source = new FakeSource();
    const store = new FakeStore();
    store.cursor = { blockNumber: "13", blockHash: hash(13) };

    const result = await runWorkerCycle(config, store, source);

    expect(result).toEqual({ fromBlock: "14", toBlock: "13", ingested: false });
    expect(store.batches).toEqual([]);
    expect(store.health.at(-1)).toMatchObject({
      chainId: 114,
      status: "healthy",
    });
  });

  it("records a redacted RPC failure without moving ingestion", async () => {
    const source = new FakeSource();
    const store = new FakeStore();
    source.getHead.mockRejectedValueOnce(
      new Error("https://secret-rpc.invalid?token=PRIVATE_MARKER_42"),
    );

    await expect(runWorkerCycle(config, store, source)).rejects.toThrow(
      WorkerError,
    );
    expect(store.batches).toEqual([]);
    expect(store.health).toEqual([
      {
        chainId: 114,
        status: "degraded",
        detailCode: "RPC_UNAVAILABLE",
      },
    ]);
    await expect(runWorkerCycle(config, store, source)).resolves.toBeDefined();
  });
});
