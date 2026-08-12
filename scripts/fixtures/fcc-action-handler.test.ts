import { describe, expect, it, vi } from "vitest";

import {
  decodeResultDataV1,
  encodeResolutionInstructionV1,
  type EnvelopeV1,
  type ResolutionInstructionV1,
} from "../../packages/protocol/src/fcc.js";
import { handleFccActionV1 } from "../../services/fcc-extension/src/handle-action.js";

const CONTRACT = "0x1111111111111111111111111111111111111111";
const SELLER = "0x2222222222222222222222222222222222222222";
const PROVIDER_A = "0x3333333333333333333333333333333333333333";
const PROVIDER_B = "0x4444444444444444444444444444444444444444";
const RESULT_NONCE =
  "0x3000000000000000000000000000000000000000000000000000000000000001";

const instruction: ResolutionInstructionV1 = {
  schemaVersion: 1,
  chainId: 114n,
  contractAddress: CONTRACT,
  rfqId: 42n,
  seller: SELLER,
  sellerCiphertext: "0xaa",
  quoteCap: 120_000_000n,
  providers: [PROVIDER_A, PROVIDER_B],
  quoteCiphertexts: ["0xbb", "0xcc"],
  resolutionDeadline: 1_900_000_500n,
};

function envelope(
  sender: string,
  payloadKind: EnvelopeV1["payloadKind"],
  value: bigint,
  nonceByte: string,
): unknown {
  return {
    schemaVersion: 1,
    chainId: "114",
    contractAddress: CONTRACT,
    rfqId: "42",
    sender,
    payloadKind,
    value: value.toString(),
    payloadNonce: `0x${nonceByte.repeat(64)}`,
  };
}

function action(message = encodeResolutionInstructionV1(instruction)) {
  return { opType: "HUSHFLOW", opCommand: "RESOLVE_RFQ", message } as const;
}

function dependencies(overrides: Record<string, unknown> = {}) {
  const plaintextByCiphertext: Record<string, unknown> = {
    "0xaa": envelope(SELLER, "SELLER_MINIMUM", 94_000_000n, "1"),
    "0xbb": envelope(PROVIDER_A, "PROVIDER_QUOTE", 95_000_000n, "2"),
    "0xcc": envelope(PROVIDER_B, "PROVIDER_QUOTE", 97_000_000n, "3"),
  };

  return {
    createResultNonce: () => RESULT_NONCE,
    decryptEnvelope: async (ciphertext: string) => plaintextByCiphertext[ciphertext],
    ...overrides,
  };
}

describe("FCC HushFlow action handler", () => {
  it("decrypts a resolution instruction and returns only the winning quote", async () => {
    const encodedResult = await handleFccActionV1(action(), dependencies());
    const result = decodeResultDataV1(encodedResult);

    expect(result.resultType).toBe("TRADE");
    expect(result.winningProvider).toBe(PROVIDER_B);
    expect(result.winningQuote).toBe(97_000_000n);
    expect(JSON.stringify(result, (_key, value) => (typeof value === "bigint" ? value.toString() : value)))
      .not.toContain("95000000");
  });

  it("isolates provider decryption failures without logging plaintext", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const deps = dependencies({
      decryptEnvelope: async (ciphertext: string) => {
        if (ciphertext === "0xbb") throw new Error("malformed ciphertext");
        return dependencies().decryptEnvelope(ciphertext);
      },
    });

    const result = decodeResultDataV1(await handleFccActionV1(action(), deps));

    expect(result.winningProvider).toBe(PROVIDER_B);
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    log.mockRestore();
    error.mockRestore();
  });

  it("turns seller decryption failure into INVALID_RFQ", async () => {
    const deps = dependencies({
      decryptEnvelope: async (ciphertext: string) => {
        if (ciphertext === "0xaa") throw new Error("seller decrypt failed");
        return dependencies().decryptEnvelope(ciphertext);
      },
    });

    const result = decodeResultDataV1(await handleFccActionV1(action(), deps));

    expect(result.resultType).toBe("INVALID_RFQ");
    expect(result.winningQuote).toBe(0n);
  });

  it("rejects unsupported operation types and commands", async () => {
    await expect(
      handleFccActionV1({ ...action(), opType: "OTHER" }, dependencies()),
    ).rejects.toThrow("FCC_OPERATION_UNSUPPORTED");
    await expect(
      handleFccActionV1({ ...action(), opCommand: "OTHER" }, dependencies()),
    ).rejects.toThrow("FCC_COMMAND_UNSUPPORTED");
  });
});
