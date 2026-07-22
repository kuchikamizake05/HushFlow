import { describe, expect, it } from "vitest";

import {
  assertResultDataBindings,
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
});
