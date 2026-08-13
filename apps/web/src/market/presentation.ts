export type MarketSource = {
  source: "fixture" | "live";
  items: Array<{ rfqId: string; status: "OPEN" | "SETTLED" | "TIMED_OUT" }>;
};

export const fixtureMarket: MarketSource = {
  source: "fixture",
  items: [
    { rfqId: "1", status: "OPEN" },
    { rfqId: "2", status: "SETTLED" },
  ],
};

export function getMarketPresentation(source: MarketSource) {
  return {
    label:
      source.source === "fixture" ? "Local fixture data" : "Live indexed data",
    items: source.items.map(({ rfqId, status }) => ({ rfqId, status })),
  };
}
