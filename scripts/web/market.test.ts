import { describe, expect, it } from "vitest";

import {
  fixtureMarket,
  getMarketPresentation,
} from "../../apps/web/src/market/presentation.js";

describe("M4B market presentation", () => {
  it("labels discovery cards as local fixtures and omits ciphertext", () => {
    const presentation = getMarketPresentation(fixtureMarket);
    expect(presentation.label).toBe("Local fixture data");
    expect(presentation.items[0]).toEqual({ rfqId: "1", status: "OPEN" });
    expect(JSON.stringify(presentation)).not.toMatch(
      /ciphertext|minimum|quote/i,
    );
  });
});
