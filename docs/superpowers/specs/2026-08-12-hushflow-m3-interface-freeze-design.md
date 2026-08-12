# HushFlow M3 Shared Packages and Interface Freeze Design

Date: 2026-08-12

Status: approved design; implementation pending plan

Branch: `codex/m3-interface-freeze`

## 1. Purpose

Milestone 3 creates one versioned source of truth for every interface shared by the contract, FCC extension, deployment tooling, future indexer, and future web application. It integrates the M1 live-readiness work with the locally complete M2 contract-safety work before M4A and M4B proceed independently.

M3 does not claim a live Coston2 deployment. Organizer credentials, the supported `tee-node` pin, extension registration, and real transaction evidence remain M1 acceptance work.

## 2. Ownership Boundaries

`@hushflow/protocol` exclusively owns:

- the HushFlow contract ABI and typed access surface;
- RFQ status, result type, payload kind, and schema-version constants;
- contract event schemas and log decoding;
- `EnvelopeV1`, `ResolutionInstructionV1`, and `ResultDataV1` canonical encoding;
- read-API DTO schemas;
- Coston2 deployment-manifest schemas;
- Coston2 explorer URL builders;
- versioned compatibility fixtures and hashes.

`@hushflow/crypto` exclusively owns:

- FCC `/info` public-key metadata validation;
- cryptographically secure payload nonces;
- construction and encryption of seller-minimum and provider-quote envelopes;
- chain, contract, RFQ, sender, payload-kind, value, and nonce binding checks;
- typed errors whose public messages never contain plaintext or key material.

Consumers may re-export these definitions but may not redefine them. The FCC service may retain transport-specific request types, but protocol values and encoding must come from the shared packages.

## 3. Protocol Package Layout

The package is split by responsibility so consumers import only stable public modules:

- `abi`: generated or reproducibly extracted HushFlow ABI plus typed contract helpers;
- `constants`: schema versions, enum values, Coston2 chain ID, and protocol limits;
- `fcc`: existing FCC envelope, instruction, and result codecs;
- `events`: typed event definitions and strict decoders;
- `deployment`: pending/live manifest schemas and activation guards;
- `read-api`: strict request and response DTO schemas for M4A/M4B;
- `explorer`: Coston2 address, block, and transaction URL builders;
- `fixtures`: versioned cross-consumer compatibility data.

The package root exports the supported public surface. Internal schema helpers are not exported. Bigint values remain `bigint` in application memory and decimal strings at JSON boundaries; floating-point amounts are forbidden.

## 4. Deployment Manifest State Machine

The deployment manifest is a strict discriminated union with `schemaVersion: 1`, `network: "coston2"`, and `chainId: 114`.

### 4.1 Pending manifest

A pending manifest has `status: "pending"` and contains only independently known configuration:

- token addresses that passed the existing Coston2 preflight;
- FCC registry addresses;
- the canonical ABI hash;
- a human-readable blocking reason selected from a closed reason enum;
- the manifest generation timestamp.

It must not contain a fabricated HushFlow address, extension identity, deployment block, deployment transaction hash, runtime code hash, or TEE signer. Transaction helpers call `requireLiveDeployment`; a pending manifest causes the typed `DEPLOYMENT_NOT_LIVE` error before wallet interaction.

### 4.2 Live manifest

A live manifest has `status: "live"` and additionally requires:

- HushFlow contract address;
- FCC extension identity and registered TEE signer;
- deployment block and transaction hash;
- deployed runtime code hash and ABI hash;
- evidence timestamp.

Promotion from pending to live is performed by deployment tooling only after reading the successful receipt and matching the deployed bytecode, configured signer, extension registration, chain ID, and ABI hash. Frontend or indexer code cannot synthesize a live manifest from environment variables.

## 5. ABI, Events, and Read DTOs

The ABI is derived from the integrated M1+M2 Solidity artifact and checked into a deterministic TypeScript module. A verification script regenerates a canonical JSON representation and fails when its hash differs from the manifest or fixture metadata.

The event layer covers `ExtensionIdInitialized`, `TeeSignerInitialized`, `RfqCreated`, `QuoteSubmitted`, `RfqCancelled`, `ResolutionRequested`, `RfqFinalized`, `RfqTimedOut`, and `Claimed`. Event decoders reject the wrong contract address, chain, event signature, field count, or unsupported schema version.

Read DTOs provide JSON-safe views for:

- deployment status;
- RFQ summary and detail;
- ordered provider participation without plaintext quote data;
- public lifecycle activity;
- per-account claimable amounts;
- cursor-based list responses and indexer health.

DTOs expose ciphertext only where the current public chain interface already exposes it. They never add decrypted minimums, decrypted quotes, losing-quote values, keys, nonces used for encryption internals, or raw provider/indexer errors.

## 6. FCC Public-Key and Encryption Contract

The crypto package fetches the extension proxy's `GET /info` response with a bounded timeout and validates the signed metadata shape required by HushFlow. The selected machine data must match the expected Coston2 chain, extension identity, nonzero code hash, supported platform, and a valid secp256k1 public key. The public key is accepted as the 64-byte `X || Y` representation used by `tee-node`; invalid coordinates, zero values, unexpected lengths, and stale or mismatched metadata are rejected.

