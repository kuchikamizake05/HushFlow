import { describe, expect, it, vi } from "vitest";

import { coston2Deployment } from "../../packages/protocol/src/deployments/coston2.js";
import { ReadRepositoryError } from "../../services/indexer/src/api/repository.js";
import { CursorError } from "../../services/indexer/src/api/cursor.js";
import {
  createReadApiHandler,
  type ReadApiRepository,
} from "../../services/indexer/src/api/router.js";

const SELLER = "0x1111111111111111111111111111111111111111";
const PROVIDER = "0x2222222222222222222222222222222222222222";
const HASH = `0x${"a".repeat(64)}`;

const summary = {
  schemaVersion: 1 as const,
  rfqId: "1",
  seller: SELLER,
  lotAmount: "1000000",
  quoteCap: "2500000",
  quoteDeadline: "1700000100",
  resolutionDeadline: "1700001900",
  status: "SETTLED" as const,
  providerCount: 1,
  winningProvider: PROVIDER,
  winningQuote: "2400000",
  actionId: HASH,
};

function repository(): ReadApiRepository {
  return {
    listRfqs: vi.fn(async () => ({
      schemaVersion: 1 as const,
      items: [summary],
      nextCursor: null,
    })),
    getRfqDetail: vi.fn(async () => ({
      schemaVersion: 1 as const,
      summary,
      sellerCiphertext: "0x1234",
      providers: [],
      activity: [],
    })),
    getRfqProof: vi.fn(async () => ({
      schemaVersion: 1 as const,
      rfqId: "1",
      sellerCiphertext: "0x1234",
      providerCiphertexts: [],
      actionId: HASH,
      outcome: null,
    })),
    getPortfolio: vi.fn(async (account: string) => ({
      schemaVersion: 1 as const,
      account,
      rfqs: [summary],
      claims: [],
    })),
    getStats: vi.fn(async () => ({
      schemaVersion: 1 as const,
      rfqCount: "1",
      openRfqCount: "0",
      settledRfqCount: "1",
      providerParticipationCount: "1",
      totalLotAmount: "1000000",
      settledQuoteAmount: "2400000",
      latestIndexedBlock: "123464",
      updatedAt: "2026-08-12T12:00:00.000Z",
    })),
    getHealth: vi.fn(async () => ({
      schemaVersion: 1 as const,
      status: "healthy" as const,
      chainId: 114 as const,
      latestIndexedBlock: "123464",
      latestObservedBlock: "123464",
      lagBlocks: "0",
      checkedAt: "2026-08-12T12:00:00.000Z",
    })),
    getMetadata: vi.fn(async () => ({
      mode: "fixture" as const,
      sourceId: "local-demo-v1",
    })),
  };
}

async function invoke(path: string, repo = repository(), method = "GET") {
  const handler = createReadApiHandler(repo, coston2Deployment);
  return handler(new Request(`http://localhost${path}`, { method }));
}

describe("M4A read-only HTTP API", () => {
  it.each([
    ["/deployment", "pending"],
    ["/health", "healthy"],
    ["/rfqs", 1],
    ["/rfqs/1", "1"],
    ["/rfqs/1/proof", "0x1234"],
    [`/wallets/${SELLER}/portfolio`, SELLER],
    ["/stats", "1"],
    ["/metadata", "local-demo-v1"],
  ])("serves GET %s", async (path, marker) => {
    const response = await invoke(path);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).toContain(String(marker));
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("passes bounded validated market filters to the repository", async () => {
    const repo = repository();
    const response = await invoke(
      `/rfqs?limit=20&status=SETTLED&seller=${SELLER}&provider=${PROVIDER}`,
      repo,
    );

    expect(response.status).toBe(200);
    expect(repo.listRfqs).toHaveBeenCalledWith({
      limit: 20,
      status: "SETTLED",
      seller: SELLER,
      provider: PROVIDER,
    });
  });

  it.each([
    "/rfqs?unknown=true",
    "/rfqs?limit=0",
    "/rfqs?limit=101",
    "/rfqs?status=SECRET",
    "/rfqs/not-a-number",
    "/wallets/not-an-address/portfolio",
  ])("rejects malformed request %s", async (path) => {
    const response = await invoke(path);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "REQUEST_INVALID" });
  });

  it("returns 404 for missing resources", async () => {
    const repo = repository();
    repo.getRfqDetail = vi.fn(async () => null);

    const response = await invoke("/rfqs/999", repo);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "NOT_FOUND" });
  });

  it("rejects state-changing HTTP methods", async () => {
    const response = await invoke("/rfqs", repository(), "POST");

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "METHOD_NOT_ALLOWED" });
  });

  it("redacts internal errors and sensitive values", async () => {
    const repo = repository();
    repo.getStats = vi.fn(async () => {
      throw new Error("PRIVATE_MARKER_42 postgresql://secret-host");
    });

    const response = await invoke("/stats", repo);
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(body).toBe('{"error":"INTERNAL_ERROR"}');
    expect(body).not.toContain("PRIVATE_MARKER_42");
    expect(body).not.toContain("postgresql");
  });

  it("reports unavailable deployment-dependent reads without inventing data", async () => {
    const repo = repository();
    repo.getPortfolio = vi.fn(async () => {
      throw new ReadRepositoryError("DEPLOYMENT_NOT_LIVE");
    });

    const response = await invoke(`/wallets/${SELLER}/portfolio`, repo);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "DEPLOYMENT_NOT_LIVE" });
  });

  it("maps malformed opaque cursors to stable 400 error", async () => {
    const repo = repository();
    repo.listRfqs = vi.fn(async () => {
      throw new CursorError();
    });
    const response = await invoke("/rfqs?cursor=not-canonical", repo);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_CURSOR" });
  });

  it("maps database outages to coarse 503 error", async () => {
    const repo = repository();
    repo.getStats = vi.fn(async () => {
      throw new ReadRepositoryError("DATABASE_UNAVAILABLE");
    });
    const response = await invoke("/stats", repo);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "DATABASE_UNAVAILABLE" });
  });
});
