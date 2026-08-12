import { describe, expect, it } from "vitest";

import {
  DeploymentNotLiveError,
  parseDeploymentManifest,
  requireLiveDeployment,
} from "../../packages/protocol/src/deployment.js";

const HASH_A = `0x${"a".repeat(64)}`;
const HASH_B = `0x${"b".repeat(64)}`;
const ADDRESS_A = "0x1111111111111111111111111111111111111111";
const ADDRESS_B = "0x2222222222222222222222222222222222222222";
const ADDRESS_C = "0x3333333333333333333333333333333333333333";
const ADDRESS_D = "0x4444444444444444444444444444444444444444";
const ADDRESS_E = "0x5555555555555555555555555555555555555555";

const pending = {
  schemaVersion: 1,
  status: "pending",
  network: "coston2",
  chainId: 114,
  rpcUrl: "https://coston2-api.flare.network/ext/C/rpc",
  explorerUrl: "https://coston2-explorer.flare.network",
  abiHash: HASH_A,
  generatedAt: "2026-08-12T10:00:00.000Z",
  blockingReason: "FCC_ORGANIZER_ACCESS",
  contracts: {
    fxrp: ADDRESS_A,
    usdt0: ADDRESS_B,
    teeExtensionRegistry: ADDRESS_C,
    teeMachineRegistry: ADDRESS_D,
  },
} as const;

const live = {
  schemaVersion: 1,
  status: "live",
  network: "coston2",
  chainId: 114,
  rpcUrl: pending.rpcUrl,
  explorerUrl: pending.explorerUrl,
  abiHash: HASH_A,
  generatedAt: pending.generatedAt,
  contracts: pending.contracts,
  deployedAt: "2026-08-12T11:00:00.000Z",
  hushFlowRfq: ADDRESS_E,
  extensionId: HASH_B,
  teeSigner: ADDRESS_A,
  deploymentBlock: "1234567",
  deploymentTransactionHash: HASH_A,
  runtimeCodeHash: HASH_B,
} as const;

describe("M3 deployment manifest", () => {
  it("parses an honest pending manifest and blocks wallet writes", () => {
    const parsed = parseDeploymentManifest(pending);

    expect(parsed.status).toBe("pending");
    expect(() => requireLiveDeployment(parsed)).toThrowError(
      DeploymentNotLiveError,
    );
    expect(() => requireLiveDeployment(parsed)).toThrowError(
      "DEPLOYMENT_NOT_LIVE",
    );
  });

  it("parses a complete live manifest and returns it from the write guard", () => {
    const parsed = parseDeploymentManifest(live);
    const activated = requireLiveDeployment(parsed);

    expect(activated.status).toBe("live");
    expect(activated.deploymentBlock).toBe(1_234_567n);
    expect(activated.hushFlowRfq).toBe(ADDRESS_E);
  });

  it.each([
    ["live-only address", { ...pending, hushFlowRfq: ADDRESS_E }],
    ["unknown field", { ...pending, madeUp: true }],
    ["wrong chain", { ...pending, chainId: 115 }],
    ["wrong network", { ...pending, network: "flare" }],
    ["unknown version", { ...pending, schemaVersion: 2 }],
    ["unknown reason", { ...pending, blockingReason: "WAITING" }],
    ["zero ABI hash", { ...pending, abiHash: `0x${"0".repeat(64)}` }],
  ])("rejects pending manifest with %s", (_label, input) => {
    expect(() => parseDeploymentManifest(input)).toThrow();
  });

  it.each([
    ["missing receipt", { ...live, deploymentTransactionHash: undefined }],
    ["unsafe block", { ...live, deploymentBlock: 1_234_567 }],
    ["zero contract", { ...live, hushFlowRfq: `0x${"0".repeat(40)}` }],
    ["zero extension", { ...live, extensionId: `0x${"0".repeat(64)}` }],
    ["extra pending reason", { ...live, blockingReason: "FCC_ORGANIZER_ACCESS" }],
  ])("rejects inconsistent live manifest with %s", (_label, input) => {
    expect(() => parseDeploymentManifest(input)).toThrow();
  });

  it("does not leak the manifest through the write-guard error", () => {
    try {
      requireLiveDeployment(parseDeploymentManifest(pending));
      throw new Error("expected guard to fail");
    } catch (error) {
      expect(String(error)).not.toContain(ADDRESS_A);
      expect(String(error)).not.toContain(pending.rpcUrl);
    }
  });
});
