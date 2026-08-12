import { describe, expect, it, vi } from "vitest";

import {
  ViemChainSource,
  type RpcReader,
} from "../../services/indexer/src/worker/source.js";

const CONTRACT = "0x9999999999999999999999999999999999999999";
const BLOCK_HASH = `0x${"a".repeat(64)}` as const;
const PARENT_HASH = `0x${"b".repeat(64)}` as const;
const TRANSACTION_HASH = `0x${"c".repeat(64)}` as const;
const TOPIC = `0x${"d".repeat(64)}` as const;

function reader(): RpcReader {
  return {
    getBlockNumber: vi.fn(async () => 12n),
    getBlock: vi.fn(async ({ blockNumber }) => ({
      number: blockNumber,
      hash: BLOCK_HASH,
      parentHash: PARENT_HASH,
      timestamp: 1_700_000_000n,
    })),
    getLogs: vi.fn(async () => [
      {
        address: CONTRACT,
        blockNumber: 10n,
        transactionHash: TRANSACTION_HASH,
        logIndex: 3,
        topics: [TOPIC],
        data: "0x" as const,
      },
    ]),
  };
}

describe("ViemChainSource", () => {
  it("normalizes RPC head, blocks, and logs without numeric precision loss", async () => {
    const rpc = reader();
    const source = new ViemChainSource(rpc, {
      chainId: 114,
      contractAddress: CONTRACT,
      deploymentBlock: 10n,
    });

    expect(await source.getHead()).toBe(12n);
    expect(await source.getBlocks(10n, 10n)).toEqual([
      {
        chainId: 114,
        blockNumber: "10",
        blockHash: BLOCK_HASH,
        parentHash: PARENT_HASH,
        timestamp: new Date(1_700_000_000_000),
      },
    ]);
    expect(await source.getLogs(10n, 12n)).toEqual([
      {
        schemaVersion: 1,
        chainId: 114,
        address: CONTRACT,
        blockNumber: "10",
        transactionHash: TRANSACTION_HASH,
        logIndex: 3,
        topics: [TOPIC],
        data: "0x",
      },
    ]);
  });

  it("rejects incomplete blocks and logs before store ingestion", async () => {
    const rpc = reader();
    rpc.getBlock = vi.fn(async () => ({
      number: null,
      hash: null,
      parentHash: PARENT_HASH,
      timestamp: 0n,
    }));
    const source = new ViemChainSource(rpc, {
      chainId: 114,
      contractAddress: CONTRACT,
      deploymentBlock: 10n,
    });

    await expect(source.getBlocks(10n, 10n)).rejects.toThrowError(
      "RPC_BLOCK_INVALID",
    );
  });

  it("rejects inverted and excessively large ranges", async () => {
    const source = new ViemChainSource(reader(), {
      chainId: 114,
      contractAddress: CONTRACT,
      deploymentBlock: 10n,
    });

    await expect(source.getBlocks(11n, 10n)).rejects.toThrowError(
      "RPC_RANGE_INVALID",
    );
    await expect(source.getLogs(1n, 1002n)).rejects.toThrowError(
      "RPC_RANGE_INVALID",
    );
  });
});