Envelope encryption uses the official FCC-compatible ECIES profile demonstrated by Flare's `fce-sign` reference client: secp256k1 with go-ethereum `ECIES_AES128_SHA256`, fresh secure randomness, and no shared-info parameters. The TypeScript implementation must pass a cross-language fixture produced and decrypted by the pinned organizer-supported `tee-node`. A locally invented cipher format does not satisfy M3 acceptance.

Seller and provider helpers accept typed binding inputs, generate a fresh nonzero 32-byte nonce, construct and validate `EnvelopeV1`, serialize it canonically, and return ciphertext bytes. Plaintext values and serialized envelopes exist only in function-local memory. The package exposes no persistence callback, analytics callback, debug logger, or deterministic production nonce option.

## 7. Consumer Data Flow

1. A consumer parses the deployment manifest.
2. Read-only views may operate for either manifest state using known chain configuration.
3. Any wallet-writing flow first calls `requireLiveDeployment`.
4. The consumer fetches FCC `/info` and validates it against the live manifest.
5. The crypto package binds and encrypts the seller minimum or provider quote.
6. The consumer submits only ciphertext and public transaction parameters.
7. The indexer decodes contract logs through `@hushflow/protocol` and emits strict read DTOs.
8. The web application parses those DTOs through the same schemas.

No consumer imports another consumer's internals. Indexer and frontend can therefore begin in parallel after the M3 checkpoint.

## 8. Error and Privacy Model

Shared errors use closed, stable codes with redacted public messages. Error details may identify a field name, expected schema version, chain ID, or transaction hash, but must not include plaintext values, ciphertext contents, private keys, public-key raw bytes, decrypted payloads, secrets, authorization headers, indexer credentials, or tunnel tokens.

Network failures are normalized into timeout, unavailable, invalid-response, and identity-mismatch errors. Schema parsing rejects unknown fields and incompatible versions. No fallback silently accepts malformed FCC metadata or a pending deployment.

The browser build must contain no server-only environment variable, private key, indexer credential, or signer implementation. Package entry points separate browser-safe modules from deployment-only verification helpers.

## 9. Compatibility Fixtures and Tests

Fixtures live under a versioned directory and include their schema version, generator identity, ABI hash, and expected decode result. Required verification includes:

1. TypeScript-generated `ResultDataV1` bytes decode identically in Solidity.
2. A canonical FCC `ActionResult` fixture validates through `HushFlowResultVerifier`.
3. Every contract event fixture decodes to the same normalized record used by the future indexer and web adapter.
4. Unknown schema versions, extra fields, invalid enum values, unsafe numbers, malformed addresses, and inconsistent deployment states are rejected.
5. Amount parsing and formatting round-trip decimal strings and bigint values without floating-point conversion.
6. Pending manifests block writes; complete live fixtures enable them.
7. Public-key metadata and ECIES fixtures interoperate with the pinned FCC reference implementation.
8. Browser-bundle inspection finds no server secret, private key, credential variable, Node-only crypto import, or plaintext fixture.
9. Repository checks prove consumers do not own duplicate ABI, address, enum, DTO, or encryption implementations.

All new production behavior follows RED-GREEN checkpoints. Shared package line and branch coverage must remain at least 80%, with all protocol parsing, activation guards, binding validation, and redaction branches exercised.

## 10. External Compatibility Baseline

The FCC compatibility reference is Flare's official `fce-sign` repository at commit `6df972c64d34efe1d4497f0eafe6792d1f0862dd`. Its reference client fetches TEE machine data from the extension proxy `/info`, parses the secp256k1 key, and encrypts with go-ethereum `ECIES_AES128_SHA256`. The version used for live evidence must additionally match the organizer-supported `tee-node` pin from M1.

This pinned source reference informs the local contract but does not substitute for organizer credentials, attestation, registration, or a real Coston2 transaction.

## 11. Scope Exclusions

M3 does not implement:

- the event indexer, database, or HTTP server;
- the web application or wallet interaction screens;
- live contract deployment or extension registration;
- container packaging, proxy hosting, tunneling, or indexer credentials;
- storage or disclosure of decrypted RFQ values.

Those concerns remain in M1 acceptance or begin in M4 after interface freeze.

## 12. Completion Gate

M3 is complete when:

- the integrated M1+M2 baseline remains green;
- protocol and crypto packages expose the approved stable entry points;
- pending and live manifests are strictly differentiated and write-gated;
- ABI, event, FCC, DTO, amount, encryption, redaction, and browser-safety tests pass;
- versioned fixtures and their provenance are committed;
- no shared protocol definition is duplicated by a consumer;
- coverage, formatting, lint, typecheck, build, dependency audit, secret scan, and diff review pass;
- a local interface-freeze checkpoint commit is recorded before M4A and M4B branch.

If the organizer-supported encryption or `tee-node` fixture is still unavailable, the corresponding implementation may be locally complete but M3 acceptance remains explicitly pending; no incompatible local cipher may be labeled live-compatible.
