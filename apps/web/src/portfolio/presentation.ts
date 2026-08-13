export type PortfolioSource = {
  source: "fixture" | "live";
  nextCursor: string | null;
};

export const fixturePortfolio: PortfolioSource = {
  source: "fixture",
  nextCursor: null,
};

export function getPortfolioPresentation(source: PortfolioSource) {
  if (source.source === "fixture")
    return {
      completeness: "fixture" as const,
      claimEnabled: false,
      message:
        "Local fixture data — connect live read data for portfolio completeness.",
    };
  if (source.nextCursor !== null)
    return {
      completeness: "partial" as const,
      claimEnabled: false,
      message: "More indexed portfolio data is available.",
    };
  return {
    completeness: "complete" as const,
    claimEnabled: false,
    message:
      "Indexed portfolio data is complete. Claims still require a direct contract read.",
  };
}
