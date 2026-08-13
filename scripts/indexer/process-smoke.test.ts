import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { coston2Deployment } from "../../packages/protocol/src/deployments/coston2.js";
import { ReadRepository } from "../../services/indexer/src/api/repository.js";
import { createReadApiHandler } from "../../services/indexer/src/api/router.js";
import { createReadApiServer } from "../../services/indexer/src/api/server.js";
import type { IndexerConfig } from "../../services/indexer/src/config.js";
import { createIndexerPool } from "../../services/indexer/src/db/pool.js";
import { IndexerStore } from "../../services/indexer/src/db/store.js";
import { createMigratedPool } from "../../services/indexer/src/runtime.js";
import { runWorkerCycle } from "../../services/indexer/src/worker/run.js";
import { loadFixtureChainSource } from "../../services/indexer/src/worker/source.js";

const baseUrl =
  process.env.HUSHFLOW_TEST_DATABASE_URL ??
  "postgresql://hushflow:hushflow-local-only@127.0.0.1:5432/hushflow";
const schema = `m4a_smoke_${process.pid}`;
const admin = createIndexerPool({ connectionString: baseUrl, max: 1 });
let pool: Awaited<ReturnType<typeof createMigratedPool>>;
let server: ReturnType<typeof createReadApiServer>;
let apiBase = "";

beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  const connection = new URL(baseUrl);
  connection.searchParams.set("options", `-c search_path=${schema}`);
  pool = await createMigratedPool(connection.toString());

  const source = await loadFixtureChainSource(
    "packages/protocol/fixtures/v1/events.json",
  );
  const store = new IndexerStore(pool);
  const config: IndexerConfig = {
    mode: "fixture",
    fixturePath: "packages/protocol/fixtures/v1/events.json",
    sourceIdentity: "process-smoke-v1",
    databaseUrl: connection.toString(),
    port: 0,
    batchSize: 3,
    finalityWindow: 64,
    pollIntervalMs: 3_000,
  };
  while ((await runWorkerCycle(config, store, source)).ingested) {
    // Consume bounded fixture ranges until the worker reaches its head.
  }

  const repository = new ReadRepository(pool, { chainId: 114 });
  server = createReadApiServer(
    createReadApiHandler(repository, coston2Deployment),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  apiBase = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});

describe("worker and API process smoke", () => {
  it("serves a settled RFQ after bounded fixture ingestion", async () => {
    const response = await fetch(`${apiBase}/rfqs`);
    const body = (await response.json()) as {
      items: Array<{ rfqId: string; status: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.items).toEqual([
      expect.objectContaining({ rfqId: "1", status: "SETTLED" }),
    ]);
  });

  it("keeps deployment honest and blocks token-dependent portfolio", async () => {
    const deployment = await fetch(`${apiBase}/deployment`);
    const portfolio = await fetch(
      `${apiBase}/wallets/0x1111111111111111111111111111111111111111/portfolio`,
    );

    expect(await deployment.json()).toMatchObject({ status: "pending" });
    expect(portfolio.status).toBe(503);
    expect(await portfolio.json()).toEqual({ error: "DEPLOYMENT_NOT_LIVE" });
  });
});
