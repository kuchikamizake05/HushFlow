# Milestone 4A Indexer and Read API Evidence

Status: local implementation complete; live Coston2 acceptance pending

Date: 2026-08-12

## Implemented locally

- A dedicated TypeScript indexer service with separate worker and read-only API processes.
- Fail-closed fixture/live configuration. Live mode requires the versioned Coston2 deployment manifest; pending addresses are never treated as deployed infrastructure.
- Explicit checksum-verified PostgreSQL migrations for canonical logs, cursors, health, RFQs, quotes, results, actions, outcomes, and claims.
- Atomic, parameterized ingestion: source logs, derived state, cursor, and health are committed together or rolled back together.
- Deterministic lifecycle projection for open RFQs, encrypted quotes, FCC instructions/results, settlement, invalid/no-quote outcomes, timeouts, and claims.
- Idempotent restart replay and bounded reorg reconciliation. Canonical block number, hash, and parent-hash continuity are verified before committing progress.
- Bounded viem RPC reads plus a coherent local fixture source for offline verification.
- Versioned DTOs and strict read-only HTTP routes for deployment state, RFQ lists/details/activity/proofs, portfolio claims, protocol statistics, and indexer health.
- Opaque cursor pagination, bounded filters, strict request validation, method rejection, redacted server errors, and honest `503` responses for deployment-dependent reads while the manifest is pending.
- Separate minimal container entry points for the worker and API. The runtime image uses a digest-pinned Node 24.18 base and installs only the indexer's production dependency closure.

## Local verification

| Gate | Result |
| --- | --- |
| TypeScript tests | 219 passed, 0 failed |
| TypeScript coverage | 92.27% lines, 90.87% statements, 94.89% functions, 81.29% branches |
| Solidity regression tests | 52 passed, 0 failed, 0 skipped |
| Indexer lint, typecheck, build, and targeted formatting | passed |
| Protocol typecheck and build | passed |
| Real PostgreSQL integration | passed against PostgreSQL 18 |
| Minimal worker container smoke | passed; fixture remained idempotently `1:SETTLED` |
| Separate worker/API container smoke | passed; API exposed settled RFQ and healthy indexed cursor |
| Dependency audit | 0 high/critical; 1 moderate advisory remains |
| Secret scan | no populated private-key, database-password, or tunnel-token assignments found |

The security pass found that a numerically continuous batch could previously omit parent-hash validation. A RED regression test reproduced the broken ancestry, then the store was hardened to reject non-contiguous block numbers and parent hashes before state mutation. No remaining high-confidence exploitable finding was identified in the M4A surface.

## Evidence commits

- `c5709cb` and `9d94755`: approved M4A design and implementation plan.
- `235436f` through `8e72782`: configuration and checksum-verified migration RED/GREEN checkpoints.
- `93ae97d` through `4cb4cc9`: deterministic projection and atomic PostgreSQL ingestion RED/GREEN checkpoints.
- `f78e4c0` through `be60c02`: restart replay, reorg reconciliation, and resumable worker RED/GREEN checkpoints.
- `de13b2a` through `f8ead28`: versioned DTO, PostgreSQL repository, and read-only HTTP RED/GREEN checkpoints.
- `f354afc` through `27a8314`: bounded viem source and coherent fixture-chain RED/GREEN checkpoints.
- `667c862` through `25cd59a`: process packaging, path portability, stable startup errors, canonical ancestry validation, and minimal pinned runtime image.

## Not yet demonstrated

This document does **not** claim live M4A acceptance. The remaining evidence depends on the organizer-approved M1 deployment inputs and explicit deployment approval:

- A live Coston2 deployment manifest containing the real contract address and deployment block.
- Sustained ingestion from the real Coston2 RPC and deployed HushFlow contract.
- Restart catch-up and a real or controlled Coston2 reorg/reconciliation demonstration.
- Live RFQ, quote, FCC result, settlement/refund, timeout, replay rejection, and claim data visible through the read API with transaction hashes.
- Operator evidence for production database retention, monitoring, and recovery.

The active Windows shell uses Node 24.13 while the repository requires Node 24.18 or newer. Direct package gates passed locally, and the container verification used the digest-pinned Node 24.18 runtime. No private key, organizer credential, or tunnel token is recorded here.
