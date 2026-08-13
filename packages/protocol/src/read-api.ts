import { getAddress } from "viem";
import { z } from "zod";

import {
  COSTON2_CHAIN_ID,
  MAX_CIPHERTEXT_BYTES,
  rfqStatuses,
} from "./constants.js";
import { deploymentBlockingReasons } from "./deployment.js";

const decimal = z.string().regex(/^(0|[1-9][0-9]*)$/);
const positiveDecimal = z.string().regex(/^[1-9][0-9]*$/);
const address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => getAddress(value));
const hash = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const hex = z.string().regex(/^0x(?:[0-9a-fA-F]{2})+$/);
const ciphertext = hex.refine(
  (value) => (value.length - 2) / 2 <= MAX_CIPHERTEXT_BYTES,
  "CIPHERTEXT_TOO_LARGE",
);
const timestamp = z.iso.datetime({ offset: true });
const base = { schemaVersion: z.literal(1) };

export const dataProvenanceDtoSchema = z.strictObject({
  mode: z.enum(["fixture", "live"]),
  sourceId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/),
});

export const readApiErrorCodes = [
  "REQUEST_INVALID",
  "INVALID_CURSOR",
  "DATABASE_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export const readApiErrorDtoSchema = z.strictObject({
  ...base,
  error: z.enum(readApiErrorCodes),
});

export const deploymentStatusDtoSchema = z.discriminatedUnion("status", [
  z.strictObject({
    ...base,
    network: z.literal("coston2"),
    chainId: z.literal(COSTON2_CHAIN_ID),
    status: z.literal("pending"),
    blockingReason: z.enum(deploymentBlockingReasons),
    updatedAt: timestamp,
  }),
  z.strictObject({
    ...base,
    network: z.literal("coston2"),
    chainId: z.literal(COSTON2_CHAIN_ID),
    status: z.literal("live"),
    hushFlowRfq: address,
    deploymentTransactionHash: hash,
    deploymentBlock: positiveDecimal,
    updatedAt: timestamp,
  }),
]);

export const rfqSummaryDtoSchema = z.strictObject({
  ...base,
  rfqId: positiveDecimal,
  seller: address,
  lotAmount: positiveDecimal,
  quoteCap: positiveDecimal,
  quoteDeadline: positiveDecimal,
  resolutionDeadline: positiveDecimal,
  status: z.enum(rfqStatuses),
  providerCount: z.number().int().nonnegative().safe(),
  winningProvider: address.nullable(),
  winningQuote: positiveDecimal.nullable(),
  actionId: hash.nullable(),
});

export const activityKinds = [
  "RFQ_CREATED",
  "QUOTE_SUBMITTED",
  "RFQ_CANCELLED",
  "RESOLUTION_REQUESTED",
  "RFQ_FINALIZED",
  "RFQ_TIMED_OUT",
  "CLAIMED",
] as const;

export const activityDtoSchema = z.strictObject({
  ...base,
  rfqId: positiveDecimal,
  kind: z.enum(activityKinds),
  transactionHash: hash,
  blockNumber: positiveDecimal,
  logIndex: z.number().int().nonnegative().safe(),
  occurredAt: timestamp,
  actor: address.optional(),
});

const providerDtoSchema = z.strictObject({
  position: z.number().int().nonnegative().safe(),
  provider: address,
  quoteCiphertext: ciphertext,
  submittedAtBlock: positiveDecimal,
  transactionHash: hash,
});

export const rfqDetailDtoSchema = z.strictObject({
  ...base,
  summary: rfqSummaryDtoSchema,
  sellerCiphertext: ciphertext,
  providers: z.array(providerDtoSchema),
  activity: z.array(activityDtoSchema),
});

export const claimableDtoSchema = z.strictObject({
  ...base,
  rfqId: positiveDecimal,
  account: address,
  fxrpToken: address,
  fxrpAmount: decimal,
  usdt0Token: address,
  usdt0Amount: decimal,
  claimed: z.boolean(),
});

export function createCursorPageSchema<T extends z.ZodType>(item: T) {
  return z.strictObject({
    ...base,
    items: z.array(item),
    nextCursor: z.string().min(1).nullable(),
  });
}

