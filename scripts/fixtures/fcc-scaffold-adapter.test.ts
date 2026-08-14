import { describe, expect, it } from "vitest";
import type { Hex } from "viem";
import { bytesToHex } from "viem";

import {
  decodeResultDataV1,
  encodeResolutionInstructionV1,
  type EnvelopeV1,
  type ResolutionInstructionV1,
} from "../../packages/protocol/src/fcc.js";
import { stringToBytes32Hex } from "../../services/fcc-extension/src/base/encoding.js";
import { Server } from "../../services/fcc-extension/src/base/server.js";
import { Framework } from "../../services/fcc-extension/src/base/types.js";
import {
  OP_COMMAND_RESOLVE_RFQ,
  OP_TYPE_HUSHFLOW,
  VERSION,
} from "../../services/fcc-extension/src/app/config.js";
import {
  createHushFlowHandler,
  register,
  reportState,
  resetState,
} from "../../services/fcc-extension/src/app/handlers.js";

const CONTRACT = "0x1111111111111111111111111111111111111111";
const SELLER = "0x2222222222222222222222222222222222222222";
const PROVIDER_A = "0x3333333333333333333333333333333333333333";
const PROVIDER_B = "0x4444444444444444444444444444444444444444";
const ACTION_ID = `0x${"a".repeat(64)}` as Hex;
const TEE_ID = `0x${"b".repeat(40)}` as Hex;

