import type { Pool, PoolClient } from "pg";

import { decodeHushFlowEvent } from "@hushflow/protocol/events";

import { toProjectorEvent } from "../domain/events.js";
import {
  applyProjectorEvent,
  createProjection,
  type ProjectionState,
} from "../domain/projector.js";

export interface ChainBlock {
  chainId: number;
  blockNumber: string;
  blockHash: string;
  parentHash: string;
  timestamp: Date;
}

export interface RawChainLog {
  schemaVersion: number;
  chainId: number;
  address: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: number;
  topics: string[];
  data: string;
}

export interface IngestionBatch {
  chainId: number;
  deploymentBlock: string;
  finalityWindow: number;
  contractAddress: string;
  latestObservedBlock: string;
  blocks: readonly ChainBlock[];
  logs: readonly RawChainLog[];
}

export class IndexerStoreError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "IndexerStoreError";
    this.code = code;
  }
}

async function clearDerived(client: PoolClient, chainId: number) {
  for (const table of [
    "claims",
    "rfq_outcomes",
    "fcc_actions",
    "rfq_providers",
    "rfqs",
    "transactions",
  ]) {
    await client.query(`DELETE FROM ${table} WHERE chain_id = $1`, [chainId]);
  }
}

async function loadProjection(
  client: PoolClient,
  chainId: number,
): Promise<ProjectionState> {
  const result = await client.query(
    `SELECT schema_version, chain_id, contract_address, block_number,
            transaction_hash, log_index, event_name, event_args
       FROM chain_logs
      WHERE chain_id = $1
      ORDER BY block_number, log_index`,
    [chainId],
  );
  const state = createProjection();
  for (const row of result.rows) {
    const event = toProjectorEvent({
      schemaVersion: row.schema_version,
      chainId: row.chain_id,
      contractAddress: row.contract_address,
      blockNumber: row.block_number,
      transactionHash: row.transaction_hash,
      logIndex: row.log_index,
      eventName: row.event_name,
      args: row.event_args,
    });
    if (event) applyProjectorEvent(state, event);
  }
  return state;
}

