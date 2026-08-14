import { describe, expect, it } from "vitest";

import { buildDemoCliReport } from "../coston2/demo-cli.js";
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
    expect(
      buildDemoReadiness(liveInput).actions.map((action) => action.id),
    ).toEqual([
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
    ).toMatchObject({
      state: "INVALID",
      reasons: ["SCENARIO_WALLETS_NOT_DISTINCT"],
    });
    expect(
      buildDemoReadiness({
        ...liveInput,
        requirements: { ...requirements, FCC_EXT_PROXY_URL: false },
      }),
    ).toMatchObject({
      state: "BLOCKED",
      reasons: ["MISSING:FCC_EXT_PROXY_URL"],
    });
  });

  it("serializes only the public allowlist", () => {
    const secret = "never-serialize-this-private-key";
    const readiness = buildDemoReadiness({
      ...liveInput,
      ignoredSecret: secret,
    });

    expect(JSON.stringify(readiness)).not.toContain(secret);
    expect(JSON.stringify(readiness)).not.toMatch(/private|secret/i);
  });

  it("prints a sanitized blocked CLI report without environment setup", () => {
    const secret = "never-print-this-private-key";
    const result = buildDemoCliReport({
      HUSHFLOW_DEPLOYER_PRIVATE_KEY: secret,
    });

    expect(result).toMatchObject({ state: "BLOCKED" });
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("reports malformed public CLI input without echoing it", () => {
    const malformed = "not-an-address";
    const result = buildDemoCliReport({ HUSHFLOW_SELLER_ADDRESS: malformed });

    expect(result).toMatchObject({ state: "INVALID" });
    expect(JSON.stringify(result)).not.toContain(malformed);
  });

  it("considers FCC_INDEXER_ACCESS present only when all 5 FCC_INDEXER_DB_* fields are non-empty", () => {
    const fullEnv: NodeJS.ProcessEnv = {
      HUSHFLOW_SELLER_ADDRESS: ADDRESS.seller,
      HUSHFLOW_PROVIDER_A_ADDRESS: ADDRESS.providerA,
      HUSHFLOW_PROVIDER_B_ADDRESS: ADDRESS.providerB,
      COSTON2_RPC_URL: "https://coston2-api.flare.network/ext/C/rpc",
      FCC_EXT_PROXY_URL: "https://fcc.hushflow.dev",
      FCC_TEE_EXTENSION_REGISTRY: "0x1111111111111111111111111111111111111111",
      FCC_TEE_MACHINE_REGISTRY: "0x2222222222222222222222222222222222222222",
      FCC_TEE_SIGNER: "0x3333333333333333333333333333333333333333",
      FCC_INDEXER_DB_HOST: "34.38.42.208",
      FCC_INDEXER_DB_PORT: "3306",
      FCC_INDEXER_DB_NAME: "indexer",
      FCC_INDEXER_DB_USER: "hackathon_user_58",
      FCC_INDEXER_DB_PASSWORD: "secret-password",
    };

    const readyReport = buildDemoCliReport(fullEnv);
    const indexerReq = readyReport.requirements.find(
      (r) => r.name === "FCC_INDEXER_ACCESS",
    );
    expect(indexerReq?.present).toBe(true);

    // Missing password
    const missingPasswordEnv = { ...fullEnv, FCC_INDEXER_DB_PASSWORD: "" };
    const blockedReport = buildDemoCliReport(missingPasswordEnv);
    const blockedIndexerReq = blockedReport.requirements.find(
      (r) => r.name === "FCC_INDEXER_ACCESS",
    );
    expect(blockedIndexerReq?.present).toBe(false);
    expect(blockedReport.reasons).toContain("MISSING:FCC_INDEXER_DB_PASSWORD");
    expect(JSON.stringify(blockedReport)).not.toContain("secret-password");
  });
});

