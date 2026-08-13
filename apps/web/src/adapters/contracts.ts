import { z } from "zod";

export const dataProvenanceSchema = z.strictObject({
  mode: z.enum(["fixture", "live"]),
  sourceId: z.string().min(1).max(160),
});

export type DataProvenance = z.infer<typeof dataProvenanceSchema>;

export const metadataSchema = dataProvenanceSchema;

const address = "0x[0-9a-fA-F]{40}";
const rfqId = "[1-9][0-9]*";

export function isReadPath(path: string): boolean {
  return (
    ["/metadata", "/deployment", "/health", "/rfqs"].includes(path) ||
    new RegExp(`^/wallets/${address}/portfolio$`).test(path) ||
    new RegExp(`^/v2/rfqs/${rfqId}/proof$`).test(path)
  );
}
