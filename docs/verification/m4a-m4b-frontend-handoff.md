# M4A to M4B Frontend Integration Handoff

Date: 2026-08-12

Status: integration blocked pending M4A and shared-interface fixes; independent M4B visual work may proceed

Reviewed M4A branch: `codex/m4a-indexer-read-api`

Reviewed M4A commit: `16f2a5b`

M4B worktree base commit: `c5709cb`

## 1. Purpose

This document records M4A findings that affect M4B. It separates fixes owned by M4A or shared-package owners from frontend work that can proceed safely in parallel.

This review did not modify `services/indexer`, `packages/protocol`, `packages/crypto`, contracts, database schemas, deployment configuration, or live infrastructure. It does not claim that M4A was tested again from the M4B worktree. Findings come from static review of the committed M4A implementation and its tests.

## 2. Integration decision

M4B may proceed with:

- adapted template and design tokens;
- landing page;
- navigation and route shells;
- responsive and accessibility foundations;
- wallet and network presentation states;
- view-model interfaces;
- an explicitly labeled local-fixture adapter;
- unit and component tests;
- browser privacy-audit scaffolding.

M4B must not treat the current M4A API as its final production read dependency until the integration gate in Section 7 passes.

## 3. Confirmed M4A blockers

### M4A-01: Reorg recovery is disconnected from the worker

Severity: blocker

Evidence:

- `services/indexer/src/worker/run.ts:58-70` verifies only the persisted cursor block.
- `services/indexer/src/worker/main.ts:43-48` catches worker errors and retries without reconciliation.
- `services/indexer/src/db/store.ts:306-439` implements `reconcileWindow`, but the worker does not call it.

Failure scenario:

1. The persisted cursor block becomes non-canonical.
2. `verifyCursor` throws `INDEXER_CURSOR_MISMATCH`.
3. The worker loop catches the error and retries the same path.
4. Stale derived state remains available through the read API.

Required owner action:

- M4A owner must invoke bounded reorg reconciliation when cursor verification fails.
- The worker must resume only after rollback and deterministic replay succeed.
- If no common ancestor exists inside retained history, health must become degraded with `REORG_REPLAY_REQUIRED` and ingestion must fail closed.

### M4A-02: Configured reconciliation window is not exercised

Severity: blocker

Evidence:

- `services/indexer/src/worker/run.ts:51-104` ingests through the current RPC head.
- `config.finalityWindow` is persisted but the worker does not continuously re-read or reconcile that window.

Failure scenario:

A reorg inside the configured window is not detected unless it changes the single persisted cursor block. Orphaned state below that block can remain visible.

Required owner action:

- `finalityWindow` is a reorg-reconciliation window, not a confirmation delay or `head - N` ingestion ceiling.
- Before advancing, the worker must re-read the inclusive range `max(deploymentBlock, cursor - finalityWindow + 1)..cursor` in RPC chunks of at most 1,000 blocks and validate continuous number/hash/parent-hash ancestry.
- Retained canonical evidence must cover at least that window plus a documented ancestor margin.
- If no common ancestor exists, automatic forward ingestion stops, health becomes `REORG_REPLAY_REQUIRED`, and an operator-controlled bounded replay from the deployment block is required.
- API health must expose lag and reorg recovery honestly.

### M4A-03: Fixture mode is the default runtime mode

Severity: blocker

Evidence:

- `services/indexer/src/config.ts:22-29` defaults `INDEXER_MODE` to `fixture`.
- `services/indexer/src/worker/source.ts:170-208` creates deterministic fixture block and transaction hashes.

Failure scenario:

A runtime missing `INDEXER_MODE` starts in fixture mode and serves synthetic settled RFQ data. The deployment endpoint remains pending, but other endpoints may look like protocol activity.

Required owner action:

- M4A owner must require an explicit mode.
- Fixture mode must be restricted to local or test runtime.
- API responses must expose machine-readable data provenance so M4B can label fixtures reliably.
- Synthetic activity must never be presented as live Coston2 activity.

### M4A-04: Health DTO rejects a persisted reorg state

Severity: blocker

Evidence:

- `packages/protocol/src/read-api.ts:110-121` permits `RPC_UNAVAILABLE`, `INDEXER_LAGGING`, and `DATABASE_UNAVAILABLE`.
- `services/indexer/src/db/store.ts:365-386` persists `REORG_REPLAY_REQUIRED`.

Failure scenario:

`GET /health` reads the persisted reorg state, Zod parsing fails, and the API returns `500 INTERNAL_ERROR` instead of a valid degraded-health response.

Required owner action:

- Shared protocol owner must add the approved public reorg code or define an explicit internal-to-public mapping.
- M4A tests must cover every persisted health code through the HTTP boundary.

### M4A-05: Portfolio silently truncates after one page

Severity: high

Evidence:

