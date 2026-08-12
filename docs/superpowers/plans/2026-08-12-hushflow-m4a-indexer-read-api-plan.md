# HushFlow M4A Indexer and Read API Implementation Plan

Date: 2026-08-12

Design: `docs/superpowers/specs/2026-08-12-hushflow-m4a-indexer-read-api-design.md`

## Objective

Implement a restart-safe, replayable Coston2 event indexer and read-only HTTP API as two Node.js processes backed by PostgreSQL 18. Keep live ingestion fail-closed while the canonical deployment manifest is pending.

## Ownership

M4A owns `services/indexer`, its fixtures and tests, indexer-specific compose configuration, and M4A verification documentation. It consumes but does not redefine M3 interfaces in `packages/protocol` and `packages/crypto`.

## Constraints

- Use explicit parameterized SQL; no ORM.
- Follow RED-GREEN-REFACTOR with reachable commits for every production slice.
- Do not push, deploy, broadcast, or invent live evidence.
- Do not persist or log plaintext seller minimums, provider quotes, decrypted inputs, private keys, or credentials.
- Keep worker and API independently runnable.
- Validate all public responses against shared protocol schemas.
- Maintain at least 80% coverage in all categories; target 90% locally.

## Task 1: Service skeleton and configuration boundary

Create:

- `services/indexer/package.json`
- `services/indexer/tsconfig.json`
- `services/indexer/src/config.ts`
- `scripts/indexer/config.test.ts`

RED tests define strict fixture/live configuration, bounded batch/finality values, redacted failures, and the pending-manifest live guard. GREEN adds the minimal service package and runtime parser. Verify the focused test, typecheck, lint, and build before committing.

## Task 2: Explicit SQL migrations

Create:

- `services/indexer/migrations/001_initial.sql`
- `services/indexer/src/db/types.ts`
- `services/indexer/src/db/migrations.ts`
- `scripts/indexer/migrations.test.ts`

RED tests assert all evidence/derived tables, primary and uniqueness constraints, uint256 numeric columns, canonical address/hash checks, migration checksum behavior, and forbidden-column absence. GREEN implements ordered, transactional, checksum-verified migrations using `pg`.

## Task 3: Deterministic event command adapter and projector

Create:

- `services/indexer/src/domain/events.ts`
- `services/indexer/src/domain/projector.ts`
- `scripts/indexer/projector.test.ts`

RED tests load the canonical M3 event fixture and cover RFQ creation, quote participation, resolution request, finalization, cancellation, timeout, and claim transitions. Tests also cover invalid ordering, duplicate commands, normalization, and snapshot determinism. GREEN implements pure command adaptation and an in-memory reference projector used to define SQL behavior.

## Task 4: Atomic evidence store and SQL projection

Create:

- `services/indexer/src/db/store.ts`
- `services/indexer/src/db/project.ts`
- `scripts/indexer/store.integration.test.ts`

RED PostgreSQL tests prove atomic block/log/project/cursor persistence, duplicate ingestion idempotency, rollback on invalid events, and source-event traceability. GREEN implements parameterized SQL transactions and conflict-safe inserts.

## Task 5: Replay, restart, and reorg reconciliation

Create:

- `services/indexer/src/worker/replay.ts`
- `services/indexer/src/worker/reconcile.ts`
- `scripts/indexer/reconciliation.integration.test.ts`

RED tests prove restart cursor verification, identical full-replay snapshots, orphan removal, nearest-ancestor rollback, and fail-closed behavior when no ancestor exists in the retained window. GREEN implements deterministic rebuild and bounded reconciliation transactions.

## Task 6: Fixture and live ingestion worker

Create:

- `services/indexer/src/worker/source.ts`
- `services/indexer/src/worker/run.ts`
- `services/indexer/src/worker/main.ts`
- `scripts/indexer/worker.test.ts`

RED tests define ordered batching, RPC retry without cursor movement, manifest gating, fixture ingestion, health transitions, and strict decoder failures. GREEN implements injectable fixture/RPC sources and the long-running worker entry point. No live RPC call occurs in automated tests.

## Task 7: Read repositories and cursor pagination

Create:

- `services/indexer/src/api/cursor.ts`
- `services/indexer/src/api/repository.ts`
- `scripts/indexer/read-repository.integration.test.ts`

RED tests cover stable pagination, status/seller/provider filters, RFQ detail, proof, portfolio, statistics, bounded page sizes, malformed cursors, and ciphertext exclusion from list/statistics views. GREEN implements parameterized read-only queries.

## Task 8: Read-only HTTP API

Create:

- `services/indexer/src/api/router.ts`
- `services/indexer/src/api/server.ts`
- `services/indexer/src/api/main.ts`
- `scripts/indexer/api.test.ts`

RED tests exercise deployment, health, RFQ list/detail/proof, portfolio, and statistics endpoints. They verify shared DTO compatibility, strict input rejection, stable redacted errors, method handling, and response size/page bounds. GREEN implements a minimal Node HTTP adapter over the read repository.

## Task 9: Privacy, security, and process/container gates

Create or update:

- `infra/compose/docker-compose.yml`
- `services/indexer/Dockerfile`
- `services/indexer/.dockerignore`
- `scripts/indexer/privacy.test.ts`
- `scripts/indexer/process-smoke.test.ts`

RED tests scan migrations, rows, HTTP responses, logs, and process environment boundaries for forbidden plaintext/secret markers. GREEN adds least-privilege runtime configuration, health checks, separate worker/API commands, and container packaging without embedding credentials.

## Task 10: Full verification and evidence

Create:

- `docs/verification/m4a-indexer-read-api.md`

Run:

- focused and full Vitest suites with coverage;
- PostgreSQL integration and replay/reorg suites;
- TypeScript typecheck and package build;
- ESLint and targeted Prettier;
- SQL/privacy/secret checks;
- dependency audit;
- worker/API container smoke tests when Docker is available;
- final diff security review.

Record exact test counts, coverage, limitations, manifest status, and remaining live acceptance. Commit the evidence only after the working tree and all locally available gates are clean.

## Completion sequence

1. Land each RED commit immediately after the intended failure is observed.
2. Land its GREEN commit only after the same focused target passes.
3. Keep shared M3 interfaces unchanged unless a separately reviewed versioned change is unavoidable.
4. Finish local M4A before claiming live acceptance.
5. Merge M4A before wiring M4B from fixture adapters to the real API.
