import { describe, expect, it } from "vitest";

import {
  assertResultDataBindings,
  decodeResultDataV1,
  encodeResultDataV1,
  parseEnvelopeV1,
  parseResultDataV1,
} from "../../packages/protocol/src/fcc.js";
import envelopeFixture from "./envelope-v1.json" with { type: "json" };
import resultDataFixture from "./result-data-v1.json" with { type: "json" };

const EXPECTED_TRADE_RESULT =
  "0x000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000720000000000000000000000001111111111111111111111111111111111111111000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044444444444444444444444444444444444444440000000000000000000000000000000000000000000000000000000005c81a4000000000000000000000000000000000000000000000000000000000713fb42c1000000000000000000000000000000000000000000000000000000000000001";

describe("FCC v1 protocol fixtures", () => {
  it("parses integer values without JSON floating-point conversion", () => {
    const seller = parseEnvelopeV1(envelopeFixture.sellerMinimum);
    const result = parseResultDataV1(resultDataFixture.trade);

    expect(seller.rfqId).toBe(42n);
    expect(seller.value).toBe(94_000_000n);
    expect(result.winningQuote).toBe(97_000_000n);
    expect(result.resultExpiry).toBe(1_900_000_300n);
  });

  it("encodes ResultDataV1 identically to the Solidity ABI fixture", () => {
    const result = parseResultDataV1(resultDataFixture.trade);

    expect(encodeResultDataV1(result)).toBe(EXPECTED_TRADE_RESULT);
  });

  it("rejects a result bound to another chain", () => {
    const result = parseResultDataV1(resultDataFixture.trade);

    expect(() =>
      assertResultDataBindings(result, {
        chainId: 115n,
        contractAddress: result.contractAddress,
        rfqId: result.rfqId,
      }),
    ).toThrowError("RESULT_CHAIN_MISMATCH");
  });

  it("decodes canonical result bytes without losing integer precision", () => {
    const result = decodeResultDataV1(EXPECTED_TRADE_RESULT);

    expect(result.resultType).toBe("TRADE");
    expect(result.winningQuote).toBe(97_000_000n);
    expect(encodeResultDataV1(result)).toBe(EXPECTED_TRADE_RESULT);
  });

  it.each([
    [
      "contract",
      { contractAddress: "0x9999999999999999999999999999999999999999" },
      "RESULT_CONTRACT_MISMATCH",
    ],
    ["RFQ", { rfqId: 43n }, "RESULT_RFQ_MISMATCH"],
  ] as const)(
    "rejects a result bound to another %s",
    (_label, override, error) => {
      const result = parseResultDataV1(resultDataFixture.trade);

      expect(() =>
        assertResultDataBindings(result, {
          chainId: result.chainId,
          contractAddress: result.contractAddress,
          rfqId: result.rfqId,
          ...override,
        }),
      ).toThrowError(error);
    },
  );

  it("rejects unsafe JSON numbers before bigint conversion", () => {
    expect(() =>
      parseEnvelopeV1({
        ...envelopeFixture.sellerMinimum,
        value: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toThrow();
  });

  it("rejects zero nonces and unknown fields", () => {
    expect(() =>
      parseEnvelopeV1({
        ...envelopeFixture.sellerMinimum,
        payloadNonce: `0x${"0".repeat(64)}`,
      }),
    ).toThrowError(/NONCE_ZERO/);

    expect(() =>
      parseResultDataV1({
        ...resultDataFixture.trade,
        leakedLosingQuote: "95000000",
      }),
    ).toThrow();
  });

  it.each([
    ["TRADE", "0x0000000000000000000000000000000000000000", "97000000"],
    ["TRADE", "0x4444444444444444444444444444444444444444", "0"],
    ["NO_VALID_QUOTE", "0x4444444444444444444444444444444444444444", "0"],
    ["INVALID_RFQ", "0x0000000000000000000000000000000000000000", "1"],
  ])(
    "rejects inconsistent %s outcome data",
    (resultType, winningProvider, winningQuote) => {
      expect(() =>
        parseResultDataV1({
          ...resultDataFixture.trade,
          resultType,
          winningProvider,
          winningQuote,
        }),
      ).toThrowError(/RESULT_OUTCOME_INCONSISTENT/);
    },
  );
});
