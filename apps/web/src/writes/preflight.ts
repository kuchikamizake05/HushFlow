export type WritePreflight = {
  mode: "fixture" | "live";
  deployment: "pending" | "live";
  rpc: "ready" | "unavailable";
};

export type WriteGuard =
  { enabled: true } | { enabled: false; reason: "LIVE_PREFLIGHT_REQUIRED" };

export function getWriteGuard(preflight: WritePreflight): WriteGuard {
  return preflight.mode === "live" &&
    preflight.deployment === "live" &&
    preflight.rpc === "ready"
    ? { enabled: true }
    : { enabled: false, reason: "LIVE_PREFLIGHT_REQUIRED" };
}
