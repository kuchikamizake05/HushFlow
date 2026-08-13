import type { Pool } from "pg";
import { getAddress } from "viem";
import type { z } from "zod";

import type { RfqStatus } from "@hushflow/protocol/constants";
import {
  activityDtoSchema,
  createCursorPageSchema,
  indexerHealthDtoSchema,
  portfolioDtoSchema,
  protocolStatsDtoSchema,
  rfqDetailDtoSchema,
  rfqProofDtoSchema,
  rfqSummaryDtoSchema,
} from "@hushflow/protocol/read-api";
import type { claimableDtoSchema } from "@hushflow/protocol/read-api";

import { decodeRfqCursor, encodeRfqCursor } from "./cursor.js";

const pageSchema = createCursorPageSchema(rfqSummaryDtoSchema);

export interface ReadRepositoryOptions {
  chainId: number;
  fxrpToken?: string;
  usdt0Token?: string;
}

export interface ListRfqInput {
  limit: number;
  cursor?: string;
  status?: RfqStatus;
  seller?: string;
  provider?: string;
}

export interface PortfolioPageInput {
  limit: number;
  cursor?: string;
}

export class ReadRepositoryError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ReadRepositoryError";
    this.code = code;
  }
}

function summaryFromRow(row: Record<string, unknown>) {
  return rfqSummaryDtoSchema.parse({
    schemaVersion: 1,
    rfqId: String(row.rfq_id),
    seller: row.seller,
    lotAmount: String(row.lot_amount),
    quoteCap: String(row.quote_cap),
    quoteDeadline: String(row.quote_deadline),
    resolutionDeadline: String(row.resolution_deadline),
    status: row.status,
    providerCount: Number(row.provider_count),
    winningProvider: row.winning_provider,
    winningQuote:
      row.winning_quote === null || row.winning_quote === undefined
        ? null
        : String(row.winning_quote),
    actionId: row.action_id,
  });
}

const activityKind = {
  RfqCreated: "RFQ_CREATED",
  QuoteSubmitted: "QUOTE_SUBMITTED",
  RfqCancelled: "RFQ_CANCELLED",
  ResolutionRequested: "RESOLUTION_REQUESTED",
  RfqFinalized: "RFQ_FINALIZED",
  RfqTimedOut: "RFQ_TIMED_OUT",
  Claimed: "CLAIMED",
} as const;

function actorFromArgs(args: Record<string, unknown>): unknown {
  return args.seller ?? args.provider ?? args.account;
}

export class ReadRepository {
  readonly options: {
    chainId: number;
    fxrpToken: string | null;
    usdt0Token: string | null;
  };

  constructor(
    private readonly pool: Pool,
    options: ReadRepositoryOptions,
  ) {
    this.options = {
      chainId: options.chainId,
      fxrpToken: options.fxrpToken ? getAddress(options.fxrpToken) : null,
      usdt0Token: options.usdt0Token ? getAddress(options.usdt0Token) : null,
    };
  }

  private async query(text: string, values?: unknown[]) {
    try {
      return await this.pool.query(text, values);
    } catch {
      throw new ReadRepositoryError("DATABASE_UNAVAILABLE");
    }
  }