- `services/indexer/src/api/repository.ts:250-267` loads one seller page and one provider page with `limit: 100`.
- Returned `nextCursor` values are ignored.

Failure scenario:

An account with more than 100 seller or provider RFQs receives an incomplete portfolio and claim list without an incomplete-data marker.

Required owner action:

- M4A owner must expose one stable opaque cursor over the combined seller/provider result set, ordered deterministically by RFQ ID.
- The repository must use one combined account-membership query rather than two independent cursors.
- Tests must traverse more than 100 mixed seller/provider RFQs without duplicates, omissions, or false completeness.

### M4A-06: Malformed cursor returns an internal error

Severity: high

Evidence:

- `services/indexer/src/api/router.ts:49-78` validates cursor length but does not decode it.
- `services/indexer/src/api/cursor.ts:22-37` throws `CursorError` during repository access.
- `services/indexer/src/api/router.ts:145-159` maps only `RequestError` to `400 REQUEST_INVALID`.

Failure scenario:

`GET /rfqs?cursor=not-base64` returns `500 INTERNAL_ERROR` instead of a client-validation error.

Required owner action:

- M4A owner must decode the cursor during request parsing or map `CursorError` to HTTP `400 INVALID_CURSOR` without parser details.

### M4A-07: Ciphertext size is not enforced across boundaries

Severity: blocker

Evidence:

- The contract/protocol constant caps ciphertext at 4,096 bytes.
- Shared read DTOs and decoded indexer event schemas accept unbounded hex ciphertext.
- Existing SQL ciphertext columns do not enforce the protocol cap.

Failure scenario:

Oversized event or fixture ciphertext can cross package validation and be persisted even though the write contract would reject the equivalent payload.

Required owner action:

- Shared protocol owner must enforce `MAX_CIPHERTEXT_BYTES = 4096` in seller/provider ciphertext schemas.
- M4A owner must enforce the same bound in decoded events and add migration `002` constraints; checksum-applied migration `001` must not be edited.
- Tests must accept exactly 4,096 bytes and reject 4,097 bytes. Raw ABI log data uses a separate bounded limit because it includes encoding overhead.

### M4A-08: Database-outage health semantics are incomplete

Severity: high

Evidence:

- `services/indexer/src/api/repository.ts:364-383` reads health directly from PostgreSQL.
- A database failure becomes a generic `500`, despite the DTO exposing `status: "unavailable"` and `DATABASE_UNAVAILABLE`.

Required owner action:

- M4A must return HTTP `503` with a stable unavailable health DTO and `DATABASE_UNAVAILABLE`.
- The response must not include query text, connection details, credentials, stack traces, or driver errors.
- M4B's same-origin adapter must validate and normalize that response rather than forwarding raw upstream failures.

## 4. Shared fixture defect

### M3-01: Settled seller claim contradicts contract entitlement

Severity: blocker for fixture-backed portfolio UI

Evidence:

- `packages/protocol/fixtures/v1/events.json:215-241` records the settled seller claim as `fxrpAmount: "1000000"` and `usdt0Amount: "2400000"`.
- The fixture reuses `0x111...` as TEE signer, settled seller, and claimant, so controlled roles are not distinct.
- `contracts/src/HushFlowRfq.sol:351-359` gives a settled seller the winning USDT0 amount; the winning provider receives the FXRP lot.
- `scripts/indexer/read-repository.integration.test.ts:170-190` expects the inconsistent fixture value.

Required owner action:

- Shared protocol owner must assign the settled seller a role-specific address distinct from the TEE signer and providers.
- The settled seller claim must be `fxrpAmount: "0"` and `usdt0Amount: "2400000"`; the winner remains entitled to the FXRP lot and its applicable USDT0 return.
- M4A owner must update dependent tests and verification evidence.
- M4B must not use the current fixture for portfolio amount examples.

## 5. Proof Center interface gap

Current `rfqProofDtoSchema` in `packages/protocol/src/read-api.ts:123-153` exposes:

- seller and provider ciphertext;
- action ID;
- result type;
- winning provider and winning quote;
- result nonce;
- finalization transaction hash.

Approved Proof Center requirements additionally need:

- chain binding;
- contract binding;
- result expiry;
- submission tag;
- FCC ActionResult status;
- signature;
- TEE signer;
- signature-verification status.

Required coordination:

- Keep the current proof DTO v1 unchanged for compatibility.
- Shared protocol owner must add `rfqProofCenterDtoV2Schema` as a strict `PARTIAL | VERIFIED` discriminated union.
- `VERIFIED` requires exact `resultData`, signature, action ID, submission tag, successful action status, decoded chain/contract/RFQ/result/expiry/nonce bindings, configured and recovered TEE signer, payload hash, signed-message hash, and source transaction/block references.
- `PARTIAL` requires a coarse reason and must not contain invented signed-result evidence. Fixture and pending-deployment modes always report `PARTIAL`.
- M4A must obtain signed-result evidence from `submitResult` transaction calldata because event logs alone cannot reconstruct it, then expose `/v2/rfqs/:id/proof` while retaining the v1 endpoint.
- M4B may build the partial-evidence UI now, but it must not perform ad hoc direct RPC transaction decoding or claim complete signature verification.

