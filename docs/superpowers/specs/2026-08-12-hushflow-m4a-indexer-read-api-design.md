# HushFlow M4A Event Indexer and Read API Design

Date: 2026-08-12

Status: approved design

## 1. Goal

Milestone 4A provides searchable, restart-safe public protocol views without weakening the Flare contract as the execution authority. It builds a deterministic event indexer and a read-only HTTP API on the interfaces frozen in M3.

M4A must remain useful while live FCC and Coston2 deployment evidence are unavailable. Local development and verification use versioned M3 fixtures. Live ingestion remains fail-closed until the canonical deployment manifest is `live`.

## 2. Scope

M4A includes:

- a long-running Node.js indexer worker;
- a separately runnable Node.js read API;
- PostgreSQL 18 storage managed through explicit SQL migrations;
- validated Coston2 event ingestion;
- deterministic read-model projection;
- idempotent replay, restart, and reorg reconciliation;
- market, RFQ detail, proof, portfolio, statistics, deployment, and health reads;
- container and local verification for the worker, API, and database.

M4A excludes:

- frontend routes and visual design;
- transaction signing or submission;
- contract-state authorization for settlement or claims;
- live contract deployment or FCC registration;
- fabricated addresses, transactions, activity, or statistics;
- storage of private plaintext, secrets, or decrypted FCC inputs.

## 3. Architecture

M4A uses one codebase with two independent processes:

1. The indexer worker reads Coston2 logs, validates them through `@hushflow/protocol`, persists public chain evidence, and projects read models.
2. The read API serves validated DTOs from PostgreSQL and remains available when ingestion is paused or degraded.

The processes share PostgreSQL but do not share in-memory state. A worker crash does not terminate the API. An API restart does not move the ingestion cursor.

Data flow:

```text
Coston2 RPC
    -> indexer worker
    -> validated chain_blocks and chain_logs
    -> deterministic projector
    -> RFQ, provider, action, outcome, claim, transaction, and statistics views
    -> read API
    -> M4B consumers
```

The contract remains authoritative for balances, eligibility, status transitions, and writes. Indexed data improves discovery and history only. Every transaction-enabling consumer must re-read current contract state through viem before enabling or submitting a write.

## 4. Runtime and Deployment Modes

The canonical runtime is a continuously running Node.js service deployed as two processes:

- `worker`: ingestion, reconciliation, replay, and health updates;
- `api`: read-only HTTP endpoints.

PostgreSQL 18 is the canonical database. SQL is explicit; no ORM owns schema generation or query semantics.

Two deployment modes are supported:

- `fixture`: deterministic local ingestion from versioned M3 event fixtures;
- `live`: RPC ingestion using a verified live deployment manifest.

If the manifest is pending, the API reports deployment and health state, while the worker performs no RPC ingestion. A pending manifest never falls back to an address supplied ad hoc through an environment variable.

## 5. Evidence Log and Projection Model

The indexer stores both public evidence and derived views.

### 5.1 Evidence tables

- `schema_migrations`: applied migration versions and checksums.
- `chain_cursor`: chain, deployment block, finality window, last processed block, and last processed hash.
- `chain_blocks`: canonical block number, hash, parent hash, and timestamp within the retained reconciliation window.
- `chain_logs`: immutable raw topics/data plus normalized decoded event data.

The log idempotency key is `(chain_id, transaction_hash, log_index)`. Processing order is `(block_number, log_index)`. Raw logs may only be removed when their block is proven orphaned during reorg reconciliation.

### 5.2 Derived tables

- `rfqs`: public RFQ lifecycle and current indexed status.
- `rfq_providers`: public provider participation and submitted ciphertext.
- `fcc_actions`: public action ID, request metadata, expiry, and resolution state.
- `rfq_outcomes`: result type, public winning provider, and public winning quote when emitted.
- `claims`: public claimable balances and claim history.
- `transactions`: chain transaction metadata used by activity and explorer views.
- `indexer_health`: head, cursor, lag, last success, and redacted last error code.

Every derived row carries sufficient source-event identity to trace it to a transaction and log index.

### 5.3 Storage rules

- Solidity `uint256` values use `NUMERIC(78,0)` and serialize to API decimal strings.
- Addresses and hashes use canonical lowercase text with database constraints for exact length and hexadecimal syntax.
- Timestamps are stored as timezone-aware values.
- Ciphertext is treated as public chain evidence but is returned only by explicit RFQ detail or proof endpoints.
- No table stores plaintext seller minimum, plaintext provider quote, decrypted FCC input, wallet private key, FCC private key, encryption secret, database credential, or tunnel credential.

## 6. Atomic Ingestion

For each bounded block batch, one database transaction performs:

1. canonical block validation;
2. raw log insertion with conflict-safe idempotency;
3. strict event decoding through `@hushflow/protocol`;
4. deterministic projection of newly accepted logs;
5. cursor advancement;
6. health update.

Any invalid log, failed projection, or database error rolls back the entire batch. The cursor never advances beyond persisted and projected evidence.

