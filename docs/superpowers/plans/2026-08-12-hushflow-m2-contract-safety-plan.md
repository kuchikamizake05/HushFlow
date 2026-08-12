# HushFlow M2 Contract Safety Implementation Plan

Date: 2026-08-12

Design: `docs/superpowers/specs/2026-08-12-hushflow-m2-contract-safety-design.md`

Branch: `codex/m2-contract-safety`

## Working Rules

- Work only in the isolated M2 worktree.
- Preserve the M1 FCC wire format and existing public entry-point signatures.
- Write and execute a focused RED test before each production behavior change.
- Commit validated RED and GREEN checkpoints separately.
- Do not edit root lockfiles or generated ABI artifacts.
- Keep the M1 live deployment branch independent until final compatibility verification.

## Phase 1: Lifecycle Policy

### Task 1.1: Seller cancellation

Files:

- `contracts/test/HushFlowRfq.t.sol`
- `contracts/src/HushFlowRfq.sol`

RED cases:

- seller can cancel an open RFQ with zero quotes;
- non-seller cancellation reverts;
- cancellation after one accepted quote reverts;
- cancelled seller can claim the entire FXRP lot;
- cancellation is terminal and cannot be repeated.

GREEN behavior:

- add `cancelRfq` and `RfqCancelled`;
- transition to `CANCELLED` before any later external interaction;
- preserve pull-based claims.

### Task 1.2: Deadline policy

Files:

- `contracts/test/HushFlowRfq.t.sol`
- `contracts/src/HushFlowRfq.sol`

RED cases:

- quote windows below one minute revert;
- quote windows above 24 hours revert;
- resolution deadline must equal quote deadline plus 30 minutes;
- exact lower and upper bounds succeed.

GREEN behavior:

- add explicit duration constants;
- validate the compatibility argument against the derived resolution deadline.

## Phase 2: Result and Terminal Safety

### Task 2.1: Trade constraints

RED cases:

- zero winning quote reverts;
- winning quote above cap reverts;
- nonparticipant winner reverts;
- terminal RFQ rejects a second result.

GREEN behavior:

- require positive bounded trade quote and participating winner.

### Task 2.2: Non-trade constraints

RED cases:

- no-valid-quote with nonzero winner or quote reverts;
- invalid-RFQ with nonzero winner or quote reverts;
- stale, replayed, and cross-RFQ results revert.

GREEN behavior:

- enforce canonical zero fields without changing `ResultDataV1`.

## Phase 3: Adversarial Tokens and Claim Safety

### Task 3.1: Token harnesses

Files:

- `contracts/test/harness/AdversarialTokens.sol`
- `contracts/test/HushFlowRfqTokenBehavior.t.sol`
- `contracts/src/HushFlowRfq.sol` only if a RED case identifies missing protection.

Cases:

- false-return deposit;
- reverting deposit;
- fee-on-transfer deposit;
- rebasing/balance-changing deposit;
- reentrant deposit and claim callback;
- false-return and reverting outgoing claim.

### Task 3.2: Claim permutations

Files:

- `contracts/test/HushFlowRfqClaims.t.sol`

Cases:

- every seller/provider claim order for trade;
- every seller/provider claim order for no-trade outcomes;
- failed transfer preserves entitlement;
- double claim and unrelated-account claim revert;
- contract balances reach zero after all valid claims.

## Phase 4: Accounting and Invariants

### Task 4.1: Accounting views

Files:

- `contracts/src/HushFlowRfq.sol`
- `contracts/test/HushFlowRfqAccounting.t.sol`

Behavior:

- expose per-RFQ deposited and claimed totals for FXRP and USDT0;
- expose aggregate claimable totals derived from terminal outcome and claimed state;
- update claimed totals atomically with claim consumption.

### Task 4.2: Stateful invariant suite

Files:

- `contracts/test/invariant/HushFlowRfqHandler.sol`
- `contracts/test/invariant/HushFlowRfqInvariant.t.sol`

Properties:

- claimed plus claimable never exceeds deposits;
- terminal entitlements equal deposits;
- terminal transitions occur at most once;
- action IDs, nonces, and provider participation are single-use;
- no uninvolved address acquires an entitlement;
- every accepted deposit remains held or represented by an entitlement.

## Phase 5: Verification Gates

### Task 5.1: Boundary fuzzing

Add fuzz coverage for amounts, durations, ciphertext sizes, provider counts, winning quotes, timestamps, and claim order.

### Task 5.2: Gas and coverage

- capture gas for create, quote, resolution request with two and 20 providers, result finalization, and claims;
- run Forge coverage and require at least 90% line and branch coverage for critical contract logic;
- document exclusions and tool limitations without counting skipped tests as passing.

### Task 5.3: Final compatibility and security review

- rerun M1 Solidity tests and fixture decoding;
- compare public ABI signatures with the M1 baseline;
- run formatting and full Forge tests;
- inspect custody, authorization, reentrancy, signature, token, and accounting paths;
- resolve every critical or high-confidence high-severity finding;
- record sanitized verification evidence under `docs/verification/`.

## Completion Evidence

The final M2 report records:

- exact test counts;
- fuzz and invariant run configuration;
- line and branch coverage;
- gas measurements;
- compatibility result;
- security findings and resolutions;
- commit hashes for each RED/GREEN checkpoint.