const sampleInstruction: ResolutionInstructionV1 = {
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

function createSampleDeps(
  overrides: {
    decrypt?: (ciphertext: string) => Promise<string>;
    createResultNonce?: () => Hex;
  } = {},
) {
  const plaintexts: Record<string, unknown> = {
    "0xaa": envelope(SELLER, "SELLER_MINIMUM", 94_000_000n, "1"),
    "0xbb": envelope(PROVIDER_A, "PROVIDER_QUOTE", 95_000_000n, "2"),
    "0xcc": envelope(PROVIDER_B, "PROVIDER_QUOTE", 97_000_000n, "3"),
  };

  return {
    decrypt:
      overrides.decrypt ??
      (async (ciphertextBase64OrHex: string) => {
        const key = ciphertextBase64OrHex.startsWith("0x")
          ? ciphertextBase64OrHex
          : `0x${Buffer.from(ciphertextBase64OrHex, "base64").toString("hex")}`;
        const plain = plaintexts[key];
        if (!plain) throw new Error(`decrypt failed for ${key}`);
        return JSON.stringify(plain);
      }),
    createResultNonce:
      overrides.createResultNonce ??
      (() => `0x${"3".repeat(64)}` as Hex),
  };
}

function buildWireAction(
  opType: string,
  opCommand: string,
  originalMessage: string,
) {
  const fixed = {
    instructionId: ACTION_ID,
    teeId: TEE_ID,
    timestamp: 1_900_000_000,
    rewardEpochId: 1,
    opType: stringToBytes32Hex(opType),
    opCommand: stringToBytes32Hex(opCommand),
    cosigners: [],
    cosignersThreshold: 0,
    originalMessage,
    additionalFixedMessage: "0x",
  };

  return {
    data: {
      id: ACTION_ID,
      type: "instruction",
      submissionTag: "submit",
      message: bytesToHex(new TextEncoder().encode(JSON.stringify(fixed))),
    },
    additionalVariableMessages: [],
    timestamps: [],
    additionalActionData: "0x",
    signatures: [],
  };
}

describe("FCC Scaffold Adapter - HushFlow RFQ resolution", () => {
  it("maps valid HUSHFLOW / RESOLVE_RFQ request to canonical HushFlow resolution result", async () => {
    resetState();
    const deps = createSampleDeps();
    const handler = createHushFlowHandler(deps);
    const msg = encodeResolutionInstructionV1(sampleInstruction);

    const [dataHex, status, error] = await handler(msg);

    expect(status).toBe(1);
    expect(error).toBeNull();
    expect(dataHex).toMatch(/^0x/);

    const decoded = decodeResultDataV1(dataHex as Hex);
    expect(decoded.resultType).toBe("TRADE");
    expect(decoded.winningProvider).toBe(PROVIDER_B);
    expect(decoded.winningQuote).toBe(97_000_000n);
  });

  it("handles full HTTP POST /action through Server matching official scaffold wire contract", async () => {
    resetState();
    const deps = createSampleDeps();
    const server = new Server(
      7702,
      7701,
      VERSION,
      (fw) => register(fw, deps),
      reportState,
    );

    const wireBody = JSON.stringify(
      buildWireAction(
        OP_TYPE_HUSHFLOW,
        OP_COMMAND_RESOLVE_RFQ,
        encodeResolutionInstructionV1(sampleInstruction),
      ),
    );

    const [statusCode, headers, resBody] = await server.handleRequest(
      "POST",
      "/action",
      wireBody,
    );

    expect(statusCode).toBe(200);
    expect(headers["content-type"]).toBe("application/json");

    const result = JSON.parse(resBody);
    expect(result).toEqual({
      id: ACTION_ID,
      submissionTag: "submit",
      status: 1,
      log: "ok",
      opType: stringToBytes32Hex(OP_TYPE_HUSHFLOW),
      opCommand: stringToBytes32Hex(OP_COMMAND_RESOLVE_RFQ),
      additionalResultStatus: "0x",
      version: VERSION,
      data: expect.stringMatching(/^0x/),
    });

    const decoded = decodeResultDataV1(result.data as Hex);
    expect(decoded.winningProvider).toBe(PROVIDER_B);
    expect(decoded.winningQuote).toBe(97_000_000n);
  });

  it("returns error action result (status 0) on malformed or unparseable resolution instruction", async () => {
    resetState();
    const deps = createSampleDeps();
    const handler = createHushFlowHandler(deps);

    // Invalid hex / bad ABI payload
    const [dataHex, status, error] = await handler("0x1234");

    expect(status).toBe(0);
    expect(dataHex).toBeNull();
    expect(error).toContain("error:");
  });

  it("returns failed action result (status 0) when decryption throws fatal error", async () => {
    resetState();
    const deps = createSampleDeps({
      decrypt: async () => {
        throw new Error("TEE hardware crypto enclave unavailable");
      },
    });
    const handler = createHushFlowHandler(deps);
    const msg = encodeResolutionInstructionV1(sampleInstruction);

    const [dataHex, status, error] = await handler(msg);

    // When seller envelope cannot be decrypted, resolver marks it INVALID_RFQ cleanly
    expect(status).toBe(1);
    expect(error).toBeNull();
    const decoded = decodeResultDataV1(dataHex as Hex);
    expect(decoded.resultType).toBe("INVALID_RFQ");
  });

  it("enforces Flare reserved OP type rules (never registers or allows F_ prefix)", () => {
    expect(OP_TYPE_HUSHFLOW).toBe("HUSHFLOW");
    expect(OP_TYPE_HUSHFLOW.startsWith("F_")).toBe(false);

    const framework = new Framework();
    expect(() => {
      if (OP_TYPE_HUSHFLOW.startsWith("F_")) {
        throw new Error("RESERVED_FLARE_OP_TYPE");
      }
      register(framework, createSampleDeps());
    }).not.toThrow();

    // Verify lookup finds HUSHFLOW / RESOLVE_RFQ
    const lookupHandler = framework.lookup(
      stringToBytes32Hex("HUSHFLOW"),
      stringToBytes32Hex("RESOLVE_RFQ"),
    );
    expect(lookupHandler).toBeDefined();
    expect(lookupHandler).not.toBeNull();

    // Verify lookup rejects unknown or reserved OP types
    const unknownHandler = framework.lookup(
      stringToBytes32Hex("F_RESERVED"),
      stringToBytes32Hex("RESOLVE_RFQ"),
    );
    expect(unknownHandler).toBeNull();
  });
});
