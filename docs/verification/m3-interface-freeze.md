# M3 Local Interface Freeze Verification

Date: 2026-08-12

## Status

M3 is locally complete as an interface-freeze candidate. Official/live acceptance remains pending until the organizer-supported `tee-node` version and FCC access are available for a Coston2 compatibility run.

The Coston2 manifest intentionally remains `pending`. No contract address, extension ID, signer, deployment block, or transaction hash has been invented.

## Delivered

- Canonical protocol constants, RFQ/result enums, and uint256-safe decimal amount serialization.
- Reproducible ABI generated from the Forge artifact.
- Strict pending/live deployment manifest with a write guard for non-live deployments.
- Versioned read DTOs, explorer links, and strict event decoding.
- Browser-safe FCC metadata validation and encrypted envelope construction.
- Browser-safe secp256k1 ECIES compatible with the go-ethereum profile used by FCC.
- Shared protocol ownership gates that prevent duplicate local constants.

Canonical ABI SHA-256:

`0x57704ed80868d0465424ea69800fc304b9e3c81bbcad2c3535aa9bb1d8c75faf`

## Automated verification

| Gate | Result |
| --- | --- |
| TypeScript/Vitest | 135 passed, 0 failed |
| Solidity/Forge | 52 passed, 0 failed, 0 skipped |
| TypeScript typecheck | scripts, protocol, and crypto passed |
| Package build | protocol and crypto passed |
| ESLint | M3 scope passed |
| Prettier | M3 scope passed |
| ABI regeneration | passed with no tracked drift |
| Secret scan | no populated private-key/indexer/ngrok secret assignments found |
| Dependency audit | 0 high, 0 critical; 1 moderate |

Vitest coverage:

| Metric | Coverage |
| --- | --- |
| Lines | 92.90% (458/493) |
| Statements | 92.23% (475/515) |
| Functions | 94.30% (116/123) |
| Branches | 89.43% (220/246) |

## Compatibility and security evidence

- A ciphertext produced by `@hushflow/crypto` was manually decrypted by go-ethereum ECIES using the corresponding secp256k1 private key; the recovered plaintext exactly matched `hushflow-fcc-v1`.
- Metadata rejects malformed or off-curve public keys, identity mismatches, stale/future timestamps, invalid responses, timeouts, and unavailable endpoints with redacted error messages.
- Envelopes bind chain ID, contract, RFQ ID, sender, payload kind, amount, and a CSPRNG nonce.
- Event decoding rejects wrong schema, chain, contract, selector, topic count, and malformed event data.
- Deployment writes fail closed while the manifest is pending.
- Final M3 diff security review found no high-confidence exploitable vulnerability.

The organizer-supported `tee-node` pin is still required to validate the exact live `/info` response, attestation/signature expectations, and ciphertext decryption path. This is a live acceptance dependency, not represented as locally proven.

## Environment limitations

- The root Turbo command is blocked on this Windows host by Application Control (`spawn UNKNOWN`). Equivalent direct package typecheck, build, lint, formatting, Vitest, and Forge gates passed.
- The active shell exposes Node 24.13.0 while the repository declares Node 24.18.x. Direct M3 gates passed, but release automation should use the pinned repository runtime.
- The root formatting gate still reports pre-existing formatting drift outside M3 scope; M3-touched files pass the targeted formatting gate.

## Remaining live acceptance

1. Obtain organizer FCC/indexer access and the supported `tee-node` version.
2. Run the two-process FCC container and Coston2 proxy/tunnel.
3. After explicit deployment approval, deploy/register the extension and contracts.
4. Replace the pending manifest with verified live addresses, code hashes, deployment block, and transaction hashes.
5. Execute the real Coston2 RFQ matrix and archive explorer evidence.