The worker uses bounded RPC ranges and retry with exponential backoff and jitter. RPC errors do not alter the cursor. Public errors and health records contain stable coarse codes rather than RPC URLs, database queries, credentials, or event payload values.

## 7. Replay, Restart, and Reorgs

### 7.1 Restart

On restart, the worker reads the persisted cursor and verifies the stored cursor block hash against RPC before ingesting the next block. Duplicate logs remain harmless through the idempotency constraint.

### 7.2 Full replay

Full replay truncates derived tables, preserves migrations and accepted canonical evidence, and projects `chain_logs` again in deterministic order. Replaying the same evidence twice must produce identical derived snapshots.

Fixture mode may rebuild both evidence and derived tables from the committed event fixture.

### 7.3 Reorg reconciliation

The worker continuously re-reads a configured finality window. When a stored block hash differs from the RPC block hash, ingestion pauses and the worker walks backward to the nearest matching ancestor within retained history.

Inside one transaction it removes orphaned blocks/logs, rebuilds derived state from remaining canonical evidence, rewinds the cursor, and records a redacted reorg health event. Normal forward ingestion then resumes.

If no common ancestor exists inside the retained window, the worker enters a degraded fail-closed state and requires a bounded full replay from the configured deployment block. It never guesses canonical state.

## 8. Read API

The API exposes versioned JSON responses validated against `@hushflow/protocol` DTO schemas.

- `GET /health`: API, database, deployment, RPC, cursor, head, lag, and last-success state.
- `GET /deployment`: the canonical pending or live deployment view.
- `GET /rfqs`: status, seller, and provider filters with stable cursor pagination.
- `GET /rfqs/:id`: lifecycle, providers, outcome, and public activity.
- `GET /rfqs/:id/proof`: explicit ciphertext and public FCC proof metadata.
- `GET /wallets/:address/portfolio`: public RFQs, claimable balances, and claim history for one address.
- `GET /stats`: statistics calculated only from canonical accepted events.

Unknown fields and malformed filters are rejected. Page sizes are bounded. Pagination cursors are opaque, versioned, and validated before use. API data never grants permission to submit a transaction.

The M3 schemas are extended only through explicit versioned protocol changes. The API does not publish an incompatible local DTO variant.

## 9. Failure Behavior

- Pending deployment: API remains available; live ingestion is disabled.
- RPC unavailable: worker retries; cursor remains unchanged; health becomes degraded.
- Database unavailable: batch rolls back; API health becomes unavailable.
- Invalid or mismatched event: batch is rejected; health records a stable decoder code.
- Indexer lag: reads remain available and expose the measured lag.
- Reorg: new ingestion pauses until rollback and replay complete.
- Unsupported schema or chain: request or event is rejected fail-closed.
- Internal exception: clients receive a coarse stable code; detailed sensitive context is not returned or persisted.

## 10. Privacy and Security Boundaries

All external inputs receive runtime validation: environment configuration, deployment manifests, RPC blocks/logs, decoded events, API path parameters, filters, and pagination cursors.

Database access uses parameterized SQL only. The worker and API use separate least-privilege database roles where deployment permits it. The API role cannot mutate chain evidence or advance the cursor.

No plaintext seller minimum or provider quote may enter the API, worker log, database, exception message, telemetry, snapshot, or test artifact. Tests use marker values to prove forbidden data does not cross these boundaries.

Ciphertext and transaction evidence are public but returned deliberately. List/statistics endpoints do not include ciphertext.

## 11. Testing Strategy

Development follows RED-GREEN-REFACTOR checkpoints.

Unit tests cover:

- configuration and manifest guards;
- event-to-command adaptation;
- deterministic projector transitions;
- amount/address/hash normalization;
- cursor encoding and filtering;
- error redaction and privacy guards.

PostgreSQL integration tests cover:

- migrations and constraints;
- atomic batch persistence;
- duplicate ingestion idempotency;
- restart without gaps;
- full replay equivalence;
- reorg rollback and rebuild;
- API query behavior and schema compatibility.

System tests cover:

- separate worker and API processes against PostgreSQL;
- fixture ingestion from an empty database;
- health transitions for pending, healthy, degraded, and unavailable states;
- privacy audits across database rows, logs, errors, and HTTP responses.

Coverage must remain at least 80% across statements, branches, functions, and lines, with a local target of 90% or higher. No test is skipped to satisfy the gate.

## 12. Acceptance Criteria

M4A is locally complete when:

- migrations build the database from empty state;
- ingesting the same event set twice is idempotent;
- a restart resumes at the correct canonical block without gaps;
- two complete projections of identical evidence produce identical snapshots;
- a simulated reorg removes orphaned state and restores canonical derived state;
- every endpoint response conforms to the shared M3 schemas;
- the privacy audit finds no forbidden fields or marker values;
- worker, API, PostgreSQL integration, lint, typecheck, build, and coverage gates pass;
- the pending deployment path remains honest and fail-closed.

Live acceptance additionally requires a verified Coston2 deployment manifest and real RPC evidence. Local completion must not be represented as live acceptance.
