export type ReadStateInput = {
  provenance: "fixture" | "live" | "missing";
  health: "healthy" | "lagging" | "unavailable" | "reorg-replay-required";
};

export type ReadState =
  | { kind: "fixture"; message: "Local fixture data" }
  | { kind: "degraded"; message: "Indexed data is delayed." }
  | {
      kind: "unavailable";
      message:
        | "Read data is unavailable. Retry after the indexer is healthy."
        | "Read data is recovering from a chain reorganization.";
    }
  | { kind: "ready"; message: "Live indexed data" };

export function getReadState(input: ReadStateInput): ReadState {
  if (input.provenance === "missing" || input.health === "unavailable")
    return {
      kind: "unavailable",
      message: "Read data is unavailable. Retry after the indexer is healthy.",
    };
  if (input.health === "reorg-replay-required")
    return {
      kind: "unavailable",
      message: "Read data is recovering from a chain reorganization.",
    };
  if (input.provenance === "fixture")
    return { kind: "fixture", message: "Local fixture data" };
  if (input.health === "lagging")
    return { kind: "degraded", message: "Indexed data is delayed." };
  return { kind: "ready", message: "Live indexed data" };
}
