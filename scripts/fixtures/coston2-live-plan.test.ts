import { describe, expect, it } from "vitest";

import {
  buildLiveScenarioPlan,
  parseDeploymentConfig,
} from "../coston2/live-plan.js";
import { executeLiveScenario } from "../coston2/live-runner.js";

const ADDRESS = {
  contract: "0x1111111111111111111111111111111111111111",
  fxrp: "0x0b6A3645c240605887a5532109323A3E12273dc7",
  machineRegistry: "0x2222222222222222222222222222222222222222",
  providerA: "0x3333333333333333333333333333333333333333",
  providerB: "0x4444444444444444444444444444444444444444",
  seller: "0x5555555555555555555555555555555555555555",
  teeRegistry: "0x6666666666666666666666666666666666666666",
  teeSigner: "0x7777777777777777777777777777777777777777",
  usdt0: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
};

describe("Coston2 live deployment configuration", () => {
  it("accepts only Coston2 and defaults to dry-run", () => {
    const config = parseDeploymentConfig({
      COSTON2_EXPECTED_CHAIN_ID: "114",
      COSTON2_EXPECTED_FXRP: ADDRESS.fxrp,
      COSTON2_EXPECTED_USDT0: ADDRESS.usdt0,
      FCC_TEE_EXTENSION_REGISTRY: ADDRESS.teeRegistry,
      FCC_TEE_MACHINE_REGISTRY: ADDRESS.machineRegistry,
      FCC_TEE_SIGNER: ADDRESS.teeSigner,
    });

    expect(config.chainId).toBe(114);
    expect(config.broadcastApproved).toBe(false);
    expect(JSON.stringify(config)).not.toMatch(/private|secret|authtoken/i);
  });

  it("rejects wrong chains, missing addresses, and casual broadcast enablement", () => {
    expect(() =>
      parseDeploymentConfig({ COSTON2_EXPECTED_CHAIN_ID: "14" }),
    ).toThrow("COSTON2_CHAIN_REQUIRED");
    expect(() =>
      parseDeploymentConfig({ COSTON2_EXPECTED_CHAIN_ID: "114" }),
    ).toThrow("DEPLOYMENT_ADDRESS_MISSING");
    expect(() =>
      parseDeploymentConfig({
        COSTON2_EXPECTED_CHAIN_ID: "114",
        COSTON2_EXPECTED_FXRP: ADDRESS.fxrp,
        COSTON2_EXPECTED_USDT0: ADDRESS.usdt0,
        FCC_TEE_EXTENSION_REGISTRY: ADDRESS.teeRegistry,
        FCC_TEE_MACHINE_REGISTRY: ADDRESS.machineRegistry,
        FCC_TEE_SIGNER: ADDRESS.teeSigner,
        HUSHFLOW_BROADCAST_APPROVED: "yes",
      }),
    ).toThrow("BROADCAST_APPROVAL_INVALID");
  });
});

describe("Coston2 three-wallet scenario plan", () => {
  it("orders seller, two-provider, FCC, and claim actions deterministically", () => {
    const plan = buildLiveScenarioPlan({
      contractAddress: ADDRESS.contract,
      seller: ADDRESS.seller,
      providerA: ADDRESS.providerA,
      providerB: ADDRESS.providerB,
      lotAmount: 10_000_000n,
      quoteCap: 120_000_000n,
    });

    expect(plan.actions.map((action) => action.kind)).toEqual([
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
    expect(plan.classification).toBe("CONTROLLED_TESTNET_ACTIVITY");
  });

  it("rejects reused wallets and invalid amounts", () => {
    expect(() =>
      buildLiveScenarioPlan({
        contractAddress: ADDRESS.contract,
        seller: ADDRESS.seller,
        providerA: ADDRESS.seller,
        providerB: ADDRESS.providerB,
        lotAmount: 10_000_000n,
        quoteCap: 120_000_000n,
      }),
    ).toThrow("SCENARIO_WALLETS_NOT_DISTINCT");
    expect(() =>
      buildLiveScenarioPlan({
        contractAddress: ADDRESS.contract,
        seller: ADDRESS.seller,
        providerA: ADDRESS.providerA,
        providerB: ADDRESS.providerB,
        lotAmount: 0n,
        quoteCap: 120_000_000n,
      }),
    ).toThrow("SCENARIO_AMOUNT_INVALID");
  });

  it("executes actions sequentially and records only public evidence", async () => {
    const calls: string[] = [];
    const plan = buildLiveScenarioPlan({
      contractAddress: ADDRESS.contract,
      seller: ADDRESS.seller,
      providerA: ADDRESS.providerA,
      providerB: ADDRESS.providerB,
      lotAmount: 10_000_000n,
      quoteCap: 120_000_000n,
    });

    const evidence = await executeLiveScenario(plan, async (action) => {
      calls.push(action.kind);
      return `0x${calls.length.toString(16).padStart(64, "0")}`;
    });

    expect(calls).toEqual(plan.actions.map((action) => action.kind));
    expect(evidence).toHaveLength(plan.actions.length);
    expect(JSON.stringify(evidence)).not.toMatch(/private|secret|quotePlaintext/i);
  });

  it("stops immediately when an action fails", async () => {
    const calls: string[] = [];
    const plan = buildLiveScenarioPlan({
      contractAddress: ADDRESS.contract,
      seller: ADDRESS.seller,
      providerA: ADDRESS.providerA,
      providerB: ADDRESS.providerB,
      lotAmount: 10_000_000n,
      quoteCap: 120_000_000n,
    });

    await expect(
      executeLiveScenario(plan, async (action) => {
        calls.push(action.kind);
        if (action.kind === "SUBMIT_QUOTE_A") {
          throw new Error("SIMULATED_FAILURE");
        }
        return `0x${calls.length.toString(16).padStart(64, "0")}`;
      }),
    ).rejects.toThrow("SCENARIO_ACTION_FAILED:SUBMIT_QUOTE_A");
    expect(calls).toEqual([
      "APPROVE_FXRP",
      "CREATE_RFQ",
      "APPROVE_USDT0_A",
      "SUBMIT_QUOTE_A",
    ]);
  });
});
