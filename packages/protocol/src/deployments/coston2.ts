import { HUSHFLOW_ABI_HASH } from "../abi.js";
import { parseDeploymentManifest } from "../deployment.js";

export const coston2Deployment = parseDeploymentManifest({
  schemaVersion: 1,
  status: "live",
  network: "coston2",
  chainId: 114,
  rpcUrl: "https://coston2-api.flare.network/ext/C/rpc",
  explorerUrl: "https://coston2-explorer.flare.network",
  abiHash: HUSHFLOW_ABI_HASH,
  generatedAt: "2026-08-14T12:00:00.000Z",
  deployedAt: "2026-08-14T12:05:00.000Z",
  hushFlowRfq: "0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab",
  extensionId: "0x00000000000000000000000000000000000000000000000000000000000102e1",
  teeSigner: "0xf4373959d6fa7d24906CB3010ac90306E532EAAB",
  deploymentBlock: "17867090",
  deploymentTransactionHash: "0xe9249d36f44a5c242defd678404ef78b83d38bee23c8f196afd6d41ab09750aa",
  runtimeCodeHash: "0x194844cf417dde867073e5ab7199fa4d21fd82b5dbe2bdea8b3d7fc18d10fdc2",
  contracts: {
    fxrp: "0x0b6A3645c240605887a5532109323A3E12273dc7",
    usdt0: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F",
    teeExtensionRegistry: "0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE",
    teeMachineRegistry: "0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE",
  },
});
