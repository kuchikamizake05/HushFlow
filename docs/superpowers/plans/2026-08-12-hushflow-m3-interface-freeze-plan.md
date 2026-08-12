# HushFlow M3 Shared Packages and Interface Freeze Implementation Plan

Date: 2026-08-12

Design: `docs/superpowers/specs/2026-08-12-hushflow-m3-interface-freeze-design.md`

Branch: `codex/m3-interface-freeze`

## Working Rules

- Work only in the isolated M3 worktree.
- Preserve the integrated M1 FCC wire format and M2 contract behavior.
- Write and execute focused RED tests before production changes.
- Commit validated RED and GREEN checkpoints separately.
- Keep manifests explicitly pending until live evidence exists.
- Do not push, deploy, register, or place credentials in the repository.

## Phase 1: Protocol Core and Deployment State

### Task 1.1: Canonical constants and amount boundaries

Files:

- `packages/protocol/src/constants.ts`
- `packages/protocol/src/amounts.ts`
- `scripts/fixtures/protocol-interface-freeze.test.ts`

RED cases:

- enum values and protocol limits match the integrated contract;
- decimal-string amounts round-trip as bigint;
- floats, signs, exponent notation, leading zeroes, and uint256 overflow reject.

GREEN behavior:

- publish immutable versioned constants;
- expose JSON-safe amount parsing and formatting without Number conversion.

### Task 1.2: Pending/live deployment manifest

Files:

- `packages/protocol/src/deployment.ts`
- `packages/protocol/src/deployments/coston2.ts`
- `scripts/fixtures/deployment-manifest.test.ts`

RED cases:

- the checked-in Coston2 manifest parses as pending;
- pending manifests reject all live-only fields and block writes;
- live manifests require every evidence field and reject malformed hashes or chain data;
- unknown versions, fields, reasons, and networks reject.

GREEN behavior:

- implement a strict discriminated union;
- expose `requireLiveDeployment` with a stable redacted error;
- check in an honest pending Coston2 manifest.

## Phase 2: Contract ABI, Events, and Read DTOs

### Task 2.1: Canonical ABI and hash

Files:

- `packages/protocol/src/abi.ts`
- `scripts/generate-protocol-abi.ts`
- `scripts/fixtures/abi-freeze.test.ts`

RED cases:

- the exported ABI contains every public M2 function and event;
- canonical ABI hash is stable and matches the pending manifest;
- regenerated artifact and checked-in module are identical.

GREEN behavior:

- derive the ABI reproducibly from the Forge artifact;
- publish the ABI and canonical hash from the protocol package.

### Task 2.2: Strict event decoding

Files:

- `packages/protocol/src/events.ts`
- `packages/protocol/fixtures/v1/events.json`
- `scripts/fixtures/event-compatibility.test.ts`

RED cases:

- every HushFlow lifecycle event decodes into a normalized JSON-safe record;
- wrong address, chain, signature, and malformed log reject;
- fixture decode results are stable across consumer adapters.

GREEN behavior:

- use only the canonical ABI;
- preserve ordered provider and lifecycle data without interpreting ciphertext.

### Task 2.3: Read API DTOs and explorer helpers

Files:

- `packages/protocol/src/read-api.ts`
- `packages/protocol/src/explorer.ts`
- `scripts/fixtures/read-api.test.ts`

RED cases:

- deployment, RFQ, activity, claim, cursor, and health DTOs accept valid JSON-safe data;
- extra fields, unsafe numeric values, invalid enums, and plaintext fields reject;
- Coston2 address, transaction, and block URLs are encoded correctly.

GREEN behavior:

- publish strict Zod DTOs and inferred types;
- centralize explorer URL generation.

## Phase 3: Crypto Package

### Task 3.1: FCC machine metadata

Files:

- `packages/crypto/package.json`
- `packages/crypto/src/metadata.ts`
- `scripts/fixtures/fcc-public-key.test.ts`

RED cases:

- valid Coston2 `/info` metadata yields a 64-byte secp256k1 key;
- wrong chain, extension, platform, code hash, key length, zero key, invalid point, timeout, and malformed JSON reject;
- error messages redact raw responses and keys.

GREEN behavior:

- parse strict metadata and validate identity bindings;
- expose a bounded, injectable fetch helper.

### Task 3.2: Secure envelope construction

Files:

- `packages/crypto/src/envelope.ts`
- `scripts/fixtures/crypto-envelope.test.ts`

RED cases:

- seller and provider envelopes bind every protocol field;
- each call gets a fresh nonzero nonce;
- wrong sender, kind, value, chain, contract, or RFQ rejects;
- production API exposes no deterministic nonce, storage, analytics, or logging hook.

GREEN behavior:

- construct canonical EnvelopeV1 bytes in function-local scope;
- use Web Crypto secure randomness.

### Task 3.3: FCC-compatible ECIES

Files:

- `packages/crypto/src/ecies.ts`
- `packages/crypto/src/index.ts`
- `packages/crypto/fixtures/v1/ecies.json`
- `scripts/fixtures/ecies-compatibility.test.ts`

RED cases:

- ciphertext layout and decryption match the pinned Flare/go-ethereum reference fixture;
- ephemeral key, IV, KDF, AES-CTR, and HMAC tampering reject;
- browser-safe entry point imports no Node crypto module.

GREEN behavior:

- implement secp256k1 ECIES AES128-SHA256 with fresh randomness;
- document the organizer-supported tee-node fixture as the remaining live-acceptance gate if unavailable.

## Phase 4: Consumer Migration and Freeze

### Task 4.1: Remove duplicate protocol ownership

Files:

- `services/fcc-extension/src/**`
- `scripts/coston2/**`
- package manifests and TypeScript configs

RED cases:

- repository ownership test identifies duplicate enums, ABI, addresses, or codecs;
- FCC and deployment scripts compile against package root exports.

GREEN behavior:

- migrate consumers to shared exports;
- leave only transport-specific types in consumers.

### Task 4.2: Browser and privacy gate

Files:

- `scripts/fixtures/browser-safety.test.ts`
- package export maps and build configs

RED cases:

- browser bundle fails if it contains private-key/indexer env names, Node-only imports, plaintext fixtures, or server code;
- public errors never contain supplied sensitive sentinel values.

GREEN behavior:

- split browser-safe and deployment-only exports;
- keep sensitive diagnostics out of public errors.

## Phase 5: Final Verification

Run:

- formatting, lint, typecheck, build, unit tests, and at least 80% shared-package coverage;
- Forge unit, fuzz, invariant, coverage, format, and gas checks;
- dependency audit, secret scan, generated-artifact drift check, and diff review;
- the complete integrated M1 compatibility fixture suite.

Record exact results in `docs/verification/m3-interface-freeze.md`. Commit the clean local interface-freeze checkpoint. Do not merge to `main`, push, or deploy without explicit approval.