## 6. Ciphertext endpoint boundary

Current M4A detail endpoint returns ciphertext through `GET /rfqs/:id`. The implementation plan says ciphertext should be returned only by explicit proof endpoints, while the M3 DTO and M4A design allow ciphertext in RFQ detail.

This is an interface conflict, not a frontend-owned decision.

Recommended resolution:

- `GET /rfqs/:id` returns lifecycle, provider participation, outcome, and public activity without ciphertext.
- `GET /rfqs/:id/proof` remains the explicit ciphertext and technical-evidence endpoint.

Until owners decide, M4B must not fetch RFQ detail ciphertext on market, portfolio, landing, analytics, or background-prefetch paths.

## 7. M4B integration gate

Production read integration may begin only when all items below pass:

- [ ] Worker invokes bounded reorg reconciliation.
- [ ] Reconciliation-window and operator-controlled deep-replay policy are implemented and tested.
- [ ] Runtime data mode is explicit and machine-readable.
- [ ] Fixture mode cannot masquerade as live activity.
- [ ] `REORG_REPLAY_REQUIRED` and `EVENT_INVALID` have compatible public DTO representations.
- [ ] Portfolio uses one stable opaque cursor over the combined seller/provider result set.
- [ ] Malformed cursors return `400 INVALID_CURSOR`.
- [ ] Database outage returns `503 DATABASE_UNAVAILABLE` through a stable DTO.
- [ ] Ciphertext is capped at 4,096 bytes across package, indexer, and migration boundaries.
- [ ] Same-origin adapter boundary is implemented and tested by M4B.
- [ ] Canonical settled-seller fixture is corrected.
- [ ] Proof Center DTO contract is approved.
- [ ] Ciphertext endpoint boundary is resolved.
- [ ] M4A regression, integration, privacy, and browser-contract tests pass.

## 8. Required M4B safeguards

Regardless of M4A fixes, M4B must enforce these rules:

- Indexed data is a disposable convenience read model, not execution authority.
- Market and portfolio render unavailable on failed or untrusted reads; cached or indexed data must not be presented as a stale success.
- Every write CTA remains disabled until a fresh live RPC recheck succeeds.
- Before enabling or submitting quote, resolution, timeout, refund, cancellation, or claim actions, viem rechecks current contract RFQ state, deadlines, participation, `claimable`, `claimed`, balances, allowances, chain ID, and deployment address as applicable.
- Indexed `claimable`, `claimed`, status, and deadline values never authorize a write.
- Pending deployment disables wallet writes before any wallet prompt.
- Indexer degraded, unavailable, replay-required, or untrusted-provenance states disable indexer-dependent action assumptions.
- Fixture data always displays a persistent `Local fixture data` label.
- Ciphertext never enters URL parameters, browser storage, analytics, logs, screenshots outside an explicit proof surface, or background telemetry.
- Private seller minimum and provider quote never enter the read adapter or indexer API.
- Proof Center supports an explicit partial-evidence state until every signed-result field is available.
- Portfolio never claims completeness unless pagination is complete.

## 9. Recommended M4B read boundary

```text
Browser
  -> same-origin Next.js read route
  -> M4A read API
  -> strict @hushflow/protocol DTO parse
  -> M4B view model
```

The same-origin route must remain read-only. It must not receive private form values, ciphertext creation inputs, wallet signatures, authorization secrets, or transaction-enabling authority.

M4B therefore does not require browser CORS access to M4A. The server-side adapter owns the internal indexer URL, validates every upstream DTO again, enforces fixture/live provenance, converts transport and database failures into coarse frontend errors, and never forwards private form state.

Wallet writes follow a separate path:

```text
Controlled browser form state
  -> @hushflow/crypto encryption
  -> direct contract-state recheck through viem
  -> wallet transaction containing ciphertext and public parameters only
```

## 10. Ownership and next actions

| Action | Owner |
| --- | --- |
| Reorg, finality, runtime mode, cursor, portfolio, database health | M4A owner |
| Health/proof DTO and canonical fixture correction | `packages/protocol` owner |
| Same-origin adapter, fail-closed UI, direct contract rechecks | M4B owner |
| Ciphertext endpoint policy | M3/M4A/M4B coordination |
| Live Coston2 evidence | Deployment and validation owners after explicit approval |

M4B can continue independent visual and test work while these actions run in parallel. No push, deployment, live address substitution, or fabricated protocol data is authorized by this handoff.