export const indexerHealthDtoSchema = z.strictObject({
  ...base,
  status: z.enum(["healthy", "degraded", "unavailable"]),
  chainId: z.literal(COSTON2_CHAIN_ID),
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

const proofProviderSchema = z.strictObject({
  provider: address,
  ciphertext,
});

const tradeProofOutcomeSchema = z.strictObject({
  resultType: z.literal("TRADE"),
  winningProvider: address,
  winningQuote: positiveDecimal,
  resultNonce: hash,
  transactionHash: hash,
});

const emptyProofOutcomeSchema = z.strictObject({
  resultType: z.enum(["NO_VALID_QUOTE", "INVALID_RFQ"]),
  winningProvider: z.null(),
  winningQuote: z.null(),
  resultNonce: hash,
  transactionHash: hash,
});

export const rfqProofDtoSchema = z.strictObject({
  ...base,
  rfqId: positiveDecimal,
  sellerCiphertext: ciphertext,
  providerCiphertexts: z.array(proofProviderSchema),
  actionId: hash.nullable(),
  outcome: z
    .union([tradeProofOutcomeSchema, emptyProofOutcomeSchema])
    .nullable(),
});

export const portfolioDtoSchema = z.strictObject({
  ...base,
  account: address,
  rfqs: z.array(rfqSummaryDtoSchema),
  claims: z.array(claimableDtoSchema),
  nextCursor: z.string().min(1).nullable(),
});

export const portfolioQueryDtoSchema = z.strictObject({
  ...base,
  account: address,
  limit: z.number().int().min(1).max(100),
  cursor: z.string().min(1).max(512).optional(),
});

const decodedTradeResultSchema = z.strictObject({
  ...base,
  chainId: decimal,
  contractAddress: address,
  rfqId: positiveDecimal,
  resultType: z.literal("TRADE"),
  winningProvider: address,
  winningQuote: positiveDecimal,
  resultExpiry: positiveDecimal,
  resultNonce: hash,
});

const decodedEmptyResultSchema = z.strictObject({
  ...base,
  chainId: decimal,
  contractAddress: address,
  rfqId: positiveDecimal,
  resultType: z.enum(["NO_VALID_QUOTE", "INVALID_RFQ"]),
  winningProvider: z.null(),
  winningQuote: z.null(),
  resultExpiry: positiveDecimal,
  resultNonce: hash,
});

const proofCenterPartialSchema = z.strictObject({
  schemaVersion: z.literal(2),
  evidenceStatus: z.literal("PARTIAL"),
  rfqId: positiveDecimal,
  provenance: dataProvenanceDtoSchema,
  reason: z.enum([
    "FIXTURE_DATA",
    "DEPLOYMENT_PENDING",
    "SIGNED_RESULT_UNAVAILABLE",
    "TRANSACTION_UNAVAILABLE",
    "EVIDENCE_INVALID",
  ]),
});

const proofCenterVerifiedSchema = z
  .strictObject({
    schemaVersion: z.literal(2),
    evidenceStatus: z.literal("VERIFIED"),
    rfqId: positiveDecimal,
    provenance: dataProvenanceDtoSchema.extend({ mode: z.literal("live") }),
    chainId: z.literal(COSTON2_CHAIN_ID),
    contractAddress: address,
    resultData: hex,
    signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
    actionId: hash,
    submissionTag: z.string().min(1).max(128),
    actionResultStatus: z.literal(1),
    decodedResult: z.union([
      decodedTradeResultSchema,
      decodedEmptyResultSchema,
    ]),
    configuredTeeSigner: address,
    recoveredTeeSigner: address,
    signatureVerified: z.literal(true),
    payloadHash: hash,
    signedMessageHash: hash,
    sourceTransactionHash: hash,
    sourceBlockNumber: positiveDecimal,
    sourceBlockHash: hash,
  })
  .superRefine((value, context) => {
    if (value.decodedResult.chainId !== String(value.chainId)) {
      context.addIssue({ code: "custom", message: "PROOF_CHAIN_MISMATCH" });
    }
    if (value.decodedResult.contractAddress !== value.contractAddress) {
      context.addIssue({ code: "custom", message: "PROOF_CONTRACT_MISMATCH" });
    }
    if (value.decodedResult.rfqId !== value.rfqId) {
      context.addIssue({ code: "custom", message: "PROOF_RFQ_MISMATCH" });
    }
    if (value.recoveredTeeSigner !== value.configuredTeeSigner) {
      context.addIssue({ code: "custom", message: "PROOF_SIGNER_MISMATCH" });
    }
  });

export const rfqProofCenterDtoV2Schema = z.union([
  proofCenterPartialSchema,
  proofCenterVerifiedSchema,
]);

export const protocolStatsDtoSchema = z.strictObject({
  ...base,
  rfqCount: decimal,
  openRfqCount: decimal,
  settledRfqCount: decimal,
  providerParticipationCount: decimal,
  totalLotAmount: decimal,
  settledQuoteAmount: decimal,
  latestIndexedBlock: decimal,
  updatedAt: timestamp,
});
