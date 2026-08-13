import { describe, expect, it } from "vitest";

import {
  dataProvenanceDtoSchema,
  indexerHealthDtoSchema,
  portfolioDtoSchema,
  portfolioQueryDtoSchema,
  protocolStatsDtoSchema,
  readApiErrorDtoSchema,
  rfqDetailDtoSchema,
  rfqProofCenterDtoV2Schema,
  rfqProofDtoSchema,
} from "../../packages/protocol/src/read-api.js";
import { MAX_CIPHERTEXT_BYTES } from "../../packages/protocol/src/constants.js";
import {
  CursorError,
  decodeRfqCursor,
  encodeRfqCursor,
} from "../../services/indexer/src/api/cursor.js";

const account = "0x1111111111111111111111111111111111111111";
const provider = "0x2222222222222222222222222222222222222222";
const hash = `0x${"a".repeat(64)}`;

describe("M4A shared read contracts", () => {
  it("freezes explicit fixture/live provenance with a stable source ID", () => {
    expect(
      dataProvenanceDtoSchema.parse({
        mode: "fixture",
        sourceId: "hushflow-m3-event-fixture-v1",
      }),
    ).toEqual({
      mode: "fixture",
      sourceId: "hushflow-m3-event-fixture-v1",
    });
    expect(
      dataProvenanceDtoSchema.parse({
        mode: "live",
        sourceId: "coston2-rpc-primary",
      }),
    ).toEqual({ mode: "live", sourceId: "coston2-rpc-primary" });
    expect(() =>
      dataProvenanceDtoSchema.parse({ mode: "fixture", sourceId: "" }),
    ).toThrow();
  });

  it.each(["REORG_REPLAY_REQUIRED", "EVENT_INVALID"] as const)(
    "accepts public degraded health detail %s",
    (detailCode) => {
      expect(
        indexerHealthDtoSchema.parse({
          schemaVersion: 1,
          status: "degraded",
          chainId: 114,
          latestIndexedBlock: "123",
          latestObservedBlock: "124",
          lagBlocks: "1",
          checkedAt: "2026-08-12T12:00:00.000Z",
          detailCode,
        }).detailCode,
      ).toBe(detailCode);
    },
  );

  it("freezes INVALID_CURSOR as a coarse public error", () => {
    expect(
      readApiErrorDtoSchema.parse({
        schemaVersion: 1,
        error: "INVALID_CURSOR",
      }),
    ).toEqual({ schemaVersion: 1, error: "INVALID_CURSOR" });
  });

  it("round-trips an opaque versioned RFQ cursor", () => {
    const encoded = encodeRfqCursor({ rfqId: "900719925474099312345" });

    expect(encoded).not.toContain("900719925474099312345");
    expect(decodeRfqCursor(encoded)).toEqual({
      schemaVersion: 1,
      rfqId: "900719925474099312345",
    });
  });

  it.each(["", "not-base64", "e30", "a".repeat(513)])(
    "rejects malformed cursor %s",
    (value) => {
      expect(() => decodeRfqCursor(value)).toThrow(CursorError);
    },
  );

  it("validates explicit public proof data and rejects extra plaintext", () => {
    const proof = {
      schemaVersion: 1,
      rfqId: "1",
      sellerCiphertext: "0x1234",
      providerCiphertexts: [{ provider, ciphertext: "0xabcd" }],
      actionId: hash,
      outcome: {
        resultType: "TRADE",
        winningProvider: provider,
        winningQuote: "2400000",
        resultNonce: `0x${"b".repeat(64)}`,
        transactionHash: `0x${"c".repeat(64)}`,
      },
    };

    expect(rfqProofDtoSchema.parse(proof)).toEqual(proof);
    expect(() =>
      rfqProofDtoSchema.parse({
        ...proof,
        plaintextMinimum: "PRIVATE_MARKER_42",
      }),
    ).toThrow();
  });

  it("keeps proof v1 compatible and freezes strict partial/verified Proof Center v2", () => {
    const provenance = {
      mode: "live" as const,
      sourceId: "coston2-rpc-primary",
    };
    const partial = {
      schemaVersion: 2,
      evidenceStatus: "PARTIAL",
      rfqId: "1",
      provenance: { mode: "fixture", sourceId: "local-fixture-v1" },
      reason: "FIXTURE_DATA",
    };
    const verified = {
      schemaVersion: 2,
      evidenceStatus: "VERIFIED",
      rfqId: "1",
      provenance,
      chainId: 114,
      contractAddress: "0x9999999999999999999999999999999999999999",
      resultData: "0x1234",
      signature: `0x${"ab".repeat(65)}`,
      actionId: hash,
      submissionTag: "submit",
      actionStatus: 1,
      decodedResult: {
        schemaVersion: 1,
        chainId: "114",
        contractAddress: "0x9999999999999999999999999999999999999999",
        rfqId: "1",
        resultType: "TRADE",
        winningProvider: provider,
        winningQuote: "2400000",
        resultExpiry: "1700001900",
        resultNonce: `0x${"b".repeat(64)}`,
      },
      configuredTeeSigner: account,
      recoveredTeeSigner: account,
      signatureVerified: true,
      payloadHash: `0x${"d".repeat(64)}`,
      signedMessageHash: `0x${"e".repeat(64)}`,
      sourceTransactionHash: `0x${"f".repeat(64)}`,
      sourceBlockNumber: "123462",
      sourceBlockHash: `0x${"1".repeat(64)}`,
    };

    expect(rfqProofCenterDtoV2Schema.parse(partial)).toEqual(partial);
    expect(rfqProofCenterDtoV2Schema.parse(verified)).toEqual(verified);
    expect(() =>
      rfqProofCenterDtoV2Schema.parse({ ...partial, signature: "0x1234" }),
    ).toThrow();
    expect(() =>
      rfqProofCenterDtoV2Schema.parse({
        ...verified,
        signatureVerified: false,
      }),
    ).toThrow();
  });

  it("accepts 4096-byte ciphertext and rejects 4097-byte ciphertext", () => {
    const accepted = `0x${"ab".repeat(MAX_CIPHERTEXT_BYTES)}`;
    const rejected = `0x${"ab".repeat(MAX_CIPHERTEXT_BYTES + 1)}`;
    const summary = {
      schemaVersion: 1,
      rfqId: "1",
      seller: account,
      lotAmount: "1000000",
      quoteCap: "2500000",
      quoteDeadline: "1700000100",
      resolutionDeadline: "1700001900",
      status: "OPEN",
      providerCount: 1,
      winningProvider: null,
      winningQuote: null,
      actionId: null,
    };
    const detail = {
      schemaVersion: 1,
      summary,
      sellerCiphertext: accepted,
      providers: [
        {
          position: 0,
          provider,
          quoteCiphertext: accepted,
          submittedAtBlock: "123459",
          transactionHash: hash,
        },
      ],
      activity: [],
    };

    expect(rfqDetailDtoSchema.parse(detail)).toEqual(detail);
    expect(() =>
      rfqDetailDtoSchema.parse({ ...detail, sellerCiphertext: rejected }),
    ).toThrow();
    expect(() =>
      rfqDetailDtoSchema.parse({
        ...detail,
        providers: [{ ...detail.providers[0], quoteCiphertext: rejected }],
      }),
    ).toThrow();
  });

  it("validates portfolio amounts exclusively as decimal strings", () => {
    const portfolio = {
      schemaVersion: 1,
      account,
      rfqs: [],
      claims: [
        {
          schemaVersion: 1,
          rfqId: "1",
          account,
          fxrpToken: "0x3333333333333333333333333333333333333333",
          fxrpAmount: "1000000",
          usdt0Token: "0x4444444444444444444444444444444444444444",
          usdt0Amount: "0",
          claimed: false,
        },
      ],
      nextCursor: "opaque-combined-account-cursor",
    };

    expect(portfolioDtoSchema.parse(portfolio)).toEqual(portfolio);
    expect(() =>
      portfolioDtoSchema.parse({
        ...portfolio,
        claims: [{ ...portfolio.claims[0], fxrpAmount: 1_000_000 }],
      }),
    ).toThrow();
  });

  it("freezes one stable cursor contract for combined portfolio membership", () => {
    expect(
      portfolioQueryDtoSchema.parse({
        schemaVersion: 1,
        account,
        limit: 100,
        cursor: "opaque-combined-account-cursor",
      }),
    ).toEqual({
      schemaVersion: 1,
      account,
      limit: 100,
      cursor: "opaque-combined-account-cursor",
    });
    expect(() =>
      portfolioQueryDtoSchema.parse({
        schemaVersion: 1,
        account,
        limit: 101,
      }),
    ).toThrow();
  });

  it("validates event-derived protocol statistics", () => {
    const stats = {
      schemaVersion: 1,
      rfqCount: "12",
      openRfqCount: "3",
      settledRfqCount: "4",
      providerParticipationCount: "19",
      totalLotAmount: "12000000",
      settledQuoteAmount: "9400000",
      latestIndexedBlock: "123464",
      updatedAt: "2026-08-12T12:00:00.000Z",
    };

    expect(protocolStatsDtoSchema.parse(stats)).toEqual(stats);
  });
});
