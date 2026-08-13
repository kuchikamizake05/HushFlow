import { describe, expect, it } from "vitest";

import { getReadState } from "../../apps/web/src/feedback/read-state.js";

describe("M4B read states", () => {
  it("fails closed for untrusted provenance and recovery-required health", () => {
    expect(getReadState({ provenance: "missing", health: "healthy" })).toEqual({
      kind: "unavailable",
      message: "Read data is unavailable. Retry after the indexer is healthy.",
    });
    expect(
      getReadState({ provenance: "live", health: "reorg-replay-required" }),
    ).toEqual({
      kind: "unavailable",
      message: "Read data is recovering from a chain reorganization.",
    });
  });

  it("labels fixture and lagged data without treating it as transaction authority", () => {
    expect(getReadState({ provenance: "fixture", health: "healthy" })).toEqual({
      kind: "fixture",
      message: "Local fixture data",
    });
    expect(getReadState({ provenance: "live", health: "lagging" })).toEqual({
      kind: "degraded",
      message: "Indexed data is delayed.",
    });
  });
});
