import { secp256k1 } from "@noble/curves/secp256k1";

import { HushFlowCryptoError } from "./errors.js";

const EPHEMERAL_PUBLIC_KEY_BYTES = 65;
const IV_BYTES = 16;
const TAG_BYTES = 32;

function fail(code: string, message: string): never {
  throw new HushFlowCryptoError(code, message);
}

function concat(...items: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    items.reduce((total, item) => total + item.length, 0),
  );
  let offset = 0;
  for (const item of items) {
    output.set(item, offset);
    offset += item.length;
  }
  return output;
}

async function sha256(value: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", value));
}

async function concatKdf(sharedX: Uint8Array): Promise<Uint8Array> {
  return sha256(concat(new Uint8Array([0, 0, 0, 1]), sharedX));
}

function parsePublicKey(publicKey: Uint8Array): Uint8Array {
  if (publicKey.length !== 64) {
    fail("FCC_PUBLIC_KEY_INVALID", "FCC public key is invalid");
  }
  const uncompressed = concat(new Uint8Array([4]), publicKey);
  try {
    secp256k1.ProjectivePoint.fromHex(uncompressed).assertValidity();
    return uncompressed;
  } catch {
    fail("FCC_PUBLIC_KEY_INVALID", "FCC public key is invalid");
  }
}

export async function encryptFccEcies(
  publicKey: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  if (!(plaintext instanceof Uint8Array) || plaintext.length === 0) {
    fail("ECIES_PLAINTEXT_INVALID", "ECIES plaintext is invalid");
  }
  const recipient = parsePublicKey(publicKey);
  const ephemeralPrivateKey = secp256k1.utils.randomPrivateKey();
  const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, false);
  const sharedPoint = secp256k1.getSharedSecret(
    ephemeralPrivateKey,
    recipient,
    false,
  );
  const keyMaterial = await concatKdf(sharedPoint.slice(1, 33));
  const encryptionKey = keyMaterial.slice(0, 16);
  const macKey = await sha256(keyMaterial.slice(16, 32));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const aesKey = await crypto.subtle.importKey(
    "raw",
    encryptionKey,
    "AES-CTR",
    false,
    ["encrypt"],
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-CTR", counter: iv, length: 128 },
      aesKey,
      plaintext,
    ),
  );
  const authenticated = concat(iv, ciphertext);
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    macKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const tag = new Uint8Array(
    await crypto.subtle.sign("HMAC", hmacKey, authenticated),
  );
  if (
    tag.length !== TAG_BYTES ||
    ephemeralPublicKey.length !== EPHEMERAL_PUBLIC_KEY_BYTES
  ) {
    fail("ECIES_ENCRYPTION_FAILED", "FCC encryption failed");
  }
  return concat(ephemeralPublicKey, authenticated, tag);
}
