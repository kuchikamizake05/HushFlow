import {
  parseEnvelopeV1,
  parseResultDataV1,
  type ResultDataV1,
  type ResultType,
} from "@hushflow/protocol/fcc";
import { getAddress, type Address } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_PROVIDERS = 20;

export interface ProviderSubmissionV1 {
  address: string;
  quoteCap: bigint;
  envelope: unknown;
}

export interface ResolveRfqV1Input {
  chainId: bigint;
  contractAddress: string;
  rfqId: bigint;
  seller: string;
  sellerEnvelope: unknown;
  providers: ProviderSubmissionV1[];
  resultExpiry: bigint;
  resultNonce: string;
}

function outcome(
  input: ResolveRfqV1Input,
  resultType: ResultType,
  winningProvider: Address = ZERO_ADDRESS,
  winningQuote = 0n,
): ResultDataV1 {
  return parseResultDataV1({
    schemaVersion: 1,
    chainId: input.chainId.toString(),
    contractAddress: input.contractAddress,
    rfqId: input.rfqId.toString(),
    resultType,
    winningProvider,
    winningQuote: winningQuote.toString(),
    resultExpiry: input.resultExpiry.toString(),
    resultNonce: input.resultNonce,
  });
}

function bindingsMatch(
  envelope: {
    chainId: bigint;
    contractAddress: Address;
    rfqId: bigint;
  },
  input: ResolveRfqV1Input,
): boolean {
  return (
    envelope.chainId === input.chainId &&
    envelope.contractAddress === getAddress(input.contractAddress) &&
    envelope.rfqId === input.rfqId
  );
}

export function resolveRfqV1(input: ResolveRfqV1Input): ResultDataV1 {
  if (input.providers.length > MAX_PROVIDERS) {
    return outcome(input, "INVALID_RFQ");
  }

  let sellerMinimum: bigint;

  try {
    const sellerEnvelope = parseEnvelopeV1(input.sellerEnvelope);
    if (
      sellerEnvelope.payloadKind !== "SELLER_MINIMUM" ||
      sellerEnvelope.sender !== getAddress(input.seller) ||
      !bindingsMatch(sellerEnvelope, input)
    ) {
      return outcome(input, "INVALID_RFQ");
    }
    sellerMinimum = sellerEnvelope.value;
  } catch {
    return outcome(input, "INVALID_RFQ");
  }

  let winningProvider: Address = ZERO_ADDRESS;
  let winningQuote = 0n;

  for (const provider of input.providers) {
    try {
      const quoteEnvelope = parseEnvelopeV1(provider.envelope);
      if (
        quoteEnvelope.payloadKind !== "PROVIDER_QUOTE" ||
        quoteEnvelope.sender !== getAddress(provider.address) ||
        !bindingsMatch(quoteEnvelope, input) ||
        quoteEnvelope.value === 0n ||
        quoteEnvelope.value > provider.quoteCap ||
        quoteEnvelope.value < sellerMinimum
      ) {
        continue;
      }

      if (quoteEnvelope.value > winningQuote) {
        winningProvider = quoteEnvelope.sender;
        winningQuote = quoteEnvelope.value;
      }
    } catch {
      continue;
    }
  }

  return winningProvider === ZERO_ADDRESS
    ? outcome(input, "NO_VALID_QUOTE")
    : outcome(input, "TRADE", winningProvider, winningQuote);
}
