import { describe, expect, it } from "vitest";

import { getWriteGuard } from "../../apps/web/src/writes/preflight.js";

describe("M4B write guard", () => {
  it("fails closed for fixture or missing deployment", () => {
    expect(
      getWriteGuard({ mode: "fixture", deployment: "live", rpc: "ready" }),
    ).toEqual({ enabled: false, reason: "LIVE_PREFLIGHT_REQUIRED" });
    expect(
      getWriteGuard({ mode: "live", deployment: "pending", rpc: "ready" }),
    ).toEqual({ enabled: false, reason: "LIVE_PREFLIGHT_REQUIRED" });
  });

  it("requires a fresh direct RPC preflight even against live data", () => {
    expect(
      getWriteGuard({ mode: "live", deployment: "live", rpc: "unavailable" }),
    ).toEqual({ enabled: false, reason: "LIVE_PREFLIGHT_REQUIRED" });
    expect(
      getWriteGuard({ mode: "live", deployment: "live", rpc: "ready" }),
    ).toEqual({ enabled: true });
  });
});
