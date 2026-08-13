import { describe, expect, it } from "vitest";

import { getWriteGuard } from "../../apps/web/src/writes/preflight.js";

describe("M4B write guard", () => {
  const ready = {
    mode: "live" as const,
    deployment: "live" as const,
    chainId: 114,
    contractCode: "present" as const,
    rpc: "ready" as const,
    wallet: "connected" as const,
  };

  it("fails closed for pending deployment, a wrong chain, missing code, or wallet", () => {
    expect(
      getWriteGuard({ ...ready, deployment: "pending" }),
    ).toEqual({ enabled: false, reason: "DEPLOYMENT_PENDING" });
    expect(
      getWriteGuard({ ...ready, chainId: 1 }),
    ).toEqual({ enabled: false, reason: "COSTON2_CHAIN_REQUIRED" });
    expect(getWriteGuard({ ...ready, contractCode: "missing" })).toEqual({
      enabled: false,
      reason: "CONTRACT_CODE_REQUIRED",
    });
    expect(getWriteGuard({ ...ready, wallet: "unavailable" })).toEqual({
      enabled: false,
      reason: "WALLET_CONNECTION_REQUIRED",
    });
  });

  it("requires a fresh direct RPC preflight and exact ready facts", () => {
    expect(
      getWriteGuard({ ...ready, rpc: "unavailable" }),
    ).toEqual({ enabled: false, reason: "RPC_PREFLIGHT_REQUIRED" });
    expect(getWriteGuard(ready)).toEqual({ enabled: true, state: "READY" });
  });
});
