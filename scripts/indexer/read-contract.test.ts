import { describe, expect, it } from "vitest";

import {
  portfolioDtoSchema,
  protocolStatsDtoSchema,
  rfqProofDtoSchema,
} from "../../packages/protocol/src/read-api.js";
import {
  CursorError,
  decodeRfqCursor,
  encodeRfqCursor,
} from "../../services/indexer/src/api/cursor.js";

const account = "0x1111111111111111111111111111111111111111";
const provider = "0x2222222222222222222222222222222222222222";
const hash = `0x${"a".repeat(64)}`;

describe("M4A shared read contracts", () => {
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
      rfqProofDtoSchema.parse({ ...proof, plaintextMinimum: "PRIVATE_MARKER_42" }),
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
    };

    expect(portfolioDtoSchema.parse(portfolio)).toEqual(portfolio);
    expect(() =>
      portfolioDtoSchema.parse({
        ...portfolio,
        claims: [{ ...portfolio.claims[0], fxrpAmount: 1_000_000 }],
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
