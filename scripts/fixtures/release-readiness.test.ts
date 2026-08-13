import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { operationalDrills } from "../release/operational-drills.js";

const runScanPreflight = (environment: Record<string, string> = {}) =>
  spawnSync("bash", ["scripts/setup/check-container-scan.sh"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { PATH: process.env.PATH, ...environment },
  });

describe("M6 release readiness", () => {
  it("defines every controlled failure drill without secret-bearing output", () => {
    expect(operationalDrills).toHaveLength(11);
    expect(operationalDrills.map((drill) => drill.id)).toEqual([
      "RPC_UNAVAILABLE",
      "RPC_FALLBACK",
      "FCC_RESULT_DELAYED",
      "EXTENSION_PROXY_UNAVAILABLE",
      "TUNNEL_RESTARTED",
      "FCC_REGISTRATION_EXPIRED",
      "INDEXER_LAGGING_OR_REBUILDING",
      "RESULT_RELAY_RETRY",
      "RESULT_EXPIRED",
      "HELPER_FUNDS_INSUFFICIENT",
      "CLAIM_TRANSFER_REVERTED_OR_TIMEOUT",
    ]);
    expect(JSON.stringify(operationalDrills)).not.toMatch(
      /private|secret|token/i,
    );
  });

  it("rejects unsafe scan inputs before invoking a scanner", () => {
    expect(runScanPreflight().status).toBe(1);
    expect(
      runScanPreflight({
        M6_CONTAINER_IMAGE: "registry.example/hushflow:latest",
      }).status,
    ).toBe(1);
    expect(
      runScanPreflight({
        M6_CONTAINER_IMAGE: `registry.example/hushflow@sha256:${"A".repeat(64)}`,
      }).status,
    ).toBe(1);
  });
});
