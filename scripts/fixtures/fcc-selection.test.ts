import { describe, expect, it, vi } from "vitest";

import { resolveRfqV1 } from "../../services/fcc-extension/src/resolve-rfq.js";
import envelopeFixture from "./envelope-v1.json" with { type: "json" };

const CONTRACT = "0x1111111111111111111111111111111111111111";
const SELLER = "0x2222222222222222222222222222222222222222";
const PROVIDER_A = "0x3333333333333333333333333333333333333333";
const PROVIDER_B = "0x4444444444444444444444444444444444444444";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const RESULT_NONCE =
  "0x2000000000000000000000000000000000000000000000000000000000000001";

function resolve(
  sellerEnvelope: unknown = envelopeFixture.sellerMinimum,
  providers: Array<{
    address: string;
    quoteCap: bigint;
    envelope: unknown;
  }> = [
    {
      address: PROVIDER_A,
      quoteCap: 100_000_000n,
      envelope: envelopeFixture.providerQuotes[0],
    },
    {
      address: PROVIDER_B,
      quoteCap: 100_000_000n,
      envelope: envelopeFixture.providerQuotes[1],
    },
  ],
) {
  return resolveRfqV1({
    chainId: 114n,
    contractAddress: CONTRACT,
    providers,
    resultExpiry: 1_900_000_300n,
    resultNonce: RESULT_NONCE,
    rfqId: 42n,
    seller: SELLER,
    sellerEnvelope,
  });
}

describe("FCC confidential quote selection", () => {
  it("selects the highest valid quote", () => {
    const result = resolve();

    expect(result.resultType).toBe("TRADE");
    expect(result.winningProvider).toBe(PROVIDER_B);
    expect(result.winningQuote).toBe(97_000_000n);
  });

  it("uses earlier on-chain submission order for equal quotes", () => {
    const secondQuote = {
      ...envelopeFixture.providerQuotes[1],
      value: envelopeFixture.providerQuotes[0]!.value,
    };

    const result = resolve(envelopeFixture.sellerMinimum, [
      {
        address: PROVIDER_A,
        quoteCap: 100_000_000n,
        envelope: envelopeFixture.providerQuotes[0],
      },
      {
        address: PROVIDER_B,
        quoteCap: 100_000_000n,
        envelope: secondQuote,
      },
    ]);

    expect(result.winningProvider).toBe(PROVIDER_A);
    expect(result.winningQuote).toBe(95_000_000n);
  });

  it("returns NO_VALID_QUOTE when every valid quote is below the seller minimum", () => {
    const sellerEnvelope = {
      ...envelopeFixture.sellerMinimum,
      value: "99000000",
    };

    const result = resolve(sellerEnvelope);

    expect(result.resultType).toBe("NO_VALID_QUOTE");
    expect(result.winningProvider).toBe(ZERO_ADDRESS);
    expect(result.winningQuote).toBe(0n);
  });

  it("returns INVALID_RFQ for a malformed or misbound seller envelope", () => {
    const result = resolve({
      ...envelopeFixture.sellerMinimum,
      contractAddress: "0x9999999999999999999999999999999999999999",
    });

    expect(result.resultType).toBe("INVALID_RFQ");
    expect(result.winningProvider).toBe(ZERO_ADDRESS);
  });

  it("independently ignores malformed, misbound, zero, and over-cap provider quotes", () => {
    const malformed = { unexpected: "plaintext" };
    const misbound = {
      ...envelopeFixture.providerQuotes[0],
      sender: PROVIDER_B,
    };
    const zero = { ...envelopeFixture.providerQuotes[0], value: "0" };
    const overCap = {
      ...envelopeFixture.providerQuotes[0],
      value: "100000001",
    };

    for (const envelope of [malformed, misbound, zero, overCap]) {
      const result = resolve(envelopeFixture.sellerMinimum, [
        { address: PROVIDER_A, quoteCap: 100_000_000n, envelope },
        {
          address: PROVIDER_B,
          quoteCap: 100_000_000n,
          envelope: envelopeFixture.providerQuotes[1],
        },
      ]);

      expect(result.winningProvider).toBe(PROVIDER_B);
    }
  });

  it("does not return or log seller minimum and losing quotes", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const serialized = JSON.stringify(resolve(), (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );

    expect(serialized).not.toContain("94000000");
    expect(serialized).not.toContain("95000000");
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();

    log.mockRestore();
    error.mockRestore();
  });
});
