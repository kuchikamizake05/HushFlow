import { describe, expect, it } from "vitest";

import { parseEnvelopeV1, type EnvelopeV1 } from "../../packages/protocol/src/fcc.js";
import * as envelopeModule from "../../packages/crypto/src/envelope.js";
import {
  assertEnvelopeBindings,
  createProviderQuoteEnvelope,
  createSellerMinimumEnvelope,
  HushFlowCryptoError,
} from "../../packages/crypto/src/envelope.js";

const CONTRACT = "0x1111111111111111111111111111111111111111";
const SELLER = "0x2222222222222222222222222222222222222222";
const PROVIDER = "0x3333333333333333333333333333333333333333";

function decode(bytes: Uint8Array): EnvelopeV1 {
  return parseEnvelopeV1(JSON.parse(new TextDecoder().decode(bytes)));
}

describe("secure EnvelopeV1 construction", () => {
  it("constructs canonical seller-minimum bytes with every protocol binding", () => {
    const bytes = createSellerMinimumEnvelope({
      chainId: 114n,
      contractAddress: CONTRACT,
      rfqId: 42n,
      sender: SELLER,
      value: 94_000_000n,
    });

    const envelope = decode(bytes);
    expect(envelope).toMatchObject({
      schemaVersion: 1,
      chainId: 114n,
      contractAddress: CONTRACT,
      rfqId: 42n,
      sender: SELLER,
      payloadKind: "SELLER_MINIMUM",
      value: 94_000_000n,
    });
    expect(envelope.payloadNonce).toMatch(/^0x[0-9a-f]{64}$/);
    expect(new TextDecoder().decode(bytes)).toBe(
      JSON.stringify({
        schemaVersion: 1,
        chainId: "114",
        contractAddress: CONTRACT,
        rfqId: "42",
        sender: SELLER,
        payloadKind: "SELLER_MINIMUM",
        value: "94000000",
        payloadNonce: envelope.payloadNonce,
      }),
    );
  });

  it("constructs provider quotes and generates fresh nonzero nonces", () => {
    const input = {
      chainId: 114n,
      contractAddress: CONTRACT,
      rfqId: 42n,
      sender: PROVIDER,
      value: 97_000_000n,
    } as const;

    const first = decode(createProviderQuoteEnvelope(input));
    const second = decode(createProviderQuoteEnvelope(input));

    expect(first.payloadKind).toBe("PROVIDER_QUOTE");
    expect(first.payloadNonce).not.toBe(`0x${"00".repeat(32)}`);
    expect(first.payloadNonce).not.toBe(second.payloadNonce);
  });

  it.each([
    ["chain", { chainId: 115n }],
    ["contract", { contractAddress: "not-an-address" }],
    ["RFQ", { rfqId: 0n }],
    ["sender", { sender: "private-sender-value" }],
    ["value", { value: 0n }],
  ])("rejects invalid %s input with a redacted typed error", (_name, override) => {
    expect(() =>
      createSellerMinimumEnvelope({
        chainId: 114n,
        contractAddress: CONTRACT,
        rfqId: 42n,
        sender: SELLER,
        value: 94_000_000n,
        ...override,
      }),
    ).toThrowError(HushFlowCryptoError);

    try {
      createSellerMinimumEnvelope({
        chainId: 114n,
        contractAddress: CONTRACT,
        rfqId: 42n,
        sender: SELLER,
        value: 94_000_000n,
        ...override,
      });
    } catch (error) {
      expect((error as Error).message).not.toContain("private-sender-value");
      expect((error as HushFlowCryptoError).code).toBe("ENVELOPE_INPUT_INVALID");
    }
  });

  it.each([
    ["chain", { chainId: 115n }],
    ["contract", { contractAddress: "0x4444444444444444444444444444444444444444" }],
    ["RFQ", { rfqId: 43n }],
    ["sender", { sender: PROVIDER }],
    ["kind", { payloadKind: "PROVIDER_QUOTE" as const }],
    ["value", { value: 1n }],
  ])("rejects a wrong %s binding", (_name, override) => {
    const envelope = decode(
      createSellerMinimumEnvelope({
        chainId: 114n,
        contractAddress: CONTRACT,
        rfqId: 42n,
        sender: SELLER,
        value: 94_000_000n,
      }),
    );

    expect(() =>
      assertEnvelopeBindings(envelope, {
        chainId: 114n,
        contractAddress: CONTRACT,
        rfqId: 42n,
        sender: SELLER,
        payloadKind: "SELLER_MINIMUM",
        value: 94_000_000n,
        ...override,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "ENVELOPE_BINDING_MISMATCH",
        message: "Encrypted envelope bindings do not match",
      }),
    );
  });

  it("does not expose deterministic nonce, persistence, analytics, or logging hooks", () => {
    expect(Object.keys(envelopeModule).sort()).toEqual([
      "HushFlowCryptoError",
      "assertEnvelopeBindings",
      "createProviderQuoteEnvelope",
      "createSellerMinimumEnvelope",
    ]);
    expect(createSellerMinimumEnvelope.length).toBe(1);
    expect(createProviderQuoteEnvelope.length).toBe(1);
  });
});
