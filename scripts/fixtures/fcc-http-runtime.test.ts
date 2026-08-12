import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";
import type { Hex } from "viem";
import { bytesToHex, stringToHex } from "viem";

import {
  decodeResultDataV1,
  encodeResolutionInstructionV1,
  type ResolutionInstructionV1,
} from "../../packages/protocol/src/fcc.js";
import {
  createFccHttpServer,
  type FccHttpServer,
} from "../../services/fcc-extension/src/http-runtime.js";

const ACTION_ID = `0x${"a".repeat(64)}` as Hex;
const TEE_ID = `0x${"b".repeat(40)}` as Hex;
const CONTRACT = `0x${"1".repeat(40)}` as Hex;
const SELLER = `0x${"2".repeat(40)}` as Hex;
const PROVIDER = `0x${"3".repeat(40)}` as Hex;

const instruction: ResolutionInstructionV1 = {
  schemaVersion: 1,
  chainId: 114n,
  contractAddress: CONTRACT,
  rfqId: 42n,
  seller: SELLER,
  sellerCiphertext: "0xaa",
  quoteCap: 120_000_000n,
  providers: [PROVIDER],
  quoteCiphertexts: ["0xbb"],
  resolutionDeadline: 1_900_000_500n,
};

function bytes32(value: string): Hex {
  return stringToHex(value, { size: 32 });
}

function actionBody(opType = "HUSHFLOW", opCommand = "RESOLVE_RFQ") {
  const fixed = {
    instructionId: ACTION_ID,
    teeId: TEE_ID,
    timestamp: 1_900_000_000,
    rewardEpochId: 1,
    opType: bytes32(opType),
    opCommand: bytes32(opCommand),
    cosigners: [],
    cosignersThreshold: 0,
    originalMessage: encodeResolutionInstructionV1(instruction),
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

const openServers: FccHttpServer[] = [];

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()));
});

async function startServer() {
  const plaintexts: Record<string, unknown> = {
    "0xaa": {
      schemaVersion: 1,
      chainId: "114",
      contractAddress: CONTRACT,
      rfqId: "42",
      sender: SELLER,
      payloadKind: "SELLER_MINIMUM",
      value: "94000000",
      payloadNonce: `0x${"1".repeat(64)}`,
    },
    "0xbb": {
      schemaVersion: 1,
      chainId: "114",
      contractAddress: CONTRACT,
      rfqId: "42",
      sender: PROVIDER,
      payloadKind: "PROVIDER_QUOTE",
      value: "97000000",
      payloadNonce: `0x${"2".repeat(64)}`,
    },
  };
  const server = createFccHttpServer({
    decryptEnvelope: async (ciphertext) => plaintexts[ciphertext],
    createResultNonce: () => `0x${"3".repeat(64)}`,
  });
  openServers.push(server);
  await server.listen(0, "127.0.0.1");
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe("FCC extension HTTP runtime", () => {
  it("returns the normative ActionResult shape for POST /action", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(actionBody()),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toEqual({
      id: ACTION_ID,
      submissionTag: "submit",
      status: 1,
      log: "ok",
      opType: bytes32("HUSHFLOW"),
      opCommand: bytes32("RESOLVE_RFQ"),
      additionalResultStatus: "0x",
      version: "0.1.0",
      data: expect.stringMatching(/^0x/),
    });
    expect(decodeResultDataV1(result.data as Hex).winningQuote).toBe(97_000_000n);
  });

  it("implements state and method/path status contracts", async () => {
    const baseUrl = await startServer();

    expect((await fetch(`${baseUrl}/state`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/action`)).status).toBe(405);
    expect((await fetch(`${baseUrl}/state`, { method: "POST" })).status).toBe(405);
    expect((await fetch(`${baseUrl}/missing`)).status).toBe(404);
  });

  it("returns 400 for invalid wire data and 501 for unsupported routing", async () => {
    const baseUrl = await startServer();
    const invalid = await fetch(`${baseUrl}/action`, { method: "POST", body: "{" });
    const unsupported = await fetch(`${baseUrl}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(actionBody("OTHER", "OTHER")),
    });

    expect(invalid.status).toBe(400);
    expect(unsupported.status).toBe(501);
  });
});
