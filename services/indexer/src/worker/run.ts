import type { IndexerConfig } from "../config.js";
import type { ChainBlock, IngestionBatch, RawChainLog } from "../db/store.js";

export interface ChainSource {
  readonly chainId: number;
  readonly contractAddress: string;
  readonly deploymentBlock: bigint;
  getHead(): Promise<bigint>;
  getBlocks(from: bigint, to: bigint): Promise<ChainBlock[]>;
  getLogs(from: bigint, to: bigint): Promise<RawChainLog[]>;
}

export interface WorkerStore {
  readCursor(
    chainId: number,
  ): Promise<{ blockNumber: string; blockHash: string } | null>;
  verifyCursor(chainId: number, observed: ChainBlock): Promise<void>;
  ingestBatch(batch: IngestionBatch): Promise<void>;
  markHealth(input: {
    chainId: number;
    status: "healthy" | "degraded" | "unavailable";
    detailCode?: "RPC_UNAVAILABLE" | "DATABASE_UNAVAILABLE";
    latestObservedBlock?: string;
  }): Promise<void>;
}

export class WorkerError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "WorkerError";
    this.code = code;
  }
}

async function rpcFailure(store: WorkerStore, chainId: number): Promise<never> {
  await store.markHealth({
    chainId,
    status: "degraded",
    detailCode: "RPC_UNAVAILABLE",
  });
  throw new WorkerError("INDEXER_RPC_UNAVAILABLE");
}

export async function runWorkerCycle(
  config: IndexerConfig,
  store: WorkerStore,
  source: ChainSource,
): Promise<{ fromBlock: string; toBlock: string; ingested: boolean }> {
  let head: bigint;
  try {
    head = await source.getHead();
  } catch {
    return rpcFailure(store, source.chainId);
  }

  const cursor = await store.readCursor(source.chainId);
  if (cursor) {
    let cursorBlocks: ChainBlock[];
    try {
      const cursorNumber = BigInt(cursor.blockNumber);
      cursorBlocks = await source.getBlocks(cursorNumber, cursorNumber);
    } catch {
      return rpcFailure(store, source.chainId);
    }
    const observed = cursorBlocks[0];
    if (!observed) throw new WorkerError("INDEXER_CURSOR_BLOCK_MISSING");
    await store.verifyCursor(source.chainId, observed);
  }

  const from = cursor
    ? BigInt(cursor.blockNumber) + 1n
    : source.deploymentBlock;
  if (from > head) {
    await store.markHealth({
      chainId: source.chainId,
      status: "healthy",
      latestObservedBlock: head.toString(),
    });
    return {
      fromBlock: from.toString(),
      toBlock: head.toString(),
      ingested: false,
    };
  }

  const maximum = from + BigInt(config.batchSize) - 1n;
  const to = maximum < head ? maximum : head;
  let blocks: ChainBlock[];
  let logs: RawChainLog[];
  try {
    [blocks, logs] = await Promise.all([
      source.getBlocks(from, to),
      source.getLogs(from, to),
    ]);
  } catch {
    return rpcFailure(store, source.chainId);
  }
  if (blocks.length !== Number(to - from + 1n)) {
    throw new WorkerError("INDEXER_BLOCK_RANGE_INCOMPLETE");
  }

  await store.ingestBatch({
    chainId: source.chainId,
    deploymentBlock: source.deploymentBlock.toString(),
    finalityWindow: config.finalityWindow,
    contractAddress: source.contractAddress,
    latestObservedBlock: head.toString(),
    blocks,
    logs,
  });
  return {
    fromBlock: from.toString(),
    toBlock: to.toString(),
    ingested: true,
  };
}
