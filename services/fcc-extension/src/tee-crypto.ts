import { randomBytes } from "node:crypto";

import type { Hex } from "viem";

type Fetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export function createTeeDecryptEnvelope(
  signPort: number,
  fetcher: Fetch = fetch,
): (ciphertext: Hex) => Promise<unknown> {
  if (!Number.isInteger(signPort) || signPort < 1 || signPort > 65_535) {
    throw new Error("TEE_SIGN_PORT_INVALID");
  }
  const endpoint = `http://127.0.0.1:${signPort}/decrypt`;

  return async (ciphertext: Hex): Promise<unknown> => {
    const encryptedMessage = Buffer.from(ciphertext.slice(2), "hex").toString(
      "base64",
    );
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ encryptedMessage }),
    });
    if (!response.ok) {
      throw new Error(`TEE_DECRYPT_FAILED:${response.status}`);
    }

    const body: unknown = await response.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("decryptedMessage" in body) ||
      typeof body.decryptedMessage !== "string"
    ) {
      throw new Error("TEE_DECRYPT_RESPONSE_INVALID");
    }

    try {
      const plaintext = Buffer.from(body.decryptedMessage, "base64").toString(
        "utf8",
      );
      return JSON.parse(plaintext) as unknown;
    } catch {
      throw new Error("TEE_DECRYPT_PLAINTEXT_INVALID");
    }
  };
}

export function createResultNonce(): Hex {
  return `0x${randomBytes(32).toString("hex")}`;
}
