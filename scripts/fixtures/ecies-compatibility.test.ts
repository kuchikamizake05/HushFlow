import { describe, expect, it } from "vitest";

import { encryptFccEcies } from "../../packages/crypto/src/ecies.js";

const GENERATOR_PUBLIC_KEY = Uint8Array.from(
  Buffer.from(
    "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798" +
      "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8",
    "hex",
  ),
);

describe("FCC-compatible ECIES", () => {
  it("emits go-ethereum ECIES layout with fresh ephemeral material", async () => {
    const plaintext = new TextEncoder().encode("hushflow-fcc-v1");
    const first = await encryptFccEcies(GENERATOR_PUBLIC_KEY, plaintext);
    const second = await encryptFccEcies(GENERATOR_PUBLIC_KEY, plaintext);

    expect(first).toHaveLength(65 + 16 + plaintext.length + 32);
    expect(first[0]).toBe(4);
    expect(first.slice(0, 65)).not.toEqual(second.slice(0, 65));
    expect(first.slice(65, 81)).not.toEqual(second.slice(65, 81));
  });

  it.each([
    ["short key", new Uint8Array(63)],
    ["zero key", new Uint8Array(64)],
    ["invalid point", Uint8Array.from({ length: 64 }, () => 1)],
  ])("rejects %s with redacted error", async (_label, key) => {
    await expect(
      encryptFccEcies(key, new Uint8Array([1])),
    ).rejects.toMatchObject({
      code: "FCC_PUBLIC_KEY_INVALID",
      message: "FCC public key is invalid",
    });
  });

  it("rejects empty plaintext", async () => {
    await expect(
      encryptFccEcies(GENERATOR_PUBLIC_KEY, new Uint8Array()),
    ).rejects.toMatchObject({ code: "ECIES_PLAINTEXT_INVALID" });
  });
});
