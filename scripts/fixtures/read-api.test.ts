import { describe, expect, it } from "vitest";

import {
  activityDtoSchema,
  claimableDtoSchema,
  createCursorPageSchema,
  deploymentStatusDtoSchema,
  indexerHealthDtoSchema,
  rfqDetailDtoSchema,
  rfqSummaryDtoSchema,
} from "../../packages/protocol/src/read-api.js";
import {
  COSTON2_EXPLORER_URL,
  getCoston2AddressUrl,
  getCoston2BlockUrl,
  getCoston2TransactionUrl,
} from "../../packages/protocol/src/explorer.js";

const ADDRESS_A = "0x1111111111111111111111111111111111111111";
const ADDRESS_B = "0x2222222222222222222222222222222222222222";
const HASH_A = `0x${"a".repeat(64)}`;

const summary = {
  schemaVersion: 1,
  rfqId: "42",
  seller: ADDRESS_A,
  lotAmount: "1000000000000000000",
  quoteCap: "2500000",
  quoteDeadline: "1786543200",
  resolutionDeadline: "1786545000",
  status: "OPEN",
  providerCount: 1,
  winningProvider: null,
  winningQuote: null,
  actionId: null,
} as const;

const activity = {
  schemaVersion: 1,
  rfqId: "42",
  kind: "QUOTE_SUBMITTED",
  transactionHash: HASH_A,
  blockNumber: "987654",
  logIndex: 3,
  occurredAt: "2026-08-12T12:00:00.000Z",
  actor: ADDRESS_B,
} as const;

describe("M3 read API DTOs", () => {
  it("accepts pending and live deployment status without unsafe integers", () => {
    expect(
      deploymentStatusDtoSchema.parse({
        schemaVersion: 1,
        network: "coston2",
        chainId: 114,
        status: "pending",
        blockingReason: "FCC_ORGANIZER_ACCESS",
        updatedAt: "2026-08-12T12:00:00.000Z",
      }),
    ).toMatchObject({ status: "pending" });

    expect(
      deploymentStatusDtoSchema.parse({
        schemaVersion: 1,
        network: "coston2",
        chainId: 114,
        status: "live",
        hushFlowRfq: ADDRESS_A,
        deploymentTransactionHash: HASH_A,
        deploymentBlock: "9007199254740993",
        updatedAt: "2026-08-12T12:00:00.000Z",
      }),
    ).toMatchObject({ deploymentBlock: "9007199254740993" });
  });

  it("accepts RFQ summary, ordered provider detail, and public activity", () => {
    expect(rfqSummaryDtoSchema.parse(summary)).toEqual(summary);
    expect(activityDtoSchema.parse(activity)).toEqual(activity);

    const detail = {
      schemaVersion: 1,
      summary,
      sellerCiphertext: "0x1234",
      providers: [
        {
          position: 0,
          provider: ADDRESS_B,
          quoteCiphertext: "0xabcd",
          submittedAtBlock: "987654",
          transactionHash: HASH_A,
        },
      ],
      activity: [activity],
    } as const;

    expect(rfqDetailDtoSchema.parse(detail)).toEqual(detail);
  });

  it("accepts claimable amounts and cursor pages as decimal strings", () => {
    const claim = {
      schemaVersion: 1,
      rfqId: "42",
      account: ADDRESS_A,
      fxrpToken: ADDRESS_A,
      fxrpAmount: "9007199254740993",
      usdt0Token: ADDRESS_B,
      usdt0Amount: "0",
      claimed: false,
    } as const;

    expect(claimableDtoSchema.parse(claim)).toEqual(claim);
    expect(
      createCursorPageSchema(rfqSummaryDtoSchema).parse({
        schemaVersion: 1,
        items: [summary],
        nextCursor: "eyJibG9jayI6IjEyMyJ9",
      }),
    ).toMatchObject({ items: [summary] });
  });

  it("accepts redacted indexer health", () => {
    const health = {
      schemaVersion: 1,
      status: "degraded",
      chainId: 114,
      latestIndexedBlock: "9007199254740993",
      latestObservedBlock: "9007199254741000",
      lagBlocks: "7",
      checkedAt: "2026-08-12T12:00:00.000Z",
      detailCode: "RPC_UNAVAILABLE",
    } as const;

    expect(indexerHealthDtoSchema.parse(health)).toEqual(health);
  });

  it.each([
    ["extra field", { ...summary, unknown: true }],
    ["unsafe numeric amount", { ...summary, lotAmount: 9_007_199_254_740_992 }],
    ["invalid status", { ...summary, status: "RESOLVED" }],
    ["plaintext seller minimum", { ...summary, sellerMinimum: "100" }],
    ["plaintext winning quote", { ...summary, winningQuotePlaintext: "200" }],
  ])("rejects RFQ DTO with %s", (_label, input) => {
    expect(() => rfqSummaryDtoSchema.parse(input)).toThrow();
  });

  it.each([
    ["plaintext quote", { ...activity, quote: "250" }],
    ["unsafe log index", { ...activity, logIndex: Number.MAX_SAFE_INTEGER + 1 }],
    ["raw error", {
      schemaVersion: 1,
      status: "degraded",
      chainId: 114,
      latestIndexedBlock: "1",
      latestObservedBlock: "2",
      lagBlocks: "1",
      checkedAt: "2026-08-12T12:00:00.000Z",
      rawError: "Authorization: Bearer secret",
    }],
  ])("rejects unsafe or private read data: %s", (_label, input) => {
    const schema = "rawError" in input ? indexerHealthDtoSchema : activityDtoSchema;
    expect(() => schema.parse(input)).toThrow();
  });
});

describe("M3 Coston2 explorer helpers", () => {
  it("builds canonical address, transaction, and block URLs", () => {
    expect(COSTON2_EXPLORER_URL).toBe(
      "https://coston2-explorer.flare.network",
    );
    expect(getCoston2AddressUrl(ADDRESS_A)).toBe(
      `${COSTON2_EXPLORER_URL}/address/${ADDRESS_A}`,
    );
    expect(getCoston2TransactionUrl(HASH_A)).toBe(
      `${COSTON2_EXPLORER_URL}/tx/${HASH_A}`,
    );
    expect(getCoston2BlockUrl("9007199254740993")).toBe(
      `${COSTON2_EXPLORER_URL}/block/9007199254740993`,
    );
    expect(getCoston2BlockUrl(123n)).toBe(
      `${COSTON2_EXPLORER_URL}/block/123`,
    );
  });

  it.each([
    ["address", () => getCoston2AddressUrl("../address/evil")],
    ["transaction", () => getCoston2TransactionUrl("0x1234")],
    ["negative block", () => getCoston2BlockUrl(-1n)],
    ["noncanonical block", () => getCoston2BlockUrl("01")],
  ])("rejects an invalid %s path component", (_label, build) => {
    expect(build).toThrow();
  });
});
