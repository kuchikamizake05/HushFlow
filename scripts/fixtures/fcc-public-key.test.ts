import { describe, expect, it, vi } from "vitest";

import {
  HushFlowCryptoError,
  fetchFccPublicKey,
  parseFccPublicKeyMetadata,
} from "../../packages/crypto/src/metadata.js";

const GENERATOR_X =
  "0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
const GENERATOR_Y =
  "0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8";
const EXTENSION_ID = `0x${"11".repeat(32)}`;
const CODE_HASH = `0x${"22".repeat(32)}`;
const PLATFORM = `0x${"33".repeat(32)}`;
const NOW_SECONDS = 1_800_000_000;

const expectations = {
  chainId: 114n,
  extensionId: EXTENSION_ID,
  codeHash: CODE_HASH,
  supportedPlatforms: [PLATFORM],
  maxAgeSeconds: 300,
  nowSeconds: NOW_SECONDS,
} as const;

function validInfo() {
  const publicKey = { x: GENERATOR_X, y: GENERATOR_Y };

  return {
    teeInfo: {
      challenge: `0x${"44".repeat(32)}`,
      publicKey,
      initialSigningPolicyId: 1,
      initialSigningPolicyHash: `0x${"55".repeat(32)}`,
      lastSigningPolicyId: 2,
      lastSigningPolicyHash: `0x${"66".repeat(32)}`,
      chainId: 114,
      state: {
        systemState: "0x01",
        systemStateVersion: `0x${"77".repeat(32)}`,
        state: "0x02",
        stateVersion: `0x${"88".repeat(32)}`,
      },
      teeTimestamp: NOW_SECONDS - 5,
      machinePathListNonce: 3,
      machinePathListHash: `0x${"99".repeat(32)}`,
    },
    machineData: {
      extensionId: EXTENSION_ID,
      initialOwner: `0x${"aa".repeat(20)}`,
      codeHash: CODE_HASH,
      platform: PLATFORM,
      publicKey,
      governanceHash: `0x${"bb".repeat(32)}`,
    },
    dataSignature: "0x0102",
    attestation: "signed-attestation",
    proxySignature: "0x0304",
  };
}

function expectCode(action: () => unknown, code: string) {
  try {
    action();
    throw new Error("expected action to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(HushFlowCryptoError);
    expect((error as HushFlowCryptoError).code).toBe(code);
    expect((error as Error).message).not.toContain(GENERATOR_X.slice(2));
  }
}

describe("FCC /info public-key metadata", () => {
  it("returns the machine 64-byte X || Y secp256k1 public key", () => {
    const metadata = parseFccPublicKeyMetadata(validInfo(), expectations);

    expect(metadata.chainId).toBe(114n);
    expect(metadata.extensionId).toBe(EXTENSION_ID);
    expect(metadata.publicKey).toHaveLength(64);
    expect(Buffer.from(metadata.publicKey).toString("hex")).toBe(
      `${GENERATOR_X.slice(2)}${GENERATOR_Y.slice(2)}`,
    );
  });

  it.each([
    [
      "chain",
      (value: ReturnType<typeof validInfo>) => (value.teeInfo.chainId = 115),
      "FCC_INFO_IDENTITY_MISMATCH",
    ],
    [
      "extension",
      (value: ReturnType<typeof validInfo>) =>
        (value.machineData.extensionId = `0x${"12".repeat(32)}`),
      "FCC_INFO_IDENTITY_MISMATCH",
    ],
    [
      "platform",
      (value: ReturnType<typeof validInfo>) =>
        (value.machineData.platform = `0x${"34".repeat(32)}`),
      "FCC_INFO_IDENTITY_MISMATCH",
    ],
    [
      "code hash",
      (value: ReturnType<typeof validInfo>) =>
        (value.machineData.codeHash = `0x${"23".repeat(32)}`),
      "FCC_INFO_IDENTITY_MISMATCH",
    ],
    [
      "stale timestamp",
      (value: ReturnType<typeof validInfo>) =>
        (value.teeInfo.teeTimestamp = NOW_SECONDS - 301),
      "FCC_INFO_STALE",
    ],
  ])("rejects mismatched %s metadata", (_name, mutate, code) => {
    const value = validInfo();
    mutate(value);
    expectCode(() => parseFccPublicKeyMetadata(value, expectations), code);
  });

  it.each([
    ["short coordinate", { x: "0x12", y: GENERATOR_Y }],
    ["zero coordinate", { x: `0x${"00".repeat(32)}`, y: GENERATOR_Y }],
    [
      "invalid curve point",
      { x: `0x${"00".repeat(31)}01`, y: `0x${"00".repeat(31)}01` },
    ],
  ])("rejects a %s without exposing the raw key", (_name, publicKey) => {
    const value = validInfo();
    value.machineData.publicKey = publicKey;
    expectCode(
      () => parseFccPublicKeyMetadata(value, expectations),
      "FCC_PUBLIC_KEY_INVALID",
    );
  });

  it("rejects zero code hashes and unknown response fields strictly", () => {
    const zeroHash = validInfo();
    zeroHash.machineData.codeHash = `0x${"00".repeat(32)}`;
    expectCode(
      () =>
        parseFccPublicKeyMetadata(zeroHash, {
          ...expectations,
          codeHash: zeroHash.machineData.codeHash,
        }),
      "FCC_INFO_INVALID_RESPONSE",
    );

    expectCode(
      () =>
        parseFccPublicKeyMetadata(
          { ...validInfo(), rawSecret: "do-not-leak" },
          expectations,
        ),
      "FCC_INFO_INVALID_RESPONSE",
    );
  });

  it("fetches /info with an injectable fetch implementation", async () => {
    const fetcher = vi.fn(async () => Response.json(validInfo()));

    const result = await fetchFccPublicKey(
      "https://fcc.example/proxy/",
      expectations,
      { fetcher, timeoutMs: 100 },
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://fcc.example/proxy/info",
      expect.objectContaining({
        method: "GET",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result.publicKey).toHaveLength(64);
  });

  it("normalizes timeout, unavailable, HTTP, and malformed JSON failures", async () => {
    const never = vi.fn(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("raw-key-material", "AbortError")),
          );
        }),
    );
    await expect(
      fetchFccPublicKey("https://fcc.example", expectations, {
        fetcher: never,
        timeoutMs: 5,
      }),
    ).rejects.toMatchObject({
      code: "FCC_INFO_TIMEOUT",
      message: "FCC metadata request timed out",
    });

    await expect(
      fetchFccPublicKey("https://fcc.example", expectations, {
        fetcher: async () => {
          throw new Error("authorization=secret");
        },
      }),
    ).rejects.toMatchObject({
      code: "FCC_INFO_UNAVAILABLE",
      message: "FCC metadata is unavailable",
    });

    await expect(
      fetchFccPublicKey("https://fcc.example", expectations, {
        fetcher: async () => new Response("private response", { status: 502 }),
      }),
    ).rejects.toMatchObject({
      code: "FCC_INFO_UNAVAILABLE",
      message: "FCC metadata is unavailable",
    });

    await expect(
      fetchFccPublicKey("https://fcc.example", expectations, {
        fetcher: async () => new Response("private response", { status: 200 }),
      }),
    ).rejects.toMatchObject({
      code: "FCC_INFO_INVALID_RESPONSE",
      message: "FCC metadata response is invalid",
    });
  });
});
