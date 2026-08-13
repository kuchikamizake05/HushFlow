import { describe, expect, it } from "vitest";

import { demoSteps } from "../../apps/web/src/demo/journey.js";

describe("M4B judge demo", () => {
  it("labels the guided journey as fixture-only and avoids fabricated transaction evidence", () => {
    expect(demoSteps.map((step) => step.title)).toEqual([
      "Create",
      "Quote",
      "Resolve",
      "Inspect proof",
    ]);
    expect(JSON.stringify(demoSteps)).toMatch(/fixture/i);
    expect(JSON.stringify(demoSteps)).not.toMatch(
      /0x[a-f0-9]{64}|transaction hash/i,
    );
  });
});
