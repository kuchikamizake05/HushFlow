export type OperationalDrill = Readonly<{
  id:
    | "RPC_UNAVAILABLE"
    | "RPC_FALLBACK"
    | "FCC_RESULT_DELAYED"
    | "EXTENSION_PROXY_UNAVAILABLE"
    | "TUNNEL_RESTARTED"
    | "FCC_REGISTRATION_EXPIRED"
    | "INDEXER_LAGGING_OR_REBUILDING"
    | "RESULT_RELAY_RETRY"
    | "RESULT_EXPIRED"
    | "HELPER_FUNDS_INSUFFICIENT"
    | "CLAIM_TRANSFER_REVERTED_OR_TIMEOUT";
  expectedOutcome: string;
}>;

export const operationalDrills: readonly OperationalDrill[] = [
  { id: "RPC_UNAVAILABLE", expectedOutcome: "Stop writes and show a coarse unavailable state." },
  { id: "RPC_FALLBACK", expectedOutcome: "Recheck chain identity before resuming reads." },
  { id: "FCC_RESULT_DELAYED", expectedOutcome: "Wait for expiry boundary; do not relay a stale result." },
  { id: "EXTENSION_PROXY_UNAVAILABLE", expectedOutcome: "Stop resolution and retain the public pending state." },
  { id: "TUNNEL_RESTARTED", expectedOutcome: "Revalidate the Coston2-only route before resuming." },
  { id: "FCC_REGISTRATION_EXPIRED", expectedOutcome: "Stop and require a fresh approved registration." },
  { id: "INDEXER_LAGGING_OR_REBUILDING", expectedOutcome: "Use a coarse unavailable read state; never authorize a write." },
  { id: "RESULT_RELAY_RETRY", expectedOutcome: "Inspect the receipt before one controlled retry." },
  { id: "RESULT_EXPIRED", expectedOutcome: "Reject the expired result and continue to timeout handling." },
  { id: "HELPER_FUNDS_INSUFFICIENT", expectedOutcome: "Stop before signing and report the public readiness failure." },
  { id: "CLAIM_TRANSFER_REVERTED_OR_TIMEOUT", expectedOutcome: "Preserve claimability and stop the scenario for review." },
];
