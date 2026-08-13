import type { z } from "zod";
import {
  dataProvenanceDtoSchema,
  deploymentStatusDtoSchema,
  indexerHealthDtoSchema,
} from "@hushflow/protocol/runtime/read-api";

export const dataProvenanceSchema = dataProvenanceDtoSchema;
export const deploymentStatusSchema = deploymentStatusDtoSchema;
export const indexerHealthSchema = indexerHealthDtoSchema;

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
