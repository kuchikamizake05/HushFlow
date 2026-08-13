import { describe, expect, it } from "vitest";

import {
  buildDemoReadiness,
  demoRequirementNames,
} from "../coston2/demo-readiness.js";

const ADDRESS = {
  providerA: "0x3333333333333333333333333333333333333333",
  providerB: "0x4444444444444444444444444444444444444444",
  seller: "0x5555555555555555555555555555555555555555",
};

const requirements = Object.fromEntries(
  demoRequirementNames.map((name) => [name, true]),
) as Record<(typeof demoRequirementNames)[number], boolean>;

const liveInput = {
  deployment: { status: "live" as const },
  seller: ADDRESS.seller,
  providerA: ADDRESS.providerA,
  providerB: ADDRESS.providerB,
  requirements,
};

describe("M5 demo readiness", () => {
  it("blocks a pending deployment before listing live action readiness", () => {
    expect(
      buildDemoReadiness({
        ...liveInput,
        deployment: {
          status: "pending",
          blockingReason: "FCC_ORGANIZER_ACCESS",
        },
      }),
    ).toMatchObject({
      state: "BLOCKED",
      reasons: ["FCC_ORGANIZER_ACCESS"],
    });
  });

  it("uses the deterministic seller, provider, FCC, and claim action order", () => {
    expect(buildDemoReadiness(liveInput).actions.map((action) => action.id)).toEqual([
      "APPROVE_FXRP",
      "CREATE_RFQ",
      "APPROVE_USDT0_A",
      "SUBMIT_QUOTE_A",
      "APPROVE_USDT0_B",
      "SUBMIT_QUOTE_B",
      "REQUEST_RESOLUTION",
      "SUBMIT_RESULT",
      "CLAIM_SELLER",
      "CLAIM_PROVIDER_A",
      "CLAIM_PROVIDER_B",
    ]);
  });

  it("fails closed for invalid public wallets and missing requirements", () => {
    expect(
      buildDemoReadiness({ ...liveInput, providerA: ADDRESS.seller }),
    ).toMatchObject({ state: "INVALID", reasons: ["SCENARIO_WALLETS_NOT_DISTINCT"] });
    expect(
      buildDemoReadiness({
        ...liveInput,
        requirements: { ...requirements, FCC_EXT_PROXY_URL: false },
      }),
    ).toMatchObject({ state: "BLOCKED", reasons: ["MISSING:FCC_EXT_PROXY_URL"] });
  });

  it("serializes only the public allowlist", () => {
    const secret = "never-serialize-this-private-key";
    const readiness = buildDemoReadiness({ ...liveInput, ignoredSecret: secret });

    expect(JSON.stringify(readiness)).not.toContain(secret);
    expect(JSON.stringify(readiness)).not.toMatch(/private|secret/i);
  });
});
