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
  reconcileWindow(
    chainId: number,
    canonicalWindow: readonly ChainBlock[],
  ): Promise<
    | { reorg: false; ancestorBlock: null }
    | { reorg: true; ancestorBlock: string }
  >;
  ingestBatch(batch: IngestionBatch): Promise<void>;
  markHealth(input: {
    chainId: number;
    status: "healthy" | "degraded" | "unavailable";
    detailCode?:
      "RPC_UNAVAILABLE" | "DATABASE_UNAVAILABLE" | "REORG_REPLAY_REQUIRED";
    latestObservedBlock?: string;
    dataMode: "fixture" | "live";
    sourceIdentity: string;
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

async function rpcFailure(
  config: IndexerConfig,
  store: WorkerStore,
  chainId: number,
): Promise<never> {
  await store.markHealth({
    chainId,
    status: "degraded",
    detailCode: "RPC_UNAVAILABLE",
    dataMode: config.mode,
    sourceIdentity: config.sourceIdentity,
  });
  throw new WorkerError("INDEXER_RPC_UNAVAILABLE");
}

async function readBlocksChunked(
  source: ChainSource,
  from: bigint,
  to: bigint,
): Promise<ChainBlock[]> {
  const blocks: ChainBlock[] = [];
  for (let start = from; start <= to; start += 1_000n) {
    const end = start + 999n < to ? start + 999n : to;
    blocks.push(...(await source.getBlocks(start, end)));
  }
  return blocks;
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
    return rpcFailure(config, store, source.chainId);
  }

  let cursor = await store.readCursor(source.chainId);
  if (cursor) {
    let canonicalWindow: ChainBlock[];
    try {
      const cursorNumber = BigInt(cursor.blockNumber);
      const candidate = cursorNumber - BigInt(config.finalityWindow) + 1n;
      const windowStart =
        candidate > source.deploymentBlock ? candidate : source.deploymentBlock;
      canonicalWindow = await readBlocksChunked(
        source,
        windowStart,
        cursorNumber,
      );
    } catch {
      return rpcFailure(config, store, source.chainId);
    }
    if (canonicalWindow.length === 0) {
      throw new WorkerError("INDEXER_CURSOR_BLOCK_MISSING");
    }
    await store.reconcileWindow(source.chainId, canonicalWindow);
    cursor = await store.readCursor(source.chainId);
  }

  const from = cursor
    ? BigInt(cursor.blockNumber) + 1n
    : source.deploymentBlock;
  if (from > head) {
    await store.markHealth({
      chainId: source.chainId,
      status: "healthy",
      latestObservedBlock: head.toString(),
      dataMode: config.mode,
      sourceIdentity: config.sourceIdentity,
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
    return rpcFailure(config, store, source.chainId);
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
    dataMode: config.mode,
    sourceIdentity: config.sourceIdentity,
  });
  return {
    fromBlock: from.toString(),
    toBlock: to.toString(),
    ingested: true,
  };
}
