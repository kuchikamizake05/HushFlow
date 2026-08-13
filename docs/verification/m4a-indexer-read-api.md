# Milestone 4A Indexer and Read API Evidence

Status: local implementation complete; live Coston2 acceptance pending

Date: 2026-08-13

## Implemented locally

- A dedicated TypeScript indexer service with separate worker and read-only API processes.
- Fail-closed fixture/live configuration. Mode, fixture path, and source identity are explicit; live mode requires the versioned Coston2 deployment manifest. Pending addresses are never treated as deployed infrastructure.
- Explicit checksum-verified PostgreSQL migrations for canonical logs, cursors, health, RFQs, quotes, results, actions, outcomes, and claims.
- Atomic, parameterized ingestion: source logs, derived state, cursor, and health are committed together or rolled back together.
- Deterministic lifecycle projection for open RFQs, encrypted quotes, FCC instructions/results, settlement, invalid/no-quote outcomes, timeouts, and claims.
- Idempotent restart replay and bounded reorg reconciliation wired into the worker. The configured reconciliation window is read in RPC chunks of at most 1,000 blocks; canonical block number, hash, and parent-hash continuity are verified before committing progress. A deep reorg fails closed with `REORG_REPLAY_REQUIRED`.
- Bounded viem RPC reads plus a coherent local fixture source for offline verification.
- Versioned DTOs and strict read-only HTTP routes for deployment state, data provenance, RFQ lists/details/activity/proofs, cursor-paginated portfolio claims, protocol statistics, and indexer health. Proof v1 remains compatible; Proof Center v2 explicitly distinguishes `PARTIAL` from signed-result `VERIFIED` evidence.
- Opaque cursor pagination, bounded filters and 4,096-byte ciphertexts, strict request validation, method rejection, `400 INVALID_CURSOR`, redacted server errors, and stable `503 DATABASE_UNAVAILABLE` behavior.
- Separate minimal container entry points for the worker and API. The runtime image uses a digest-pinned Node 24.18 base and installs only the indexer's production dependency closure.

## Local verification

| Gate | Result |
| --- | --- |
| TypeScript tests | 238 passed, 0 failed |
| TypeScript coverage | 91.65% lines, 90.29% statements, 94.97% functions, 80.83% branches |
| Solidity regression tests | 52 passed, 0 failed, 0 skipped |
| Indexer lint, typecheck, build, and targeted formatting | passed |
| Protocol typecheck and build | passed |
| Real PostgreSQL integration | passed against PostgreSQL 18 |
| Separate worker/API cold-schema container smoke | passed; migrations serialized, fixture provenance was explicit, settled RFQ was corrected, and health reported zero lag |
| Dependency audit | 0 high/critical; 1 moderate advisory remains |
| Secret scan | no populated private-key, database-password, or tunnel-token assignments found |

The security pass found that a numerically continuous batch could previously omit parent-hash validation. A RED regression test reproduced the broken ancestry, then the store was hardened to reject non-contiguous block numbers and parent hashes before state mutation.

The final two-process container smoke also reproduced a cold-start migration race between the API and worker. Migrations now take a transaction-scoped PostgreSQL advisory lock, and failed startup releases its client before closing the pool. The same empty-schema API/worker launch then exposed healthy fixture metadata and reads without errors. No remaining high-confidence exploitable finding was identified in the M4A surface.

## Evidence commits

- `c5709cb` and `9d94755`: approved M4A design and implementation plan.
- `235436f` through `8e72782`: configuration and checksum-verified migration RED/GREEN checkpoints.
- `93ae97d` through `4cb4cc9`: deterministic projection and atomic PostgreSQL ingestion RED/GREEN checkpoints.
- `f78e4c0` through `be60c02`: restart replay, reorg reconciliation, and resumable worker RED/GREEN checkpoints.
- `de13b2a` through `f8ead28`: versioned DTO, PostgreSQL repository, and read-only HTTP RED/GREEN checkpoints.
- `f354afc` through `27a8314`: bounded viem source and coherent fixture-chain RED/GREEN checkpoints.
- `667c862` through `25cd59a`: process packaging, path portability, stable startup errors, canonical ancestry validation, and minimal pinned runtime image.
- `83d6c67` and `1918195`: service-hardening RED/GREEN checkpoints for reconciliation, explicit provenance, API errors, portfolio pagination, and ciphertext constraints.
- `07487c4` through `9776ac7`: shared read-contract, Proof Center v2, ciphertext-cap, and canonical-fixture RED/GREEN checkpoints.
- `8b23179` and `5952ff2`: M4A adaptation to the frozen DTO and corrected seller entitlement.
- `897db0e` and `11d6d89`: migration-race RED/GREEN checkpoints for simultaneous API/worker schema startup.

## Not yet demonstrated

This document does **not** claim live M4A acceptance. The remaining evidence depends on the organizer-approved M1 deployment inputs and explicit deployment approval:

- A live Coston2 deployment manifest containing the real contract address and deployment block.
- Sustained ingestion from the real Coston2 RPC and deployed HushFlow contract.
- Restart catch-up and a real or controlled Coston2 reorg/reconciliation demonstration.
- Live RFQ, quote, FCC result, settlement/refund, timeout, replay rejection, and claim data visible through the read API with transaction hashes.
- Operator evidence for production database retention, monitoring, and recovery.

The active Windows shell uses Node 24.13 while the repository requires Node 24.18 or newer. Direct package gates passed locally, and the container verification used the digest-pinned Node 24.18 runtime. No private key, organizer credential, or tunnel token is recorded here.
