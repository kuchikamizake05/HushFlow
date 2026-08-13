export type WritePreflight = Readonly<{
  mode: "fixture" | "live";
  deployment: "pending" | "live";
  chainId: number | null;
  contractCode: "present" | "missing";
  rpc: "ready" | "unavailable";
  wallet: "connected" | "unavailable";
}>;

export type WriteBlockReason =
  | "DEPLOYMENT_PENDING"
  | "COSTON2_CHAIN_REQUIRED"
  | "CONTRACT_CODE_REQUIRED"
  | "RPC_PREFLIGHT_REQUIRED"
  | "WALLET_CONNECTION_REQUIRED";

export type WriteGuard =
  | { enabled: true; state: "READY" }
  | { enabled: false; reason: WriteBlockReason };

export const getWriteGuard = (preflight: WritePreflight): WriteGuard => {
  if (preflight.mode !== "live" || preflight.deployment !== "live") {
    return { enabled: false, reason: "DEPLOYMENT_PENDING" };
  }
  if (preflight.chainId !== 114) {
    return { enabled: false, reason: "COSTON2_CHAIN_REQUIRED" };
  }
  if (preflight.contractCode !== "present") {
    return { enabled: false, reason: "CONTRACT_CODE_REQUIRED" };
  }
  if (preflight.rpc !== "ready") {
    return { enabled: false, reason: "RPC_PREFLIGHT_REQUIRED" };
  }
  if (preflight.wallet !== "connected") {
    return { enabled: false, reason: "WALLET_CONNECTION_REQUIRED" };
  }
  return { enabled: true, state: "READY" };
};

export const pendingWritePreflight: WritePreflight = {
  mode: "fixture",
  deployment: "pending",
  chainId: null,
  contractCode: "missing",
  rpc: "unavailable",
  wallet: "unavailable",
};
