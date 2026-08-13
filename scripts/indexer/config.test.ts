import { describe, expect, it } from "vitest";

import { coston2Deployment } from "../../packages/protocol/src/deployments/coston2.js";
import { parseDeploymentManifest } from "../../packages/protocol/src/deployment.js";
import {
  IndexerConfigError,
  parseIndexerConfig,
} from "../../services/indexer/src/config.js";

const databaseUrl = "postgresql://hushflow:local@127.0.0.1:5432/hushflow";

describe("parseIndexerConfig", () => {
  it("creates bounded fixture configuration while deployment is pending", () => {
    const config = parseIndexerConfig(
      {
        INDEXER_MODE: "fixture",
        DATABASE_URL: databaseUrl,
        INDEXER_FIXTURE_PATH: "fixtures/local-events.json",
        INDEXER_SOURCE_IDENTITY: "local-demo-v1",
      },
      coston2Deployment,
    );

    expect(config).toEqual({
      mode: "fixture",
      fixturePath: "fixtures/local-events.json",
      sourceIdentity: "local-demo-v1",
      databaseUrl,
      port: 8787,
      batchSize: 250,
      finalityWindow: 64,
      pollIntervalMs: 3_000,
    });
  });

  it("accepts bounded explicit numeric settings", () => {
    const config = parseIndexerConfig(
      {
        INDEXER_MODE: "fixture",
        DATABASE_URL: databaseUrl,
        INDEXER_FIXTURE_PATH: "fixtures/local-events.json",
        INDEXER_SOURCE_IDENTITY: "local-demo-v1",
        INDEXER_API_PORT: "9090",
        INDEXER_BATCH_SIZE: "1000",
        INDEXER_FINALITY_WINDOW: "128",
        INDEXER_POLL_INTERVAL_MS: "15000",
      },
      coston2Deployment,
    );

    expect(config.port).toBe(9090);
    expect(config.batchSize).toBe(1_000);
    expect(config.finalityWindow).toBe(128);
    expect(config.pollIntervalMs).toBe(15_000);
  });

  it.each([
    ["INDEXER_MODE", "unknown"],
    ["DATABASE_URL", ""],
    ["INDEXER_API_PORT", "0"],
    ["INDEXER_API_PORT", "65536"],
    ["INDEXER_BATCH_SIZE", "1001"],
    ["INDEXER_FINALITY_WINDOW", "7"],
    ["INDEXER_POLL_INTERVAL_MS", "999"],
  ])("rejects invalid %s without reflecting its value", (key, value) => {
    const env = {
      INDEXER_MODE: "fixture",
      DATABASE_URL: databaseUrl,
      INDEXER_FIXTURE_PATH: "fixtures/local-events.json",
      INDEXER_SOURCE_IDENTITY: "local-demo-v1",
      [key]: value,
    };

    expect(() => parseIndexerConfig(env, coston2Deployment)).toThrow(
      IndexerConfigError,
    );

    try {
      parseIndexerConfig(env, coston2Deployment);
    } catch (error) {
      expect(error).toBeInstanceOf(IndexerConfigError);
      expect((error as Error).message).not.toContain(value || databaseUrl);
    }
  });

  it.each([
    { DATABASE_URL: databaseUrl },
    { INDEXER_MODE: "fixture", DATABASE_URL: databaseUrl },
    {
      INDEXER_MODE: "fixture",
      DATABASE_URL: databaseUrl,
      INDEXER_FIXTURE_PATH: "fixtures/local-events.json",
    },
  ])("requires explicit mode, fixture path, and source identity", (env) => {
    expect(() => parseIndexerConfig(env, coston2Deployment)).toThrowError(
      "INDEXER_CONFIG_INVALID",
    );
  });

  it("fails closed when live mode receives a pending manifest", () => {
    expect(() =>
      parseIndexerConfig(
        {
          INDEXER_MODE: "live",
          DATABASE_URL: databaseUrl,
          INDEXER_SOURCE_IDENTITY: "coston2-rpc",
        },
        coston2Deployment,
      ),
    ).toThrowError("INDEXER_DEPLOYMENT_NOT_LIVE");
  });

  it("accepts live mode only with verified deployment evidence", () => {
    const live = parseDeploymentManifest({
      schemaVersion: coston2Deployment.schemaVersion,
      network: coston2Deployment.network,
      chainId: coston2Deployment.chainId,
      rpcUrl: coston2Deployment.rpcUrl,
      explorerUrl: coston2Deployment.explorerUrl,
      abiHash: coston2Deployment.abiHash,
      generatedAt: coston2Deployment.generatedAt,
      status: "live",
      contracts: {
        fxrp: "0x1111111111111111111111111111111111111111",
        usdt0: "0x2222222222222222222222222222222222222222",
        teeExtensionRegistry: "0x3333333333333333333333333333333333333333",
        teeMachineRegistry: "0x4444444444444444444444444444444444444444",
      },
      deployedAt: "2026-08-12T12:00:00.000Z",
      hushFlowRfq: "0x9999999999999999999999999999999999999999",
      extensionId:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      teeSigner: "0x5555555555555555555555555555555555555555",
      deploymentBlock: "123456",
      deploymentTransactionHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      runtimeCodeHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    });

    const config = parseIndexerConfig(
      {
        INDEXER_MODE: "live",
        DATABASE_URL: databaseUrl,
        INDEXER_SOURCE_IDENTITY: "coston2-rpc",
      },
      live,
    );

    expect(config.mode).toBe("live");
    if (config.mode !== "live") throw new Error("EXPECTED_LIVE_CONFIG");
    expect(config.deployment).toBe(live);
    expect(config.sourceIdentity).toBe("coston2-rpc");
  });
});
