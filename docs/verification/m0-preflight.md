# Milestone 0 Preflight Evidence

Status: locally complete; external FCC access blocked

Date: 2026-07-22

Plan commit: 4c4f079

Scaffold commit: 08db460

## Confirmed

- Repository started documentation-only.
- WSL2 Ubuntu 24.04 is available.
- Docker Desktop 29.1.3 is installed.
- The pinned local toolchain passes with Node.js 24.18.0, pnpm 11.15.1, Go 1.26.5, Foundry 1.7.1, and Docker 29.1.3.
- The exact lockfile installs offline and passes pnpm supply-chain policy checks.
- The root format, lint, typecheck, coverage harness, and build gates pass.
- PostgreSQL 18.4 reaches healthy state from its pinned digest and is removed after the smoke test.
- Coston2 public RPC and official documentation are reachable.
- Coston2 reports chain ID 114.
- The Asset Manager reports FXRP at `0x0b6A3645c240605887a5532109323A3E12273dc7` with symbol `FTestXRP` and 6 decimals.
- The current USDT0 candidate at `0xC1A5B41512496B80903D1f32d6dEa3a73212E71F` has deployed code, symbol `USD₮0`, and 6 decimals.
- FCC reference commits were recorded.
- Published Flare periphery packages report MIT licenses.
- PostgreSQL 18.4 multi-platform image digest was resolved.

## Open blockers

- FCC C-chain indexer credentials are not present in the environment.
- FCC extension proxy URL is not present.
- The exact USDT0 token dispensed by the official Coston2 faucet has not been confirmed through an approved faucet request.
- FCC reference repository source cannot be copied until its license or permission is documented.

The FCC and faucet blockers require user-provided access or explicit approval for an external action. They do not invalidate the local reproducibility gate.

## First RED handoff

The interface-first M1 tests were executed after the green M0 scaffold gate:

- Vitest fails because `packages/protocol/src/fcc.js` does not exist yet.
- Forge fails because `contracts/src/HushFlowResultVerifier.sol` does not exist yet.

These are the intended RED signals. No production protocol or verifier code was added while the external M1 blockers remain open.

## Privacy

Environment checks report only SET or MISSING. No secret value is recorded in this document.
