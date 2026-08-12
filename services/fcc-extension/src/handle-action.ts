import {
  decodeResolutionInstructionV1,
  encodeResultDataV1,
} from "@hushflow/protocol/fcc";
import type { Hex } from "viem";

import { resolveRfqV1 } from "./resolve-rfq.js";

export const OP_TYPE_HUSHFLOW = "HUSHFLOW";
export const OP_COMMAND_RESOLVE_RFQ = "RESOLVE_RFQ";

export interface FccActionV1 {
  opType: string;
  opCommand: string;
  message: Hex;
}

export interface FccActionDependencies {
  decryptEnvelope(ciphertext: Hex): Promise<unknown>;
  createResultNonce(): Hex;
}

export async function handleFccActionV1(
  action: FccActionV1,
  dependencies: FccActionDependencies,
): Promise<Hex> {
  if (action.opType !== OP_TYPE_HUSHFLOW) {
    throw new Error("FCC_OPERATION_UNSUPPORTED");
  }
  if (action.opCommand !== OP_COMMAND_RESOLVE_RFQ) {
    throw new Error("FCC_COMMAND_UNSUPPORTED");
  }

  const instruction = decodeResolutionInstructionV1(action.message);
  let sellerEnvelope: unknown;

  try {
    sellerEnvelope = await dependencies.decryptEnvelope(
      instruction.sellerCiphertext,
    );
  } catch {
    sellerEnvelope = undefined;
  }

  const providers = [];
  for (let index = 0; index < instruction.providers.length; ++index) {
    let envelope: unknown;
    try {
      envelope = await dependencies.decryptEnvelope(
        instruction.quoteCiphertexts[index]!,
      );
    } catch {
      envelope = undefined;
    }

    providers.push({
      address: instruction.providers[index]!,
      quoteCap: instruction.quoteCap,
      envelope,
    });
  }

  return encodeResultDataV1(
    resolveRfqV1({
      chainId: instruction.chainId,
      contractAddress: instruction.contractAddress,
      rfqId: instruction.rfqId,
      seller: instruction.seller,
      sellerEnvelope,
      providers,
      resultExpiry: instruction.resolutionDeadline,
      resultNonce: dependencies.createResultNonce(),
    }),
  );
}
