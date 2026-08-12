import { Pool, type PoolClient, type PoolConfig } from "pg";

export type IndexerPool = Pool;
export type IndexerPoolClient = PoolClient;

export function createIndexerPool(config: PoolConfig): IndexerPool {
  return new Pool(config);
}
