import { describe, expect, it } from "vitest";

import {
  fixturePortfolio,
  getPortfolioPresentation,
} from "../../apps/web/src/portfolio/presentation.js";

describe("M4B portfolio presentation", () => {
  it("marks fixtures as incomplete and prevents indexed claims from enabling writes", () => {
    expect(getPortfolioPresentation(fixturePortfolio)).toEqual({
      completeness: "fixture",
      claimEnabled: false,
      message:
        "Local fixture data — connect live read data for portfolio completeness.",
    });
  });

  it("does not claim completeness when pagination remains open", () => {
    expect(
      getPortfolioPresentation({ source: "live", nextCursor: "opaque-cursor" }),
    ).toMatchObject({ completeness: "partial", claimEnabled: false });
  });
});
