import { z } from "zod";

const timestamp = z.iso.datetime({ offset: true });
const decimal = z.string().regex(/^(0|[1-9][0-9]*)$/);
const hash = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);

// Mirrors the frozen M4A read DTO. Kept local because the current protocol
// package export points at source files that Turbopack cannot bundle yet.
export const dataProvenanceSchema = z.strictObject({
  mode: z.enum(["fixture", "live"]),
  sourceId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/),
});
export const deploymentStatusSchema = z.discriminatedUnion("status", [
  z.strictObject({
    schemaVersion: z.literal(1),
    network: z.literal("coston2"),
    chainId: z.literal(114),
    status: z.literal("pending"),
    blockingReason: z.enum([
      "FCC_ORGANIZER_ACCESS",
      "TEE_NODE_PIN",
      "DEPLOYMENT_APPROVAL",
      "LIVE_EVIDENCE",
    ]),
    updatedAt: timestamp,
  }),
  z.strictObject({
    schemaVersion: z.literal(1),
    network: z.literal("coston2"),
    chainId: z.literal(114),
    status: z.literal("live"),
    hushFlowRfq: address,
    deploymentTransactionHash: hash,
    deploymentBlock: z.string().regex(/^[1-9][0-9]*$/),
    updatedAt: timestamp,
  }),
]);
export const indexerHealthSchema = z.strictObject({
  schemaVersion: z.literal(1),
  status: z.enum(["healthy", "degraded", "unavailable"]),
  chainId: z.literal(114),
  latestIndexedBlock: decimal,
  latestObservedBlock: decimal,
  lagBlocks: decimal,
  checkedAt: timestamp,
  detailCode: z
    .enum([
      "RPC_UNAVAILABLE",
      "INDEXER_LAGGING",
      "DATABASE_UNAVAILABLE",
      "REORG_REPLAY_REQUIRED",
      "EVENT_INVALID",
    ])
    .optional(),
});

export type DataProvenance = z.infer<typeof dataProvenanceSchema>;
export type DeploymentStatus = z.infer<typeof deploymentStatusSchema>;
export type IndexerHealth = z.infer<typeof indexerHealthSchema>;

export function parseCoreReadModel(path: string, body: unknown): unknown {
  if (path === "/metadata") return dataProvenanceSchema.parse(body);
  if (path === "/deployment") return deploymentStatusSchema.parse(body);
  if (path === "/health") return indexerHealthSchema.parse(body);
  return body;
}

export const metadataSchema = dataProvenanceSchema;

const addressPattern = "0x[0-9a-fA-F]{40}";
const rfqId = "[1-9][0-9]*";

export function isReadPath(path: string): boolean {
  return (
    ["/metadata", "/deployment", "/health", "/rfqs"].includes(path) ||
    new RegExp(`^/wallets/${addressPattern}/portfolio$`).test(path) ||
    new RegExp(`^/v2/rfqs/${rfqId}/proof$`).test(path)
  );
}
