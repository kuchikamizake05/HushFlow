# Milestone 1 Local FCC Slice Evidence

Status: local implementation complete; live Coston2 acceptance pending

Date: 2026-08-12

## Implemented locally

- Versioned EnvelopeV1 and ResultDataV1 protocol parsers and ABI encoding.
- Canonical result-data decoding in TypeScript and Solidity.
- FCC ActionResult verification with the documented chain-scoped EIP-191 signature domain.
- Confidential resolver selection rules: invalid seller payload becomes `INVALID_RFQ`; malformed, misbound, zero, over-cap, and below-minimum provider quotes are ignored; the highest qualifying quote wins; equal quotes preserve submission order.
- A versioned `RESOLVE_RFQ` instruction ABI is shared by the contract and TypeScript protocol package, including provider ordering and the absolute resolution deadline.
- The local FCC action adapter accepts only `HUSHFLOW/RESOLVE_RFQ`, decrypts provider envelopes independently, returns canonical ABI result bytes, and does not log plaintext or losing quotes.
- FCC-backed RFQ custody slice: fixed FXRP lot, fixed USDT0 provider collateral, maximum 20 providers, ciphertext-size ceiling, FCC instruction forwarding, action/result replay protection, terminal outcomes, timeout, and pull-based claims.
- The signer can be supplied at construction or initialized exactly once by the deployer after extension registration. RFQ creation remains blocked until it is set; it cannot be replaced afterward.
- Exact-transfer accounting rejects unsupported fee-on-transfer token behavior during deposits.

## Local verification

| Gate | Result |
| --- | --- |
| TypeScript protocol, resolver, and action-adapter tests | 24 passed |
| TypeScript coverage | 98.01% statements, 93.18% branches |
| Solidity verifier and RFQ tests | 14 passed |
| Solidity coverage | 89.50% lines, 85.61% statements |
| Solidity formatting | passed |
| Workspace format, lint, typecheck, test coverage, build | passed |
| Dependency audit at high severity | passed; one moderate advisory remains |
| Secret scan of tracked source/configuration | no matches for private-key or ngrok-token patterns |

The Solidity scenarios cover valid trade settlement, `NO_VALID_QUOTE`, `INVALID_RFQ`, timeout refunds, duplicate quotes, a 20-provider cap, non-participating winner rejection, ActionResult replay rejection, result-binding rejection, expiry rejection, ActionResult field substitution rejection, one-time TEE signer initialization, and FCC instruction reentrancy rejection.

## Evidence commits

- `dda7908` through `77ebd9a`: protocol, verifier, and resolver TDD checkpoints.
- `2e6a800`: RED RFQ custody lifecycle tests.
- `54628af`: FCC-backed RFQ custody implementation.
- `6506bfd`: invalid-RFQ refund coverage.
- `373c0e3`: verification-ignore and dependency hardening.
- `3d364c7` and `b276a89`: one-time TEE signer initialization RED/GREEN checkpoints.
- `a15bee6` and `881cf14`: versioned FCC resolution instruction RED/GREEN checkpoints.
- `22afe19` and `11397b4`: confidential FCC action adapter RED/GREEN checkpoints.
- `d653d32` and `abe8fd7`: FCC instruction reentrancy RED/GREEN checkpoints.

## Not yet demonstrated

This document does **not** claim that M1 is live or complete. The following acceptance work is blocked on FCC organizer access and requires explicit deployment approval:

- Read-only C-chain indexer credentials in the extension proxy configuration.
- A Coston2-only public proxy URL while the guided demo is running.
- Extension image/container implementation wired to the official FCC scaffold contract and handler interfaces.
- Coston2 deployment, extension registration, and evidence that the one-time configured signer equals the registered FCC machine signer. Current public registry interface evidence is insufficient to prove that binding in-contract, so this must be demonstrated in deployment evidence before activation.
- Encrypted payload submission with the live extension public key and signed-result relay.
- Real Coston2 transaction hashes for trade, no-valid-quote, invalid-RFQ, replay/stale rejection, timeout, and claims.

No private key, indexer credential, or tunnel token is recorded here.
