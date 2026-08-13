import { describe, expect, it } from "vitest";

import {
  ReadModelError,
  loadReadModel,
} from "../../apps/web/src/adapters/m4a.js";
import { fixtureReadModel } from "../../apps/web/src/adapters/fixture.js";

describe("M4B read adapter", () => {
  it("labels its local model as fixture data", () => {
    expect(fixtureReadModel.metadata()).toEqual({
      mode: "fixture",
      sourceId: "m4b-local-v1",
    });
  });

  it("rejects unavailable upstream reads with a coarse code", async () => {
    const badFetcher = async () => {
      throw new Error("connection details must stay server-side");
    };

    await expect(loadReadModel("/metadata", badFetcher)).rejects.toEqual(
      new ReadModelError("READ_UNAVAILABLE"),
    );
  });

  it("rejects missing provenance and disallowed paths", async () => {
    const response = new Response(JSON.stringify({ schemaVersion: 1 }), {
      status: 200,
    });

    await expect(
      loadReadModel("/metadata", async () => response),
    ).rejects.toEqual(new ReadModelError("READ_INVALID"));
    await expect(
      loadReadModel("/not-a-read-route", async () => response),
    ).rejects.toEqual(new ReadModelError("READ_INVALID"));
  });

  it("handles valid metadata and coarse upstream failures", async () => {
    await expect(
      loadReadModel(
        "/metadata",
        async () =>
          new Response(
            JSON.stringify({ mode: "live", sourceId: "coston2-indexer" }),
          ),
      ),
    ).resolves.toEqual({ mode: "live", sourceId: "coston2-indexer" });
    await expect(
      loadReadModel("/rfqs", async () => new Response("bad", { status: 503 })),
    ).rejects.toEqual(new ReadModelError("READ_UNAVAILABLE"));
    await expect(
      loadReadModel("/rfqs", async () => new Response("not json")),
    ).rejects.toEqual(new ReadModelError("READ_INVALID"));
    await expect(
      loadReadModel("/rfqs", async () => new Response("null")),
    ).rejects.toEqual(new ReadModelError("READ_INVALID"));
    await expect(
      loadReadModel(
        "/rfqs",
        async (path) =>
          new Response(
            JSON.stringify(
              path === "/metadata"
                ? { mode: "live", sourceId: "coston2-indexer" }
                : { items: [] },
            ),
          ),
      ),
    ).resolves.toEqual({ items: [] });
  });

  it("requires valid provenance before a downstream read", async () => {
    const paths: string[] = [];
    const fetcher = async (path: string) => {
      paths.push(path);
      return path === "/metadata"
        ? new Response(JSON.stringify({ mode: "fixture", sourceId: "local" }))
        : new Response(JSON.stringify({ items: [] }));
    };

    await expect(loadReadModel("/rfqs", fetcher)).resolves.toEqual({
      items: [],
    });
    expect(paths).toEqual(["/metadata", "/rfqs"]);
  });

  it("uses frozen shared schemas for deployment and health", async () => {
    const metadata = { mode: "live", sourceId: "coston2-indexer" };
    await expect(
      loadReadModel(
        "/deployment",
        async (path) =>
          new Response(
            JSON.stringify(
              path === "/metadata"
                ? metadata
                : {
                    schemaVersion: 1,
                    network: "coston2",
                    chainId: 114,
                    status: "pending",
                    blockingReason: "FCC_ORGANIZER_ACCESS",
                    updatedAt: "2026-08-13T10:00:00.000Z",
                  },
            ),
          ),
      ),
    ).resolves.toMatchObject({ status: "pending" });

    await expect(
      loadReadModel(
        "/health",
        async (path) =>
          new Response(
            JSON.stringify(
              path === "/metadata"
                ? metadata
                : {
                    schemaVersion: 1,
                    status: "degraded",
                    chainId: 114,
                    latestIndexedBlock: "1",
                    latestObservedBlock: "2",
                    lagBlocks: "1",
                    checkedAt: "2026-08-13T10:00:00.000Z",
                    detailCode: "REORG_REPLAY_REQUIRED",
                  },
            ),
          ),
      ),
    ).resolves.toMatchObject({ detailCode: "REORG_REPLAY_REQUIRED" });
  });
});