async function persistProjection(
  client: PoolClient,
  chainId: number,
  state: ProjectionState,
): Promise<void> {
  await clearDerived(client, chainId);
  await client.query(
    `INSERT INTO transactions (chain_id, transaction_hash, block_number, block_timestamp)
     SELECT DISTINCT l.chain_id, l.transaction_hash, l.block_number, b.block_timestamp
       FROM chain_logs l
       JOIN chain_blocks b USING (chain_id, block_number)
      WHERE l.chain_id = $1`,
    [chainId],
  );

  for (const row of state.rfqs.values()) {
    await client.query(
      `INSERT INTO rfqs (
         chain_id, rfq_id, seller, lot_amount, quote_cap, quote_deadline,
         resolution_deadline, seller_ciphertext, status, provider_count,
         action_id, source_transaction_hash, source_log_index
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        chainId,
        row.rfqId,
        row.seller,
        row.lotAmount,
        row.quoteCap,
        row.quoteDeadline,
        row.resolutionDeadline,
        row.sellerCiphertext,
        row.status,
        row.providerCount,
        row.actionId,
        row.source.transactionHash,
        row.source.logIndex,
      ],
    );
  }

  for (const row of state.providers.values()) {
    await client.query(
      `INSERT INTO rfq_providers (
         chain_id, rfq_id, provider, position, quote_ciphertext,
         submitted_at_block, source_transaction_hash, source_log_index
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        chainId,
        row.rfqId,
        row.provider,
        row.position,
        row.quoteCiphertext,
        row.submittedAtBlock,
        row.source.transactionHash,
        row.source.logIndex,
      ],
    );
  }

  for (const row of state.actions.values()) {
    await client.query(
      `INSERT INTO fcc_actions (
         chain_id, action_id, rfq_id, status, requested_at_block,
         source_transaction_hash, source_log_index
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        chainId,
        row.actionId,
        row.rfqId,
        row.status,
        row.requestedAtBlock,
        row.source.transactionHash,
        row.source.logIndex,
      ],
    );
  }

  for (const row of state.outcomes.values()) {
    await client.query(
      `INSERT INTO rfq_outcomes (
         chain_id, rfq_id, result_type, winning_provider, winning_quote,
         result_nonce, source_transaction_hash, source_log_index
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        chainId,
        row.rfqId,
        row.resultType,
        row.winningProvider,
        row.winningQuote,
        row.resultNonce,
        row.source.transactionHash,
        row.source.logIndex,
      ],
    );
  }

  for (const row of state.claims.values()) {
    await client.query(
      `INSERT INTO claims (
         chain_id, rfq_id, account, fxrp_amount, usdt0_amount, claimed,
         source_transaction_hash, source_log_index
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        chainId,
        row.rfqId,
        row.account,
        row.fxrpAmount,
        row.usdt0Amount,
        row.claimed,
        row.source.transactionHash,
        row.source.logIndex,
      ],
    );
  }
}

function sortBlocks(blocks: readonly ChainBlock[]): ChainBlock[] {
  return [...blocks].sort((left, right) =>
    BigInt(left.blockNumber) < BigInt(right.blockNumber) ? -1 : 1,
  );
}

export class IndexerStore {
  constructor(private readonly pool: Pool) {}

  async verifyCursor(chainId: number, observed: ChainBlock): Promise<void> {
    const result = await this.pool.query(
      `SELECT last_processed_block, last_processed_hash
         FROM chain_cursor
        WHERE chain_id = $1`,
      [chainId],
    );
    const cursor = result.rows[0];
    if (
      !cursor ||
      observed.chainId !== chainId ||
      String(cursor.last_processed_block) !== observed.blockNumber ||
      String(cursor.last_processed_hash) !== observed.blockHash.toLowerCase()
    ) {
      throw new IndexerStoreError("INDEXER_CURSOR_MISMATCH");
    }
  }

  async replay(chainId: number): Promise<void> {
    const client = await this.pool.connect();
    await client.query("BEGIN");
    try {
      await persistProjection(
        client,
        chainId,
        await loadProjection(client, chainId),
      );
      await client.query("COMMIT");
    } catch {
      await client.query("ROLLBACK");
      throw new IndexerStoreError("INDEXER_REPLAY_FAILED");
    } finally {
      client.release();
    }
  }

  async reconcileWindow(
    chainId: number,
    canonicalWindow: readonly ChainBlock[],
  ): Promise<
    | { reorg: false; ancestorBlock: null }
    | { reorg: true; ancestorBlock: string }
  > {
    const blocks = sortBlocks(canonicalWindow);
    if (
      blocks.length === 0 ||
      blocks.some((block) => block.chainId !== chainId)
    ) {
      throw new IndexerStoreError("INDEXER_REORG_WINDOW_INVALID");
    }

    const client = await this.pool.connect();
    let replayRequired = false;
    let outcome:
      | { reorg: false; ancestorBlock: null }
      | { reorg: true; ancestorBlock: string } = {
      reorg: false,
      ancestorBlock: null,
    };
    await client.query("BEGIN");
    try {
      const storedResult = await client.query(
        `SELECT block_number, block_hash
           FROM chain_blocks
          WHERE chain_id = $1
          ORDER BY block_number DESC`,
        [chainId],
      );
      const stored = new Map(
        storedResult.rows.map((row) => [
          String(row.block_number),
          String(row.block_hash),
        ]),
      );
      const overlapping = blocks.filter((block) =>
        stored.has(block.blockNumber),
      );
      const mismatched = overlapping.some(
        (block) =>
          stored.get(block.blockNumber) !== block.blockHash.toLowerCase(),
      );

      if (!mismatched) {
        await client.query("COMMIT");
        return outcome;
      }

      const ancestor = [...overlapping]
        .reverse()
        .find(
          (block) =>
            stored.get(block.blockNumber) === block.blockHash.toLowerCase(),
        );
      const observedBlock = blocks.at(-1)!.blockNumber;

      if (!ancestor) {
        const cursor = await client.query(
          `SELECT last_processed_block
             FROM chain_cursor
            WHERE chain_id = $1`,
          [chainId],
        );
        const indexedBlock = String(
          cursor.rows[0]?.last_processed_block ?? observedBlock,
        );
        const lag = BigInt(observedBlock) - BigInt(indexedBlock);
        await client.query(
          `UPDATE indexer_health SET
             status = 'degraded',
             latest_observed_block = $2,
             lag_blocks = $3,
             detail_code = 'REORG_REPLAY_REQUIRED',
             checked_at = NOW()
           WHERE chain_id = $1`,
          [chainId, observedBlock, lag > 0n ? lag.toString() : "0"],
        );
        await client.query("COMMIT");
        replayRequired = true;
      } else {
        await client.query(
          `DELETE FROM chain_blocks
            WHERE chain_id = $1 AND block_number > $2`,
          [chainId, ancestor.blockNumber],
        );
        await persistProjection(
          client,
          chainId,
          await loadProjection(client, chainId),
        );
        await client.query(
          `UPDATE chain_cursor SET
             last_processed_block = $2,
             last_processed_hash = $3,
             updated_at = NOW()
           WHERE chain_id = $1`,
          [chainId, ancestor.blockNumber, ancestor.blockHash.toLowerCase()],
        );
        const lag = BigInt(observedBlock) - BigInt(ancestor.blockNumber);
        await client.query(
          `UPDATE indexer_health SET
             status = 'degraded',
             latest_indexed_block = $2,
             latest_observed_block = $3,
             lag_blocks = $4,
             detail_code = 'INDEXER_LAGGING',
             checked_at = NOW()
           WHERE chain_id = $1`,
          [
            chainId,
            ancestor.blockNumber,
            observedBlock,
            lag > 0n ? lag.toString() : "0",
          ],
        );
        await client.query("COMMIT");
        outcome = { reorg: true, ancestorBlock: ancestor.blockNumber };
      }
    } catch (error) {
      if (!replayRequired) await client.query("ROLLBACK");
      if (error instanceof IndexerStoreError) throw error;
      throw new IndexerStoreError("INDEXER_REORG_FAILED");
    } finally {
      client.release();
    }

    if (replayRequired) {
      throw new IndexerStoreError("INDEXER_REORG_REPLAY_REQUIRED");
    }
    return outcome;
  }

  async ingestBatch(batch: IngestionBatch): Promise<void> {
    const client = await this.pool.connect();
    await client.query("BEGIN");
    try {
      const blocks = sortBlocks(batch.blocks);
      if (blocks.length === 0) throw new Error("EMPTY_BATCH");
      const blockNumbers = new Set(
        blocks.map(({ blockNumber }) => blockNumber),
      );

      for (const block of blocks) {
        if (block.chainId !== batch.chainId) throw new Error("CHAIN_MISMATCH");
        const result = await client.query(
          `INSERT INTO chain_blocks (
             chain_id, block_number, block_hash, parent_hash, block_timestamp
           ) VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (chain_id, block_number) DO UPDATE
             SET block_hash = chain_blocks.block_hash
           WHERE chain_blocks.block_hash = EXCLUDED.block_hash
             AND chain_blocks.parent_hash = EXCLUDED.parent_hash
           RETURNING block_number`,
          [
            block.chainId,
            block.blockNumber,
            block.blockHash.toLowerCase(),
            block.parentHash.toLowerCase(),
            block.timestamp,
          ],
        );
        if (result.rowCount !== 1) throw new Error("BLOCK_CONFLICT");
      }

      for (const log of batch.logs) {
        if (
          log.chainId !== batch.chainId ||
          !blockNumbers.has(log.blockNumber)
        ) {
          throw new Error("LOG_BLOCK_MISMATCH");
        }
        const decoded = decodeHushFlowEvent(log, {
          chainId: batch.chainId,
          contractAddress: batch.contractAddress,
        });
        const result = await client.query(
          `INSERT INTO chain_logs (
             chain_id, transaction_hash, log_index, block_number,
             contract_address, schema_version, topics, data, event_name, event_args
           ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10::jsonb)
           ON CONFLICT (chain_id, transaction_hash, log_index) DO UPDATE
             SET transaction_hash = chain_logs.transaction_hash
           WHERE chain_logs.block_number = EXCLUDED.block_number
             AND chain_logs.contract_address = EXCLUDED.contract_address
             AND chain_logs.topics = EXCLUDED.topics
             AND chain_logs.data = EXCLUDED.data
           RETURNING log_index`,
          [
            decoded.chainId,
            decoded.transactionHash,
            decoded.logIndex,
            decoded.blockNumber,
            decoded.contractAddress.toLowerCase(),
            decoded.schemaVersion,
            JSON.stringify(log.topics.map((topic) => topic.toLowerCase())),
            log.data.toLowerCase(),
            decoded.eventName,
            JSON.stringify(decoded.args),
          ],
        );
        if (result.rowCount !== 1) throw new Error("LOG_CONFLICT");
      }

      await persistProjection(
        client,
        batch.chainId,
        await loadProjection(client, batch.chainId),
      );

      const lastBlock = blocks.at(-1)!;
      await client.query(
        `INSERT INTO chain_cursor (
           chain_id, deployment_block, finality_window,
           last_processed_block, last_processed_hash, updated_at
         ) VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (chain_id) DO UPDATE SET
           deployment_block = EXCLUDED.deployment_block,
           finality_window = EXCLUDED.finality_window,
           last_processed_block = EXCLUDED.last_processed_block,
           last_processed_hash = EXCLUDED.last_processed_hash,
           updated_at = NOW()`,
        [
          batch.chainId,
          batch.deploymentBlock,
          batch.finalityWindow,
          lastBlock.blockNumber,
          lastBlock.blockHash.toLowerCase(),
        ],
      );
      const lag =
        BigInt(batch.latestObservedBlock) - BigInt(lastBlock.blockNumber);
      await client.query(
        `INSERT INTO indexer_health (
           chain_id, status, latest_indexed_block, latest_observed_block,
           lag_blocks, detail_code, last_success_at, checked_at
         ) VALUES ($1,'healthy',$2,$3,$4,NULL,NOW(),NOW())
         ON CONFLICT (chain_id) DO UPDATE SET
           status = EXCLUDED.status,
           latest_indexed_block = EXCLUDED.latest_indexed_block,
           latest_observed_block = EXCLUDED.latest_observed_block,
           lag_blocks = EXCLUDED.lag_blocks,
           detail_code = NULL,
           last_success_at = NOW(),
           checked_at = NOW()`,
        [
          batch.chainId,
          lastBlock.blockNumber,
          batch.latestObservedBlock,
          lag > 0n ? lag.toString() : "0",
        ],
      );
      await client.query("COMMIT");
    } catch {
      await client.query("ROLLBACK");
      throw new IndexerStoreError("INDEXER_BATCH_REJECTED");
    } finally {
      client.release();
    }
  }
}
