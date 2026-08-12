# Milestone 1 Local FCC Slice Evidence

Status: local implementation complete; live Coston2 acceptance pending

Date: 2026-08-12

## Implemented locally

- Versioned EnvelopeV1 and ResultDataV1 protocol parsers and ABI encoding.
- Canonical result-data decoding in TypeScript and Solidity.
- FCC ActionResult verification with the documented chain-scoped EIP-191 signature domain.
- Confidential resolver selection rules: invalid seller payload becomes `INVALID_RFQ`; malformed, misbound, zero, over-cap, and below-minimum provider quotes are ignored; the highest qualifying quote wins; equal quotes preserve submission order.
- FCC-backed RFQ custody slice: fixed FXRP lot, fixed USDT0 provider collateral, maximum 20 providers, ciphertext-size ceiling, FCC instruction forwarding, action/result replay protection, terminal outcomes, timeout, and pull-based claims.
- Exact-transfer accounting rejects unsupported fee-on-transfer token behavior during deposits.

## Local verification

| Gate | Result |
| --- | --- |
| TypeScript protocol and resolver tests | 18 passed |
| TypeScript coverage | 95.65% statements, 91.66% branches |
| Solidity verifier and RFQ tests | 12 passed |
| Solidity coverage | 88.37% lines, 84.82% statements |
| Solidity formatting | passed |
| Workspace format, lint, typecheck, test coverage, build | passed |
| Dependency audit at high severity | passed; one moderate advisory remains |
| Secret scan of tracked source/configuration | no matches for private-key or ngrok-token patterns |

The Solidity scenarios cover valid trade settlement, `NO_VALID_QUOTE`, `INVALID_RFQ`, timeout refunds, duplicate quotes, a 20-provider cap, non-participating winner rejection, ActionResult replay rejection, result-binding rejection, expiry rejection, and ActionResult field substitution rejection.

## Evidence commits

- `dda7908` through `77ebd9a`: protocol, verifier, and resolver TDD checkpoints.
- `2e6a800`: RED RFQ custody lifecycle tests.
- `54628af`: FCC-backed RFQ custody implementation.
- `6506bfd`: invalid-RFQ refund coverage.
- `373c0e3`: verification-ignore and dependency hardening.

## Not yet demonstrated

This document does **not** claim that M1 is live or complete. The following acceptance work is blocked on FCC organizer access and requires explicit deployment approval:

- Read-only C-chain indexer credentials in the extension proxy configuration.
- A Coston2-only public proxy URL while the guided demo is running.
- Extension image/container implementation wired to the official FCC scaffold contract and handler interfaces.
- Coston2 deployment, extension registration, TEE signer/identity evidence, encrypted payload submission with the live extension public key, and signed-result relay.
- Real Coston2 transaction hashes for trade, no-valid-quote, invalid-RFQ, replay/stale rejection, timeout, and claims.

No private key, indexer credential, or tunnel token is recorded here.
