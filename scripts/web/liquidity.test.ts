import { describe, expect, it } from "vitest";

import { getQuoteGuard } from "../../apps/web/src/liquidity/quote-guard.js";

describe("M4B Liquidity Desk", () => {
  it("keeps private quotes disabled outside a fresh live preflight", () => {
    expect(getQuoteGuard({ mode: "fixture", rpc: "ready" })).toEqual({
      enabled: false,
    });
    expect(getQuoteGuard({ mode: "live", rpc: "unavailable" })).toEqual({
      enabled: false,
    });
    expect(getQuoteGuard({ mode: "live", rpc: "ready" })).toEqual({
      enabled: true,
    });
  });
});
