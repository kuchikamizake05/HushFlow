import { HUSHFLOW_ABI_HASH } from "../abi.js";
import { parseDeploymentManifest } from "../deployment.js";

export const coston2Deployment = parseDeploymentManifest({
  schemaVersion: 1,
  status: "pending",
  network: "coston2",
  chainId: 114,
  rpcUrl: "https://coston2-api.flare.network/ext/C/rpc",
  explorerUrl: "https://coston2-explorer.flare.network",
  abiHash: HUSHFLOW_ABI_HASH,
  generatedAt: "2026-08-14T00:00:00.000Z",
  blockingReason: "FCC_ORGANIZER_ACCESS",
  contracts: {},
});
