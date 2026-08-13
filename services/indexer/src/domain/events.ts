import { z } from "zod";

const decimal = z.string().regex(/^(0|[1-9][0-9]*)$/);
const positiveDecimal = z.string().regex(/^[1-9][0-9]*$/);
const address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => value.toLowerCase());
const hash = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/)
  .transform((value) => value.toLowerCase());
const hex = z
  .string()
  .regex(/^0x(?:[0-9a-fA-F]{2})+$/)
  .transform((value) => value.toLowerCase());
const ciphertext = hex.refine((value) => (value.length - 2) / 2 <= 4_096);

const common = {
  schemaVersion: z.literal(1),
  chainId: z.number().int().positive().safe(),
  contractAddress: address,
  blockNumber: decimal,
  transactionHash: hash,
  logIndex: z.number().int().nonnegative().safe(),
};

const decodedEventSchema = z.discriminatedUnion("eventName", [
  z.strictObject({
    ...common,
    eventName: z.literal("ExtensionIdInitialized"),
    args: z.strictObject({ extensionId: positiveDecimal }),
  }),
  z.strictObject({
    ...common,
    eventName: z.literal("TeeSignerInitialized"),
    args: z.strictObject({ teeSigner: address }),
  }),
  z.strictObject({
    ...common,
    eventName: z.literal("RfqCreated"),
    args: z.strictObject({
      rfqId: positiveDecimal,
      seller: address,
      lotAmount: positiveDecimal,
      quoteCap: positiveDecimal,
      quoteDeadline: positiveDecimal,
      resolutionDeadline: positiveDecimal,
      sellerCiphertext: ciphertext,
    }),
  }),
  z.strictObject({
    ...common,
    eventName: z.literal("QuoteSubmitted"),
    args: z.strictObject({
      rfqId: positiveDecimal,
      provider: address,
      ciphertext,
    }),
  }),
  z.strictObject({
    ...common,
    eventName: z.literal("RfqCancelled"),
    args: z.strictObject({ rfqId: positiveDecimal }),
  }),
  z.strictObject({
    ...common,
    eventName: z.literal("ResolutionRequested"),
    args: z.strictObject({ rfqId: positiveDecimal, actionId: hash }),
  }),
  z.strictObject({
    ...common,
    eventName: z.literal("RfqFinalized"),
    args: z.strictObject({
      rfqId: positiveDecimal,
      status: decimal,
      winningProvider: address,
      winningQuote: decimal,
      resultNonce: hash,
    }),
  }),
  z.strictObject({
    ...common,
    eventName: z.literal("RfqTimedOut"),
    args: z.strictObject({ rfqId: positiveDecimal }),
  }),
  z.strictObject({
    ...common,
    eventName: z.literal("Claimed"),
    args: z.strictObject({
      rfqId: positiveDecimal,
      account: address,
      fxrpAmount: decimal,
      usdt0Amount: decimal,
    }),
  }),
]);

export interface EventSource {
  chainId: number;
  blockNumber: string;
  transactionHash: string;
  logIndex: number;
}

interface BaseProjectorEvent {
  source: EventSource;
}

export type ProjectorEvent =
  | (BaseProjectorEvent & {
      eventName: "RfqCreated";
      rfqId: string;
      seller: string;
      lotAmount: string;
      quoteCap: string;
      quoteDeadline: string;
      resolutionDeadline: string;
      sellerCiphertext: string;
    })
  | (BaseProjectorEvent & {
      eventName: "QuoteSubmitted";
      rfqId: string;
      provider: string;
      ciphertext: string;
    })
  | (BaseProjectorEvent & {
      eventName: "RfqCancelled";
      rfqId: string;
    })
  | (BaseProjectorEvent & {
      eventName: "ResolutionRequested";
      rfqId: string;
      actionId: string;
    })
  | (BaseProjectorEvent & {
      eventName: "RfqFinalized";
      rfqId: string;
      status: string;
      winningProvider: string;
      winningQuote: string;
      resultNonce: string;
    })
  | (BaseProjectorEvent & {
      eventName: "RfqTimedOut";
      rfqId: string;
    })
  | (BaseProjectorEvent & {
      eventName: "Claimed";
      rfqId: string;
      account: string;
      fxrpAmount: string;
      usdt0Amount: string;
    });

function sourceOf(value: z.output<typeof decodedEventSchema>): EventSource {
  return {
    chainId: value.chainId,
    blockNumber: value.blockNumber,
    transactionHash: value.transactionHash,
    logIndex: value.logIndex,
  };
}

export function toProjectorEvent(input: unknown): ProjectorEvent | null {
  const parsed = decodedEventSchema.safeParse(input);
  if (!parsed.success) throw new Error("PROJECTOR_EVENT_INVALID");
  const value = parsed.data;
  const source = sourceOf(value);

  switch (value.eventName) {
    case "ExtensionIdInitialized":
    case "TeeSignerInitialized":
      return null;
    case "RfqCreated":
      return { eventName: value.eventName, source, ...value.args };
    case "QuoteSubmitted":
      return { eventName: value.eventName, source, ...value.args };
    case "RfqCancelled":
      return { eventName: value.eventName, source, ...value.args };
    case "ResolutionRequested":
      return { eventName: value.eventName, source, ...value.args };
    case "RfqFinalized":
      return { eventName: value.eventName, source, ...value.args };
    case "RfqTimedOut":
      return { eventName: value.eventName, source, ...value.args };
    case "Claimed":
      return { eventName: value.eventName, source, ...value.args };
  }
}
