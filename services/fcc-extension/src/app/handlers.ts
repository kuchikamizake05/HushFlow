import type { Hex } from "viem";
import { hexToBytes } from "viem";

import {
  decodeResolutionInstructionV1,
  encodeResultDataV1,
} from "@hushflow/protocol/fcc";

import type { Framework, HandlerFunc, HandlerResult } from "../base/types.js";
import { NodeClient } from "../base/node.js";
import {
  DEFAULT_SIGN_PORT,
  OP_COMMAND_RESOLVE_RFQ,
  OP_TYPE_HUSHFLOW,
} from "./config.js";
import { resolveRfqV1 } from "../resolve-rfq.js";
import { createResultNonce } from "../tee-crypto.js";

export interface HushFlowHandlerDependencies {
  decrypt(ciphertext: string): Promise<string>;
  createResultNonce(): Hex;
}

let processedResolutions = 0;

export function resetState(): void {
  processedResolutions = 0;
}

export function reportState(): { processedResolutions: number } {
  return { processedResolutions };
}

export function createDefaultDependencies(
  signPort: number = Number(process.env.SIGN_PORT || DEFAULT_SIGN_PORT),
): HushFlowHandlerDependencies {
  const nodeClient = new NodeClient(signPort);

  return {
    async decrypt(ciphertext: string): Promise<string> {
      const bytes = ciphertext.startsWith("0x")
        ? hexToBytes(ciphertext as Hex)
        : Buffer.from(ciphertext, "base64");
      const decryptedBytes = await nodeClient.decrypt(bytes);
      return Buffer.from(decryptedBytes).toString("utf-8");
    },
    createResultNonce(): Hex {
      return createResultNonce();
    },
  };
}

export function createHushFlowHandler(
  dependencies?: Partial<HushFlowHandlerDependencies>,
): HandlerFunc {
  return async function handleResolveRfq(
    originalMessageHex: string,
  ): Promise<HandlerResult> {
    const deps: HushFlowHandlerDependencies = {
      ...createDefaultDependencies(),
      ...dependencies,
    };

    try {
      if (!originalMessageHex || !originalMessageHex.startsWith("0x")) {
        return [null, 0, "invalid originalMessage hex"];
      }

      const instruction = decodeResolutionInstructionV1(
        originalMessageHex as Hex,
      );

      let sellerEnvelope: unknown;
      try {
        const decryptedSeller = await deps.decrypt(
          instruction.sellerCiphertext,
        );
        sellerEnvelope = JSON.parse(decryptedSeller);
      } catch {
        sellerEnvelope = undefined;
      }

      const providers = [];
      for (let index = 0; index < instruction.providers.length; ++index) {
        let envelope: unknown;
        try {
          const decryptedQuote = await deps.decrypt(
            instruction.quoteCiphertexts[index]!,
          );
          envelope = JSON.parse(decryptedQuote);
        } catch {
          envelope = undefined;
        }

        providers.push({
          address: instruction.providers[index]!,
          quoteCap: instruction.quoteCap,
          envelope,
        });
      }

      const result = resolveRfqV1({
        chainId: instruction.chainId,
        contractAddress: instruction.contractAddress,
        rfqId: instruction.rfqId,
        seller: instruction.seller,
        sellerEnvelope,
        providers,
        resultExpiry: instruction.resolutionDeadline,
        resultNonce: deps.createResultNonce(),
      });

      const encodedResult = encodeResultDataV1(result);
      processedResolutions += 1;
      return [encodedResult, 1, null];
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      return [null, 0, message];
    }
  };
}

export function register(
  framework: Framework,
  dependencies?: Partial<HushFlowHandlerDependencies>,
): void {
  if (OP_TYPE_HUSHFLOW.startsWith("F_")) {
    throw new Error("OP types starting with F_ are reserved by Flare");
  }

  const handler = createHushFlowHandler(dependencies);
  framework.handle(OP_TYPE_HUSHFLOW, OP_COMMAND_RESOLVE_RFQ, handler);
}
