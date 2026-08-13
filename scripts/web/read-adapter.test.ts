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

    await expect(loadReadModel("/metadata", async () => response)).rejects.toEqual(
      new ReadModelError("READ_INVALID"),
    );
    await expect(loadReadModel("/not-a-read-route", async () => response)).rejects.toEqual(
      new ReadModelError("READ_INVALID"),
    );
  });
});
