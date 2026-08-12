import { readFile } from "node:fs/promises";

import { getAddress } from "viem";

import type { ChainBlock, RawChainLog } from "../db/store.js";
import type { ChainSource } from "./run.js";

type Hex = `0x${string}`;

export interface RpcReader {
  getBlockNumber(): Promise<bigint>;
  getBlock(input: { blockNumber: bigint }): Promise<{
    number: bigint | null;
    hash: Hex | null;
    parentHash: Hex;
    timestamp: bigint;
  }>;
  getLogs(input: {
    address: string;
    fromBlock: bigint;
    toBlock: bigint;
  }): Promise<
    readonly {
      address: string;
      blockNumber: bigint | null;
      transactionHash: Hex | null;
      logIndex: number | null;
      topics: readonly Hex[];
      data: Hex;
    }[]
  >;
}

interface ViemChainSourceOptions {
  chainId: number;
  contractAddress: string;
  deploymentBlock: bigint;
}

function validateRange(from: bigint, to: bigint): void {
  if (from < 0n || to < from || to - from + 1n > 1_000n) {
    throw new Error("RPC_RANGE_INVALID");
  }
}

export class ViemChainSource implements ChainSource {
  readonly chainId: number;
  readonly contractAddress: string;
  readonly deploymentBlock: bigint;

  constructor(
    private readonly reader: RpcReader,
    options: ViemChainSourceOptions,
  ) {
    this.chainId = options.chainId;
    this.contractAddress = getAddress(options.contractAddress);
    this.deploymentBlock = options.deploymentBlock;
  }

  getHead(): Promise<bigint> {
    return this.reader.getBlockNumber();
  }

  async getBlocks(from: bigint, to: bigint): Promise<ChainBlock[]> {
    validateRange(from, to);
    const requests: Array<Promise<ChainBlock>> = [];
    for (let number = from; number <= to; number += 1n) {
      requests.push(
        this.reader.getBlock({ blockNumber: number }).then((block) => {
          if (
            block.number !== number ||
            !block.hash ||
            block.timestamp > BigInt(Number.MAX_SAFE_INTEGER)
          ) {
            throw new Error("RPC_BLOCK_INVALID");
          }
          return {
            chainId: this.chainId,
            blockNumber: number.toString(),
            blockHash: block.hash.toLowerCase(),
            parentHash: block.parentHash.toLowerCase(),
            timestamp: new Date(Number(block.timestamp) * 1_000),
          };
        }),
      );
    }
    return Promise.all(requests);
  }

  async getLogs(from: bigint, to: bigint): Promise<RawChainLog[]> {
    validateRange(from, to);
    const logs = await this.reader.getLogs({
      address: this.contractAddress,
      fromBlock: from,
      toBlock: to,
    });
    return logs.map((log) => {
      if (
        log.blockNumber === null ||
        !log.transactionHash ||
        log.logIndex === null
      ) {
        throw new Error("RPC_LOG_INVALID");
      }
      return {
        schemaVersion: 1,
        chainId: this.chainId,
        address: getAddress(log.address),
        blockNumber: log.blockNumber.toString(),
        transactionHash: log.transactionHash.toLowerCase(),
        logIndex: log.logIndex,
        topics: log.topics.map((topic) => topic.toLowerCase()),
        data: log.data.toLowerCase(),
      };
    });
  }
}

interface EventFixture {
  logs: Array<
    RawChainLog & {
      expected: { eventName: string; args?: { rfqId?: string } };
    }
  >;
}

class FixtureChainSource implements ChainSource {
  readonly chainId = 114;
  readonly deploymentBlock: bigint;
  readonly contractAddress: string;

  constructor(
    private readonly blocks: readonly ChainBlock[],
    private readonly logs: readonly RawChainLog[],
  ) {
    const first = blocks[0];
    const firstLog = logs[0];
    if (!first || !firstLog) throw new Error("FIXTURE_CHAIN_INVALID");
    this.deploymentBlock = BigInt(first.blockNumber);
    this.contractAddress = getAddress(firstLog.address);
  }

  async getHead(): Promise<bigint> {
    return BigInt(this.blocks.at(-1)!.blockNumber);
  }

  async getBlocks(from: bigint, to: bigint): Promise<ChainBlock[]> {
    validateRange(from, to);
    const selected = this.blocks.filter((block) => {
      const number = BigInt(block.blockNumber);
      return number >= from && number <= to;
    });
    if (selected.length !== Number(to - from + 1n)) {
      throw new Error("FIXTURE_BLOCK_RANGE_INCOMPLETE");
    }
    return selected.map((block) => ({ ...block }));
  }

  async getLogs(from: bigint, to: bigint): Promise<RawChainLog[]> {
    validateRange(from, to);
    return this.logs
      .filter((log) => {
        const number = BigInt(log.blockNumber);
        return number >= from && number <= to;
      })
      .map((log) => ({ ...log, topics: [...log.topics] }));
  }
}

function fixtureHash(value: bigint): `0x${string}` {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

export async function loadFixtureChainSource(
  path: string,
): Promise<ChainSource> {
  const fixture = JSON.parse(await readFile(path, "utf8")) as EventFixture;
  const lifecycle = new Set([
    "RfqCreated",
    "QuoteSubmitted",
    "ResolutionRequested",
    "RfqFinalized",
    "Claimed",
  ]);
  const logs = fixture.logs
    .filter(
      ({ expected }) =>
        lifecycle.has(expected.eventName) && expected.args?.rfqId === "1",
    )
    .map(({ expected, ...log }, index) => {
      void expected;
      return {
        ...log,
        transactionHash: fixtureHash(100_000n + BigInt(index)),
      };
    });
  if (logs.length === 0) throw new Error("FIXTURE_CHAIN_INVALID");
  const first = BigInt(logs[0]!.blockNumber);
  const last = BigInt(logs.at(-1)!.blockNumber);
  const blocks: ChainBlock[] = [];
  for (let number = first; number <= last; number += 1n) {
    const offset = number - first;
    blocks.push({
      chainId: 114,
      blockNumber: number.toString(),
      blockHash: fixtureHash(200_000n + offset),
      parentHash: fixtureHash(199_999n + offset),
      timestamp: new Date(1_700_000_000_000 + Number(offset) * 1_000),
    });
  }
  return new FixtureChainSource(blocks, logs);
}
