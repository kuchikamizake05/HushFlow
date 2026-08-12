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
