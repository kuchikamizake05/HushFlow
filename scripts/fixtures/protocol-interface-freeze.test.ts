import { describe, expect, it } from "vitest";

import {
  COSTON2_CHAIN_ID,
  MAX_CIPHERTEXT_BYTES,
  MAX_PROVIDERS,
  MAX_QUOTE_DURATION_SECONDS,
  MIN_QUOTE_DURATION_SECONDS,
  RESOLUTION_DURATION_SECONDS,
  resultTypes,
  rfqStatuses,
} from "../../packages/protocol/src/constants.js";
import {
  formatAmount,
  parseAmount,
} from "../../packages/protocol/src/amounts.js";

describe("M3 protocol constants", () => {
  it("matches the integrated M2 contract boundary", () => {
    expect(COSTON2_CHAIN_ID).toBe(114);
    expect(MAX_PROVIDERS).toBe(20);
    expect(MAX_CIPHERTEXT_BYTES).toBe(4_096);
    expect(MIN_QUOTE_DURATION_SECONDS).toBe(60);
    expect(MAX_QUOTE_DURATION_SECONDS).toBe(86_400);
    expect(RESOLUTION_DURATION_SECONDS).toBe(1_800);
    expect(rfqStatuses).toEqual([
      "OPEN",
      "SETTLED",
      "NO_VALID_QUOTE",
      "INVALID_RFQ",
      "CANCELLED",
      "TIMED_OUT",
    ]);
    expect(resultTypes).toEqual([
      "TRADE",
      "NO_VALID_QUOTE",
      "INVALID_RFQ",
    ]);
  });
});

describe("M3 JSON amount boundary", () => {
  it.each(["0", "1", "97000000", ((1n << 256n) - 1n).toString()])(
    "round-trips %s without floating-point conversion",
    (encoded) => {
      expect(formatAmount(parseAmount(encoded))).toBe(encoded);
    },
  );

  it.each([
    "",
    "-1",
    "+1",
    "01",
    "1.0",
    "1e3",
    " 1",
    "1 ",
    (1n << 256n).toString(),
  ])("rejects non-canonical amount %j", (encoded) => {
    expect(() => parseAmount(encoded)).toThrowError("AMOUNT_INVALID");
  });

  it("accepts bigint internally but rejects Number values", () => {
    expect(formatAmount(97_000_000n)).toBe("97000000");
    expect(() => parseAmount(97_000_000 as never)).toThrowError(
      "AMOUNT_INVALID",
    );
  });
});
