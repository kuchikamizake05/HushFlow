import {
  decodeAbiParameters,
  encodeAbiParameters,
  getAddress,
  type Address,
  type Hex,
} from "viem";
import { z } from "zod";

import {
  MAX_PROVIDERS,
  payloadKinds,
  resultTypes,
  type PayloadKind,
  type ResultType,
} from "./constants.js";

const UINT256_MAX = (1n << 256n) - 1n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BYTES32 = `0x${"0".repeat(64)}`;

export { payloadKinds, resultTypes } from "./constants.js";
export type { PayloadKind, ResultType } from "./constants.js";

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

export interface ResolutionInstructionV1 {
  schemaVersion: 1;
  chainId: bigint;
  contractAddress: Address;
  rfqId: bigint;
  seller: Address;
  sellerCiphertext: Hex;
  quoteCap: bigint;
  providers: Address[];
  quoteCiphertexts: Hex[];
  resolutionDeadline: bigint;
}

const uint256Schema = z
  .union([
    z.string().regex(/^(0|[1-9][0-9]*)$/),
    z.number().int().nonnegative().safe(),
    z.bigint().nonnegative(),
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
  .refine((value) => value.toLowerCase() !== ZERO_BYTES32, "NONCE_ZERO")
  .transform((value) => value as Hex);

const nonEmptyBytesSchema = z
  .string()
  .regex(/^0x(?:[0-9a-fA-F]{2})+$/)
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

const resolutionInstructionV1Schema = z
  .strictObject({
    ...baseSchema,
    seller: addressSchema,
    sellerCiphertext: nonEmptyBytesSchema,
    quoteCap: uint256Schema,
    providers: z.array(addressSchema),
    quoteCiphertexts: z.array(nonEmptyBytesSchema),
    resolutionDeadline: uint256Schema,
  })
  .superRefine((value, context) => {
    if (value.providers.length !== value.quoteCiphertexts.length) {
      context.addIssue({
        code: "custom",
        message: "RESOLUTION_PROVIDERS_MISMATCH",
      });
    }
    if (value.providers.length > MAX_PROVIDERS) {
      context.addIssue({
        code: "custom",
        message: "RESOLUTION_PROVIDER_LIMIT",
      });
    }
  })
  .transform((value): ResolutionInstructionV1 => value);

const resultTypeIds: Record<ResultType, number> = {
  TRADE: 0,
  NO_VALID_QUOTE: 1,
  INVALID_RFQ: 2,
};

const resultTypesById: Record<number, ResultType> = {
  0: "TRADE",
  1: "NO_VALID_QUOTE",
  2: "INVALID_RFQ",
};

const resultDataV1Abi = [
  { type: "uint16" },
  { type: "uint256" },
  { type: "address" },
  { type: "uint256" },
  { type: "uint8" },
  { type: "address" },
  { type: "uint256" },
  { type: "uint256" },
  { type: "bytes32" },
] as const;

const resolutionInstructionV1Abi = [
  { type: "uint16" },
  { type: "uint256" },
  { type: "address" },
  { type: "uint256" },
  { type: "address" },
  { type: "bytes" },
  { type: "uint256" },
  { type: "address[]" },
  { type: "bytes[]" },
  { type: "uint64" },
] as const;

export function parseEnvelopeV1(input: unknown): EnvelopeV1 {
  return envelopeV1Schema.parse(input);
}

export function parseResultDataV1(input: unknown): ResultDataV1 {
  return resultDataV1Schema.parse(input);
}

export function parseResolutionInstructionV1(
  input: unknown,
): ResolutionInstructionV1 {
  return resolutionInstructionV1Schema.parse(input);
}

export function encodeResultDataV1(result: ResultDataV1): Hex {
  return encodeAbiParameters(resultDataV1Abi, [
    result.schemaVersion,
    result.chainId,
    result.contractAddress,
    result.rfqId,
    resultTypeIds[result.resultType],
    result.winningProvider,
    result.winningQuote,
    result.resultExpiry,
    result.resultNonce,
  ]);
}

export function decodeResultDataV1(encoded: Hex): ResultDataV1 {
  const [
    schemaVersion,
    chainId,
    contractAddress,
    rfqId,
    resultTypeId,
    winningProvider,
    winningQuote,
    resultExpiry,
    resultNonce,
  ] = decodeAbiParameters(resultDataV1Abi, encoded);
  const resultType = resultTypesById[resultTypeId];

  if (!resultType) {
    throw new Error("RESULT_TYPE_INVALID");
  }

  return parseResultDataV1({
    schemaVersion,
    chainId: chainId.toString(),
    contractAddress,
    rfqId: rfqId.toString(),
    resultType,
    winningProvider,
    winningQuote: winningQuote.toString(),
    resultExpiry: resultExpiry.toString(),
    resultNonce,
  });
}

export function encodeResolutionInstructionV1(
  instruction: ResolutionInstructionV1,
): Hex {
  const validated = parseResolutionInstructionV1(instruction);
  return encodeAbiParameters(resolutionInstructionV1Abi, [
    validated.schemaVersion,
    validated.chainId,
    validated.contractAddress,
    validated.rfqId,
    validated.seller,
    validated.sellerCiphertext,
    validated.quoteCap,
    validated.providers,
    validated.quoteCiphertexts,
    validated.resolutionDeadline,
  ]);
}

export function decodeResolutionInstructionV1(
  encoded: Hex,
): ResolutionInstructionV1 {
  const [
    schemaVersion,
    chainId,
    contractAddress,
    rfqId,
    seller,
    sellerCiphertext,
    quoteCap,
    providers,
    quoteCiphertexts,
    resolutionDeadline,
  ] = decodeAbiParameters(resolutionInstructionV1Abi, encoded);

  return parseResolutionInstructionV1({
    schemaVersion,
    chainId: chainId.toString(),
    contractAddress,
    rfqId: rfqId.toString(),
    seller,
    sellerCiphertext,
    quoteCap: quoteCap.toString(),
    providers,
    quoteCiphertexts,
    resolutionDeadline: resolutionDeadline.toString(),
  });
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
