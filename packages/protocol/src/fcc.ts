import { encodeAbiParameters, getAddress, type Address, type Hex } from "viem";
import { z } from "zod";

const UINT256_MAX = (1n << 256n) - 1n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const payloadKinds = ["SELLER_MINIMUM", "PROVIDER_QUOTE"] as const;
export const resultTypes = ["TRADE", "NO_VALID_QUOTE", "INVALID_RFQ"] as const;

export type PayloadKind = (typeof payloadKinds)[number];
export type ResultType = (typeof resultTypes)[number];

export interface EnvelopeV1 {
  schemaVersion: 1;
  chainId: bigint;
  contractAddress: Address;
  rfqId: bigint;
  sender: Address;
  payloadKind: PayloadKind;
  value: bigint;
  payloadNonce: Hex;
}

export interface ResultDataV1 {
  schemaVersion: 1;
  chainId: bigint;
  contractAddress: Address;
  rfqId: bigint;
  resultType: ResultType;
  winningProvider: Address;
  winningQuote: bigint;
  resultExpiry: bigint;
  resultNonce: Hex;
}

export interface ResultDataBindings {
  chainId: bigint;
  contractAddress: Address;
  rfqId: bigint;
}

const uint256Schema = z
  .union([
    z.string().regex(/^(0|[1-9][0-9]*)$/),
    z.number().int().nonnegative(),
  ])
  .transform((value) => BigInt(value))
  .refine((value) => value <= UINT256_MAX, "UINT256_OUT_OF_RANGE");

const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => getAddress(value));

const bytes32Schema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/)
  .transform((value) => value as Hex);

const baseSchema = {
  schemaVersion: z.literal(1),
  chainId: uint256Schema,
  contractAddress: addressSchema,
  rfqId: uint256Schema,
};

const envelopeV1Schema = z
  .strictObject({
    ...baseSchema,
    sender: addressSchema,
    payloadKind: z.enum(payloadKinds),
    value: uint256Schema,
    payloadNonce: bytes32Schema,
  })
  .transform((value): EnvelopeV1 => value);

const resultDataV1Schema = z
  .strictObject({
    ...baseSchema,
    resultType: z.enum(resultTypes),
    winningProvider: addressSchema,
    winningQuote: uint256Schema,
    resultExpiry: uint256Schema,
    resultNonce: bytes32Schema,
  })
  .superRefine((value, context) => {
    const isTrade = value.resultType === "TRADE";
    const hasWinner = value.winningProvider !== ZERO_ADDRESS;
    const hasQuote = value.winningQuote > 0n;

    if (isTrade !== hasWinner || isTrade !== hasQuote) {
      context.addIssue({
        code: "custom",
        message: "RESULT_OUTCOME_INCONSISTENT",
      });
    }
  })
  .transform((value): ResultDataV1 => value);

const resultTypeIds: Record<ResultType, number> = {
  TRADE: 0,
  NO_VALID_QUOTE: 1,
  INVALID_RFQ: 2,
};

export function parseEnvelopeV1(input: unknown): EnvelopeV1 {
  return envelopeV1Schema.parse(input);
}

export function parseResultDataV1(input: unknown): ResultDataV1 {
  return resultDataV1Schema.parse(input);
}

export function encodeResultDataV1(result: ResultDataV1): Hex {
  return encodeAbiParameters(
    [
      { type: "uint16" },
      { type: "uint256" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint8" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "bytes32" },
    ],
    [
      result.schemaVersion,
      result.chainId,
      result.contractAddress,
      result.rfqId,
      resultTypeIds[result.resultType],
      result.winningProvider,
      result.winningQuote,
      result.resultExpiry,
      result.resultNonce,
    ],
  );
}

export function assertResultDataBindings(
  result: ResultDataV1,
  expected: ResultDataBindings,
): void {
  if (result.chainId !== expected.chainId) {
    throw new Error("RESULT_CHAIN_MISMATCH");
  }
  if (result.contractAddress !== getAddress(expected.contractAddress)) {
    throw new Error("RESULT_CONTRACT_MISMATCH");
  }
  if (result.rfqId !== expected.rfqId) {
    throw new Error("RESULT_RFQ_MISMATCH");
  }
}
