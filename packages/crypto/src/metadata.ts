import { z } from "zod";

import { HushFlowCryptoError } from "./errors.js";

export { HushFlowCryptoError } from "./errors.js";

const ZERO_HASH = `0x${"0".repeat(64)}`;
const hash = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/)
  .refine((value) => value.toLowerCase() !== ZERO_HASH);
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const coordinate = z.string().regex(/^0x[0-9a-fA-F]+$/);
const publicKey = z.strictObject({ x: coordinate, y: coordinate });
const safeInt = z.number().int().nonnegative().safe();
const state = z.strictObject({
  systemState: z.string(),
  systemStateVersion: hash,
  state: z.string(),
  stateVersion: hash,
});
const infoSchema = z.strictObject({
  teeInfo: z.strictObject({
    challenge: hash,
    publicKey,
    initialSigningPolicyId: safeInt,
    initialSigningPolicyHash: hash,
    lastSigningPolicyId: safeInt,
    lastSigningPolicyHash: hash,
    chainId: safeInt,
    state,
    teeTimestamp: safeInt,
    machinePathListNonce: safeInt,
    machinePathListHash: hash,
  }),
  machineData: z.strictObject({
    extensionId: hash,
    initialOwner: address,
    codeHash: hash,
    platform: hash,
    publicKey,
    governanceHash: hash,
  }),
  dataSignature: z.string().regex(/^0x(?:[0-9a-fA-F]{2})+$/),
  attestation: z.string().min(1),
  proxySignature: z.string().regex(/^0x(?:[0-9a-fA-F]{2})+$/),
});

export interface FccMetadataExpectations {
  chainId: bigint;
  extensionId: string;
  codeHash: string;
  supportedPlatforms: readonly string[];
  maxAgeSeconds: number;
  nowSeconds: number;
}

export interface FccPublicKeyMetadata {
  chainId: bigint;
  extensionId: string;
  codeHash: string;
  platform: string;
  publicKey: Uint8Array;
}

const P = (1n << 256n) - (1n << 32n) - 977n;

function invalid(code: string, message: string): never {
  throw new HushFlowCryptoError(code, message);
}

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function parsePoint(key: { x: string; y: string }): Uint8Array {
  if (key.x.length !== 66 || key.y.length !== 66) {
    invalid("FCC_PUBLIC_KEY_INVALID", "FCC public key is invalid");
  }
  const x = BigInt(key.x);
  const y = BigInt(key.y);
  if (
    x === 0n ||
    y === 0n ||
    x >= P ||
    y >= P ||
    (y * y) % P !== (x * x * x + 7n) % P
  ) {
    invalid("FCC_PUBLIC_KEY_INVALID", "FCC public key is invalid");
  }
  return hexToBytes(`${key.x.slice(2)}${key.y.slice(2)}`);
}

export function parseFccPublicKeyMetadata(
  input: unknown,
  expected: FccMetadataExpectations,
): FccPublicKeyMetadata {
  const result = infoSchema.safeParse(input);
  if (!result.success)
    invalid("FCC_INFO_INVALID_RESPONSE", "FCC metadata response is invalid");
  const value = result.data;
  if (
    BigInt(value.teeInfo.chainId) !== expected.chainId ||
    value.machineData.extensionId.toLowerCase() !==
      expected.extensionId.toLowerCase() ||
    value.machineData.codeHash.toLowerCase() !==
      expected.codeHash.toLowerCase() ||
    !expected.supportedPlatforms.some(
      (platform) =>
        platform.toLowerCase() === value.machineData.platform.toLowerCase(),
    )
  ) {
    invalid(
      "FCC_INFO_IDENTITY_MISMATCH",
      "FCC metadata identity does not match",
    );
  }
  const age = expected.nowSeconds - value.teeInfo.teeTimestamp;
  if (age < 0 || age > expected.maxAgeSeconds) {
    invalid("FCC_INFO_STALE", "FCC metadata is stale");
  }
  return {
    chainId: BigInt(value.teeInfo.chainId),
    extensionId: value.machineData.extensionId.toLowerCase(),
    codeHash: value.machineData.codeHash.toLowerCase(),
    platform: value.machineData.platform.toLowerCase(),
    publicKey: parsePoint(value.machineData.publicKey),
  };
}

export async function fetchFccPublicKey(
  proxyUrl: string,
  expected: FccMetadataExpectations,
  options: { fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<FccPublicKeyMetadata> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 10_000,
  );
  try {
    const response = await (options.fetcher ?? fetch)(
      `${proxyUrl.replace(/\/$/, "")}/info`,
      { method: "GET", signal: controller.signal },
    );
    if (!response.ok)
      invalid("FCC_INFO_UNAVAILABLE", "FCC metadata is unavailable");
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      invalid("FCC_INFO_INVALID_RESPONSE", "FCC metadata response is invalid");
    }
    return parseFccPublicKeyMetadata(body, expected);
  } catch (error) {
    if (error instanceof HushFlowCryptoError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      invalid("FCC_INFO_TIMEOUT", "FCC metadata request timed out");
    }
    invalid("FCC_INFO_UNAVAILABLE", "FCC metadata is unavailable");
  } finally {
    clearTimeout(timer);
  }
}
