import { coston2Deployment } from "@hushflow/protocol/deployments/coston2";

import { parseIndexerConfig } from "../config.js";
import { publicErrorCode } from "../error-code.js";
import { createMigratedPool } from "../runtime.js";
import { ReadRepository } from "./repository.js";
import { createReadApiHandler } from "./router.js";
import { createReadApiServer } from "./server.js";

async function main(): Promise<void> {
  const config = parseIndexerConfig(process.env, coston2Deployment);
  const pool = await createMigratedPool(config.databaseUrl);
  const tokens =
    config.mode === "live"
      ? {
          fxrpToken: config.deployment.contracts.fxrp,
          usdt0Token: config.deployment.contracts.usdt0,
        }
      : {};
  const repository = new ReadRepository(pool, {
    chainId: coston2Deployment.chainId,
    ...tokens,
  });
  const server = createReadApiServer(
    createReadApiHandler(repository, coston2Deployment),
  );
  server.listen(config.port, "0.0.0.0");

  const shutdown = () => {
    server.close(() => {
      void pool.end().finally(() => process.exit(0));
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${publicErrorCode(error, "INDEXER_API_START_FAILED")}\n`,
  );
  process.exitCode = 1;
});
