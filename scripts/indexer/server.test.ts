import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { createReadApiServer } from "../../services/indexer/src/api/server.js";

const servers: Array<ReturnType<typeof createReadApiServer>> = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
});

describe("Node read API server adapter", () => {
  it("serves Fetch responses over a real local HTTP socket", async () => {
    const server = createReadApiServer(async (request) =>
      Response.json({
        method: request.method,
        path: new URL(request.url).pathname,
      }),
    );
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ method: "GET", path: "/health" });
  });

  it("returns a redacted 500 response when the handler rejects", async () => {
    const server = createReadApiServer(async () => {
      throw new Error("PRIVATE_MARKER_42");
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/stats`);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "INTERNAL_ERROR" });
  });
});
