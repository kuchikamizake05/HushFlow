import { getAddress, type Address, type Hex } from "viem";
import { z } from "zod";

import { COSTON2_CHAIN_ID } from "./constants.js";

const ZERO_ADDRESS = `0x${"0".repeat(40)}`;
const ZERO_HASH = `0x${"0".repeat(64)}`;

const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .refine((value) => value.toLowerCase() !== ZERO_ADDRESS, "ADDRESS_ZERO")
  .transform((value) => getAddress(value));

const hashSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/)
  .refine((value) => value.toLowerCase() !== ZERO_HASH, "HASH_ZERO")
  .transform((value) => value.toLowerCase() as Hex);

const decimalBlockSchema = z
  .string()
  .regex(/^[1-9][0-9]*$/)
  .transform((value) => BigInt(value));

const timestampSchema = z.iso.datetime({ offset: true });

const pendingContractsSchema = z.strictObject({
  fxrp: addressSchema.optional(),
  usdt0: addressSchema.optional(),
  teeExtensionRegistry: addressSchema.optional(),
  teeMachineRegistry: addressSchema.optional(),
});

const liveContractsSchema = z.strictObject({
  fxrp: addressSchema,
  usdt0: addressSchema,
  teeExtensionRegistry: addressSchema,
  teeMachineRegistry: addressSchema,
});

const commonManifest = {
  schemaVersion: z.literal(1),
  network: z.literal("coston2"),
  chainId: z.literal(COSTON2_CHAIN_ID),
  rpcUrl: z.url().refine((value) => value.startsWith("https://"), "HTTPS_ONLY"),
  explorerUrl: z
    .url()
    .refine((value) => value.startsWith("https://"), "HTTPS_ONLY"),
  abiHash: hashSchema,
  generatedAt: timestampSchema,
};

export const deploymentBlockingReasons = [
  "FCC_ORGANIZER_ACCESS",
  "TEE_NODE_PIN",
  "DEPLOYMENT_APPROVAL",
  "LIVE_EVIDENCE",
] as const;

const pendingDeploymentSchema = z.strictObject({
  ...commonManifest,
  status: z.literal("pending"),
  blockingReason: z.enum(deploymentBlockingReasons),
  contracts: pendingContractsSchema,
});

const liveDeploymentSchema = z.strictObject({
  ...commonManifest,
  status: z.literal("live"),
  contracts: liveContractsSchema,
  deployedAt: timestampSchema,
  hushFlowRfq: addressSchema,
  extensionId: hashSchema,
  teeSigner: addressSchema,
  deploymentBlock: decimalBlockSchema,
  deploymentTransactionHash: hashSchema,
  runtimeCodeHash: hashSchema,
});

const deploymentManifestSchema = z.discriminatedUnion("status", [
  pendingDeploymentSchema,
  liveDeploymentSchema,
]);

export type PendingDeployment = z.output<typeof pendingDeploymentSchema>;
export type LiveDeployment = z.output<typeof liveDeploymentSchema>;
export type DeploymentManifest = z.output<typeof deploymentManifestSchema>;
export type DeploymentContracts = {
  fxrp: Address;
  usdt0: Address;
  teeExtensionRegistry: Address;
  teeMachineRegistry: Address;
};

export class DeploymentNotLiveError extends Error {
  readonly code = "DEPLOYMENT_NOT_LIVE" as const;

  constructor() {
    super("DEPLOYMENT_NOT_LIVE");
    this.name = "DeploymentNotLiveError";
  }
}

export function parseDeploymentManifest(input: unknown): DeploymentManifest {
  return deploymentManifestSchema.parse(input);
}

export function requireLiveDeployment(
  manifest: DeploymentManifest,
): LiveDeployment {
  if (manifest.status !== "live") {
    throw new DeploymentNotLiveError();
  }
  return manifest;
}
