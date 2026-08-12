import { describe, expect, it, vi } from "vitest";

import {
  createResultNonce,
  createTeeDecryptEnvelope,
} from "../../services/fcc-extension/src/tee-crypto.js";

describe("FCC tee-node crypto adapter", () => {
  it("sends encrypted bytes as base64 and parses base64 plaintext JSON", async () => {
    const plaintext = { schemaVersion: 1, value: "97000000" };
    const fetcher = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        encryptedMessage: "qrs=",
      });
      return new Response(
        JSON.stringify({
          decryptedMessage: Buffer.from(JSON.stringify(plaintext)).toString(
            "base64",
          ),
        }),
        { status: 200 },
      );
    });
    const decrypt = createTeeDecryptEnvelope(7701, fetcher);

    await expect(decrypt("0xaabb")).resolves.toEqual(plaintext);
    expect(fetcher).toHaveBeenCalledWith(
      "http://127.0.0.1:7701/decrypt",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects tee-node errors and malformed plaintext", async () => {
    const failed = createTeeDecryptEnvelope(
      7701,
      async () => new Response("unavailable", { status: 503 }),
    );
    const malformed = createTeeDecryptEnvelope(
      7701,
      async () =>
        new Response(JSON.stringify({ decryptedMessage: "bm90LWpzb24=" }), {
          status: 200,
        }),
    );

    await expect(failed("0xaa")).rejects.toThrow("TEE_DECRYPT_FAILED");
    await expect(malformed("0xaa")).rejects.toThrow(
      "TEE_DECRYPT_PLAINTEXT_INVALID",
    );
  });

  it("generates a fresh nonzero bytes32 result nonce", () => {
    const first = createResultNonce();
    const second = createResultNonce();

    expect(first).toMatch(/^0x[0-9a-f]{64}$/);
    expect(second).toMatch(/^0x[0-9a-f]{64}$/);
    expect(first).not.toBe(`0x${"0".repeat(64)}`);
    expect(first).not.toBe(second);
  });
});
