import { createPublicClient, http } from "viem";

import { coston2Deployment } from "@hushflow/protocol/deployments/coston2";

import { parseIndexerConfig } from "../config.js";
import { IndexerStore } from "../db/store.js";
import { publicErrorCode } from "../error-code.js";
import { createMigratedPool } from "../runtime.js";
import { runWorkerCycle } from "./run.js";
import {
  loadFixtureChainSource,
  ViemChainSource,
  type RpcReader,
} from "./source.js";

async function main(): Promise<void> {
  const config = parseIndexerConfig(process.env, coston2Deployment);
  const pool = await createMigratedPool(config.databaseUrl);
  const store = new IndexerStore(pool);
  const source =
    config.mode === "fixture"
      ? await loadFixtureChainSource(
          process.env.INDEXER_FIXTURE_PATH ??
            "packages/protocol/fixtures/v1/events.json",
        )
      : new ViemChainSource(
          createPublicClient({
            transport: http(config.deployment.rpcUrl, { timeout: 10_000 }),
          }) as unknown as RpcReader,
          {
            chainId: config.deployment.chainId,
            contractAddress: config.deployment.hushFlowRfq,
            deploymentBlock: config.deployment.deploymentBlock,
          },
        );

  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  while (!stopping) {
    try {
      await runWorkerCycle(config, store, source);
    } catch {
      // Public health state is updated by the worker/store boundary.
    }
    if (!stopping) {
      await new Promise((resolve) =>
        setTimeout(resolve, config.pollIntervalMs),
      );
    }
  }
  await pool.end();
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${publicErrorCode(error, "INDEXER_WORKER_START_FAILED")}\n`,
  );
  process.exitCode = 1;
});