  async listRfqs(input: ListRfqInput) {
    if (
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 100
    ) {
      throw new ReadRepositoryError("READ_LIMIT_INVALID");
    }
    const values: unknown[] = [this.options.chainId];
    const where = ["r.chain_id = $1"];
    const add = (sql: string, value: unknown) => {
      values.push(value);
      where.push(sql.replace("?", `$${values.length}`));
    };
    if (input.cursor) {
      add("r.rfq_id < ?", decodeRfqCursor(input.cursor).rfqId);
    }
    if (input.status) add("r.status = ?", input.status);
    if (input.seller)
      add("r.seller = ?", getAddress(input.seller).toLowerCase());
    if (input.provider) {
      add(
        "EXISTS (SELECT 1 FROM rfq_providers p WHERE p.chain_id = r.chain_id AND p.rfq_id = r.rfq_id AND p.provider = ?)",
        getAddress(input.provider).toLowerCase(),
      );
    }
    values.push(input.limit + 1);
    const result = await this.query(
      `SELECT r.*, o.winning_provider, o.winning_quote
         FROM rfqs r
         LEFT JOIN rfq_outcomes o USING (chain_id, rfq_id)
        WHERE ${where.join(" AND ")}
        ORDER BY r.rfq_id DESC
        LIMIT $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > input.limit;
    const rows = result.rows.slice(0, input.limit);
    const items = rows.map(summaryFromRow);
    const last = items.at(-1);
    return pageSchema.parse({
      schemaVersion: 1,
      items,
      nextCursor:
        hasMore && last ? encodeRfqCursor({ rfqId: last.rfqId }) : null,
    });
  }

  private async summary(rfqId: string) {
    const result = await this.query(
      `SELECT r.*, o.winning_provider, o.winning_quote
         FROM rfqs r
         LEFT JOIN rfq_outcomes o USING (chain_id, rfq_id)
        WHERE r.chain_id = $1 AND r.rfq_id = $2`,
      [this.options.chainId, rfqId],
    );
    return result.rows[0] ? summaryFromRow(result.rows[0]) : null;
  }

  async getRfqDetail(rfqId: string) {
    const summary = await this.summary(rfqId);
    if (!summary) return null;
    const rfq = await this.query(
      "SELECT seller_ciphertext FROM rfqs WHERE chain_id = $1 AND rfq_id = $2",
      [this.options.chainId, rfqId],
    );
    const providers = await this.query(
      `SELECT position, provider, quote_ciphertext, submitted_at_block,
              source_transaction_hash
         FROM rfq_providers
        WHERE chain_id = $1 AND rfq_id = $2
        ORDER BY position`,
      [this.options.chainId, rfqId],
    );
    const activity = await this.query(
      `SELECT l.event_name, l.event_args, l.transaction_hash, l.block_number,
              l.log_index, b.block_timestamp
         FROM chain_logs l
         JOIN chain_blocks b USING (chain_id, block_number)
        WHERE l.chain_id = $1 AND l.event_args ->> 'rfqId' = $2
        ORDER BY l.block_number, l.log_index`,
      [this.options.chainId, rfqId],
    );
    return rfqDetailDtoSchema.parse({
      schemaVersion: 1,
      summary,
      sellerCiphertext: rfq.rows[0]?.seller_ciphertext,
      providers: providers.rows.map((row) => ({
        position: Number(row.position),
        provider: row.provider,
        quoteCiphertext: row.quote_ciphertext,
        submittedAtBlock: String(row.submitted_at_block),
        transactionHash: row.source_transaction_hash,
      })),
      activity: activity.rows.map((row) => {
        const args = row.event_args as Record<string, unknown>;
        const actor = actorFromArgs(args);
        return activityDtoSchema.parse({
          schemaVersion: 1,
          rfqId,
          kind: activityKind[row.event_name as keyof typeof activityKind],
          transactionHash: row.transaction_hash,
          blockNumber: String(row.block_number),
          logIndex: Number(row.log_index),
          occurredAt: (row.block_timestamp as Date).toISOString(),
          ...(actor ? { actor } : {}),
        });
      }),
    });
  }

  async getRfqProof(rfqId: string) {
    const result = await this.query(
      `SELECT r.seller_ciphertext, r.action_id,
              o.result_type, o.winning_provider, o.winning_quote,
              o.result_nonce, o.source_transaction_hash
         FROM rfqs r
         LEFT JOIN rfq_outcomes o USING (chain_id, rfq_id)
        WHERE r.chain_id = $1 AND r.rfq_id = $2`,
      [this.options.chainId, rfqId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const providers = await this.query(
      `SELECT provider, quote_ciphertext
         FROM rfq_providers
        WHERE chain_id = $1 AND rfq_id = $2
        ORDER BY position`,
      [this.options.chainId, rfqId],
    );
    return rfqProofDtoSchema.parse({
      schemaVersion: 1,
      rfqId,
      sellerCiphertext: row.seller_ciphertext,
      providerCiphertexts: providers.rows.map((provider) => ({
        provider: provider.provider,
        ciphertext: provider.quote_ciphertext,
      })),
      actionId: row.action_id,
      outcome: row.result_type
        ? {
            resultType: row.result_type,
            winningProvider: row.winning_provider,
            winningQuote:
              row.winning_quote === null ? null : String(row.winning_quote),
            resultNonce: row.result_nonce,
            transactionHash: row.source_transaction_hash,
          }
        : null,
    });
  }

  async getPortfolio(
    accountInput: string,
    input: PortfolioPageInput = { limit: 100 },
  ) {
    if (!this.options.fxrpToken || !this.options.usdt0Token) {
      throw new ReadRepositoryError("DEPLOYMENT_NOT_LIVE");
    }
    const account = getAddress(accountInput);
    if (
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 100
    ) {
      throw new ReadRepositoryError("READ_LIMIT_INVALID");
    }
    const values: unknown[] = [this.options.chainId, account.toLowerCase()];
    const cursorClause = input.cursor
      ? `AND r.rfq_id < $${values.push(decodeRfqCursor(input.cursor).rfqId)}`
      : "";
    values.push(input.limit + 1);
    const result = await this.query(
      `SELECT r.*, o.winning_provider, o.winning_quote,
              c.fxrp_amount, c.usdt0_amount, c.claimed
         FROM rfqs r
         LEFT JOIN rfq_outcomes o USING (chain_id, rfq_id)
         LEFT JOIN claims c
           ON c.chain_id = r.chain_id
          AND c.rfq_id = r.rfq_id
          AND c.account = $2
        WHERE r.chain_id = $1
          AND (
            r.seller = $2 OR EXISTS (
              SELECT 1 FROM rfq_providers p
               WHERE p.chain_id = r.chain_id
                 AND p.rfq_id = r.rfq_id
                 AND p.provider = $2
            )
          )
          ${cursorClause}
        ORDER BY r.rfq_id DESC
        LIMIT $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > input.limit;
    const rows = result.rows.slice(0, input.limit);
    const rfqs = rows.map(summaryFromRow);
    const claims: Array<z.input<typeof claimableDtoSchema>> = [];

    for (const [index, rfq] of rfqs.entries()) {
      const row = rows[index]!;
      let fxrpAmount = "0";
      let usdt0Amount = "0";
      const hasClaim =
        row.fxrp_amount !== null && row.fxrp_amount !== undefined;
      if (hasClaim) {
        fxrpAmount = String(row.fxrp_amount);
        usdt0Amount = String(row.usdt0_amount);
      } else if (rfq.status !== "OPEN") {
        const isSeller = rfq.seller.toLowerCase() === account.toLowerCase();
        if (isSeller) {
          if (rfq.status === "SETTLED") usdt0Amount = rfq.winningQuote ?? "0";
          else fxrpAmount = rfq.lotAmount;
        } else if (
          rfq.status === "SETTLED" &&
          rfq.winningProvider?.toLowerCase() === account.toLowerCase()
        ) {
          fxrpAmount = rfq.lotAmount;
          usdt0Amount = (
            BigInt(rfq.quoteCap) - BigInt(rfq.winningQuote ?? "0")
          ).toString();
        } else {
          usdt0Amount = rfq.quoteCap;
        }
      }
      claims.push({
        schemaVersion: 1,
        rfqId: rfq.rfqId,
        account,
        fxrpToken: this.options.fxrpToken,
        fxrpAmount,
        usdt0Token: this.options.usdt0Token,
        usdt0Amount,
        claimed: hasClaim ? Boolean(row.claimed) : false,
      });
    }
    const last = rfqs.at(-1);
    const nextCursor =
      hasMore && last ? encodeRfqCursor({ rfqId: last.rfqId }) : null;
    return portfolioDtoSchema.parse({
      schemaVersion: 1,
      account,
      rfqs,
      claims,
      nextCursor,
    });
  }

  async getStats() {
    const result = await this.query(
      `SELECT
         count(*)::text AS rfq_count,
         count(*) FILTER (WHERE r.status = 'OPEN')::text AS open_rfq_count,
         count(*) FILTER (WHERE r.status = 'SETTLED')::text AS settled_rfq_count,
         coalesce(sum(r.lot_amount), 0)::text AS total_lot_amount,
         coalesce(sum(o.winning_quote) FILTER (WHERE r.status = 'SETTLED'), 0)::text AS settled_quote_amount,
         (SELECT count(*)::text FROM rfq_providers p WHERE p.chain_id = r.chain_id) AS provider_count
       FROM rfqs r
       LEFT JOIN rfq_outcomes o USING (chain_id, rfq_id)
       WHERE r.chain_id = $1
       GROUP BY r.chain_id`,
      [this.options.chainId],
    );
    const health = await this.query(
      `SELECT latest_indexed_block, checked_at
         FROM indexer_health
        WHERE chain_id = $1`,
      [this.options.chainId],
    );
    const row = result.rows[0] ?? {
      rfq_count: "0",
      open_rfq_count: "0",
      settled_rfq_count: "0",
      provider_count: "0",
      total_lot_amount: "0",
      settled_quote_amount: "0",
    };
    const state = health.rows[0];
    return protocolStatsDtoSchema.parse({
      schemaVersion: 1,
      rfqCount: row.rfq_count,
      openRfqCount: row.open_rfq_count,
      settledRfqCount: row.settled_rfq_count,
      providerParticipationCount: row.provider_count,
      totalLotAmount: row.total_lot_amount,
      settledQuoteAmount: row.settled_quote_amount,
      latestIndexedBlock: String(state?.latest_indexed_block ?? "0"),
      updatedAt:
        (state?.checked_at as Date | undefined)?.toISOString() ??
        new Date(0).toISOString(),
    });
  }

  async getHealth() {
    const result = await this.query(
      `SELECT status, latest_indexed_block, latest_observed_block,
              lag_blocks, checked_at, detail_code
         FROM indexer_health
        WHERE chain_id = $1`,
      [this.options.chainId],
    );
    const row = result.rows[0];
    if (!row) throw new ReadRepositoryError("INDEXER_HEALTH_UNAVAILABLE");
    return indexerHealthDtoSchema.parse({
      schemaVersion: 1,
      status: row.status,
      chainId: this.options.chainId,
      latestIndexedBlock: String(row.latest_indexed_block),
      latestObservedBlock: String(row.latest_observed_block),
      lagBlocks: String(row.lag_blocks),
      checkedAt: (row.checked_at as Date).toISOString(),
      ...(row.detail_code ? { detailCode: row.detail_code } : {}),
    });
  }

  async getMetadata() {
    const result = await this.query(
      `SELECT data_mode, source_identity
         FROM indexer_health
        WHERE chain_id = $1`,
      [this.options.chainId],
    );
    const row = result.rows[0];
    if (!row?.data_mode || !row.source_identity) {
      throw new ReadRepositoryError("INDEXER_METADATA_UNAVAILABLE");
    }
    return {
      schemaVersion: 1 as const,
      dataMode: String(row.data_mode) as "fixture" | "live",
      sourceIdentity: String(row.source_identity),
    };
  }
}
