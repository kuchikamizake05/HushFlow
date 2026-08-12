import { describe, expect, it } from "vitest";

import {
  decodeResolutionInstructionV1,
  encodeResolutionInstructionV1,
  type ResolutionInstructionV1,
} from "../../packages/protocol/src/fcc.js";

const instruction: ResolutionInstructionV1 = {
  schemaVersion: 1,
  chainId: 114n,
  contractAddress: "0x1111111111111111111111111111111111111111",
  rfqId: 42n,
  seller: "0x2222222222222222222222222222222222222222",
  sellerCiphertext: "0x0102",
  quoteCap: 120_000_000n,
  providers: [
    "0x3333333333333333333333333333333333333333",
    "0x4444444444444444444444444444444444444444",
  ],
  quoteCiphertexts: ["0x0304", "0x0506"],
  resolutionDeadline: 1_900_000_500n,
};

describe("RESOLVE_RFQ instruction v1", () => {
  it("round-trips the contract ABI message without exposing plaintext values", () => {
    const decoded = decodeResolutionInstructionV1(
      encodeResolutionInstructionV1(instruction),
    );

    expect(decoded).toEqual(instruction);
    expect(
      JSON.stringify(decoded, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    ).not.toContain("94000000");
  });

  it("rejects mismatched provider and ciphertext arrays and more than 20 providers", () => {
    expect(() =>
      encodeResolutionInstructionV1({
        ...instruction,
        quoteCiphertexts: ["0x0304"],
      }),
    ).toThrow("RESOLUTION_PROVIDERS_MISMATCH");

    expect(() =>
      encodeResolutionInstructionV1({
        ...instruction,
        providers: Array.from({ length: 21 }, () => instruction.providers[0]!),
        quoteCiphertexts: Array.from({ length: 21 }, () => "0x01"),
      }),
    ).toThrow("RESOLUTION_PROVIDER_LIMIT");
  });
});
