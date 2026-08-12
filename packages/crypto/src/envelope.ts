import { getAddress, type Address, type Hex } from "viem";

import {
  COSTON2_CHAIN_ID,
  parseEnvelopeV1,
  type EnvelopeV1,
  type PayloadKind,
} from "@hushflow/protocol";

import { HushFlowCryptoError } from "./errors.js";

export { HushFlowCryptoError } from "./errors.js";

const UINT256_MAX = (1n << 256n) - 1n;

interface EnvelopeInput {
  chainId: bigint;
  contractAddress: string;
  rfqId: bigint;
  sender: string;
  value: bigint;
}

interface EnvelopeBindings extends EnvelopeInput {
  payloadKind: PayloadKind;
}

function fail(code: string, message: string): never {
  throw new HushFlowCryptoError(code, message);
}

function validPositive(value: unknown): value is bigint {
  return typeof value === "bigint" && value > 0n && value <= UINT256_MAX;
}

function nonce(): Hex {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  if (bytes.every((byte) => byte === 0)) bytes[31] = 1;
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function create(input: EnvelopeInput, payloadKind: PayloadKind): Uint8Array {
  try {
    if (
      input.chainId !== BigInt(COSTON2_CHAIN_ID) ||
      !validPositive(input.rfqId) ||
      !validPositive(input.value)
    ) {
      fail("ENVELOPE_INPUT_INVALID", "Encrypted envelope input is invalid");
    }
    const contractAddress = getAddress(input.contractAddress);
    const sender = getAddress(input.sender);
    const envelope = parseEnvelopeV1({
      schemaVersion: 1,
      chainId: input.chainId,
      contractAddress,
      rfqId: input.rfqId,
      sender,
      payloadKind,
      value: input.value,
      payloadNonce: nonce(),
    });
    return new TextEncoder().encode(
      JSON.stringify({
        schemaVersion: 1,
        chainId: envelope.chainId.toString(),
        contractAddress: envelope.contractAddress,
        rfqId: envelope.rfqId.toString(),
        sender: envelope.sender,
        payloadKind: envelope.payloadKind,
        value: envelope.value.toString(),
        payloadNonce: envelope.payloadNonce,
      }),
    );
  } catch (error) {
    if (error instanceof HushFlowCryptoError) throw error;
    fail("ENVELOPE_INPUT_INVALID", "Encrypted envelope input is invalid");
  }
}

export function createSellerMinimumEnvelope(input: EnvelopeInput): Uint8Array {
  return create(input, "SELLER_MINIMUM");
}

export function createProviderQuoteEnvelope(input: EnvelopeInput): Uint8Array {
  return create(input, "PROVIDER_QUOTE");
}

export function assertEnvelopeBindings(
  envelope: EnvelopeV1,
  expected: EnvelopeBindings,
): void {
  let contractAddress: Address;
  let sender: Address;
  try {
    contractAddress = getAddress(expected.contractAddress);
    sender = getAddress(expected.sender);
  } catch {
    fail(
      "ENVELOPE_BINDING_MISMATCH",
      "Encrypted envelope bindings do not match",
    );
  }
  if (
    envelope.chainId !== expected.chainId ||
    envelope.contractAddress !== contractAddress ||
    envelope.rfqId !== expected.rfqId ||
    envelope.sender !== sender ||
    envelope.payloadKind !== expected.payloadKind ||
    envelope.value !== expected.value
  ) {
    fail(
      "ENVELOPE_BINDING_MISMATCH",
      "Encrypted envelope bindings do not match",
    );
  }
}
