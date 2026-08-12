import {
  decodeEventLog,
  getAddress,
  getEventSelector,
  type Address,
  type Hex,
} from "viem";
import { z } from "zod";

import { hushFlowRfqAbi } from "./abi.js";

const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => getAddress(value));
const hashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const hexSchema = z.string().regex(/^0x(?:[0-9a-fA-F]{2})*$/);
const decimalSchema = z.string().regex(/^(0|[1-9][0-9]*)$/);

const eventLogSchema = z.strictObject({
  schemaVersion: z.number().int(),
  chainId: z.number().int().nonnegative().safe(),
  address: addressSchema,
  blockNumber: decimalSchema,
  transactionHash: hashSchema,
  logIndex: z.number().int().nonnegative().safe(),
  topics: z.array(hashSchema).min(1),
  data: hexSchema,
});

const eventAbis = hushFlowRfqAbi.filter((item) => item.type === "event");
const eventBySelector = new Map(
  eventAbis.map((event) => [getEventSelector(event), event] as const),
);

export interface DecodeHushFlowEventOptions {
  chainId: number;
  contractAddress: Address | string;
}

function jsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]),
    );
  }
  return value;
}

export function decodeHushFlowEvent(
  input: unknown,
  options: DecodeHushFlowEventOptions,
) {
  const parsed = eventLogSchema.safeParse(input);
  if (!parsed.success) throw new Error("EVENT_LOG_INVALID");
  const log = parsed.data;

  if (log.schemaVersion !== 1) {
    throw new Error("EVENT_SCHEMA_VERSION_UNSUPPORTED");
  }
  if (log.chainId !== options.chainId) throw new Error("EVENT_CHAIN_MISMATCH");
  if (log.address !== getAddress(options.contractAddress)) {
    throw new Error("EVENT_CONTRACT_MISMATCH");
  }

  const event = eventBySelector.get(log.topics[0] as Hex);
  if (!event) throw new Error("EVENT_SIGNATURE_UNKNOWN");
  const indexedCount = event.inputs.filter((item) => item.indexed).length;
  if (log.topics.length !== indexedCount + 1) {
    throw new Error("EVENT_TOPIC_COUNT_INVALID");
  }

  let decoded: ReturnType<typeof decodeEventLog>;
  try {
    decoded = decodeEventLog({
      abi: [event],
      data: log.data as Hex,
      topics: log.topics as [Hex, ...Hex[]],
      strict: true,
    });
  } catch {
    throw new Error("EVENT_DATA_INVALID");
  }

  return {
    schemaVersion: 1 as const,
    chainId: log.chainId,
    contractAddress: log.address,
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash.toLowerCase() as Hex,
    logIndex: log.logIndex,
    eventName: decoded.eventName,
    args: jsonSafe(decoded.args),
  };
}
