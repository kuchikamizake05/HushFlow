export type QuotePreflight = {
  mode: "fixture" | "live";
  rpc: "ready" | "unavailable";
};

export function getQuoteGuard(preflight: QuotePreflight) {
  return { enabled: preflight.mode === "live" && preflight.rpc === "ready" };
}
