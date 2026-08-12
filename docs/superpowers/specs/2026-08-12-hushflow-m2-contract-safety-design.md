# HushFlow M2 Contract and Protocol Safety Design

Date: 2026-08-12

Status: approved for specification; implementation pending review

Branch: `codex/m2-contract-safety`

## 1. Purpose

Milestone 2 expands the locally verified M1 FCC vertical slice into the complete approved RFQ lifecycle and proves custody and accounting safety. It preserves the M1 FCC wire format and public contract entry points so the separate M1 live-integration work can continue without adopting a second protocol.

M2 is developed in an isolated Git worktree. It does not modify the M1 live container, proxy, tunnel, deployment, or credential work.

## 2. Compatibility Boundary

The following M1 interfaces remain compatible:

- `EnvelopeV1` and `ResultDataV1` field order and encoding;
- FCC `ActionResult` signature domain, action ID, submission tag, status, and nonce binding;
- `createRfq`, `submitQuote`, `requestResolution`, `submitResult`, `timeoutRfq`, and `claim` entry points;
- the one-time TEE signer initialization and non-replacement property;
- `OPEN`, `SETTLED`, `NO_VALID_QUOTE`, `INVALID_RFQ`, `CANCELLED`, and `TIMED_OUT` stored statuses.

M2 may add entry points, events, errors, view helpers, and internal accounting state. Any compatibility change discovered during implementation must stop at a RED test and be reconciled with the M1 live branch before production code changes.

## 3. Lifecycle

### 3.1 Creation

A seller creates an RFQ with:

- a nonzero fixed FXRP lot;
- a nonzero public USDT0 quote cap;
- a nonempty encrypted seller minimum within the ciphertext limit;
- a quote deadline between one minute and 24 hours after creation.

The absolute resolution deadline is derived by the contract as 30 minutes after the quote deadline. The existing `resolutionDeadline` argument remains in the ABI for M1 compatibility and must equal the derived value; inconsistent input reverts.

The contract transfers exactly the fixed FXRP lot before creation succeeds. Fee-on-transfer, rebasing, false-return, or otherwise non-exact deposit behavior is rejected.

### 3.2 Quote submission

While an RFQ is `OPEN` and before its quote deadline, a non-seller provider may submit exactly one immutable ciphertext. Each accepted provider locks exactly `quoteCap` USDT0. The provider list preserves on-chain submission order and is capped at 20.

An empty ciphertext or ciphertext larger than 4,096 bytes is rejected. A failed or non-exact token transfer must leave participation and provider-list state unchanged through transaction rollback.

### 3.3 Seller cancellation

The seller may call `cancelRfq` only while the RFQ is `OPEN` and has no accepted provider quote. Cancellation is terminal and creates a claimable entitlement for the seller's entire FXRP lot. No other caller may cancel, and cancellation is unavailable after the first accepted quote.

### 3.4 FCC resolution

Anyone may request resolution after the quote deadline and no later than the absolute resolution deadline. Only the FCC instruction fee is forwarded; the RFQ contract retains no native currency. A request is allowed once, and the exact returned action ID is stored before a second effective instruction can be created.

A result is accepted once and only when:

- the action ID equals the RFQ's stored action ID and has not been consumed;
- the `ActionResult` signature, tag, status, and domain are valid;
- chain, contract, RFQ, result expiry, and result nonce bindings are valid;
- the result nonce has not been consumed;
- the RFQ is still open and within both expiry limits.

A `TRADE` result must name a participating provider and a winning quote greater than zero and no greater than `quoteCap`. `NO_VALID_QUOTE` and `INVALID_RFQ` must use the zero address and zero quote.

### 3.5 Timeout and terminal outcomes

Anyone may mark an unresolved `OPEN` RFQ as `TIMED_OUT` only after the absolute resolution deadline. Every terminal transition occurs at most once. `PROCESSING` and `REFUNDABLE` remain derived conditions rather than stored statuses.

## 4. Entitlements and Claims

M2 retains pull-based claims and never performs mass payouts during finalization.

For `SETTLED`:

- seller: `winningQuote` USDT0;
- winning provider: the fixed FXRP lot plus `quoteCap - winningQuote` USDT0;
- each losing provider: `quoteCap` USDT0.

For `NO_VALID_QUOTE`, `INVALID_RFQ`, or `TIMED_OUT`:

- seller: the full FXRP lot;
- each provider: `quoteCap` USDT0.

For `CANCELLED`:

- seller: the full FXRP lot;
- no provider entitlement exists because cancellation requires zero quotes.

Claim state is consumed before external token transfers. A reverted or false-return transfer reverts the whole claim transaction, restoring the entitlement. An account with no seller or provider role cannot claim.

## 5. Accounting Model

Per-RFQ accounting exposes deposited, claimable, and claimed totals for both assets. The accounting model must prove:

- deposited FXRP equals the fixed lot until claimed or remains represented by an FXRP entitlement;
- deposited USDT0 equals `providerCount * quoteCap` until claimed or remains represented by USDT0 entitlements;
- total claimed plus total claimable never exceeds total deposited for either asset;
- final entitlement totals equal deposits exactly for every terminal outcome;
- a provider participates at most once;
- an action ID and result nonce are consumed at most once;
- no terminal state can transition again;
- every valid deposit becomes settled or refundable.

Accounting additions are observational and safety-oriented; they do not create an administrator withdrawal path or protocol fee.

## 6. Token Assumptions

The supported production tokens are expected to behave as ordinary ERC-20 tokens. M2 explicitly tests and documents behavior for:

- standard transfers;
- false-return transfers;
- reverting transfers;
- fee-on-transfer deposits;
- rebasing or balance-changing deposits;
- reentrant token callbacks.

Non-exact deposits are rejected. Failed outgoing claim transfers preserve the entitlement by reverting. No attempt is made to support fee-on-transfer or rebasing assets.

## 7. Security Properties

- Checks-effects-interactions and `nonReentrant` protect custody-changing paths.
- FCC instruction creation cannot be duplicated by registry reentrancy.
- TEE signer material is immutable at construction or initialized exactly once before activation.
- No administrator can replace the signer, withdraw escrow, rewrite an RFQ, replace a quote, or override an outcome.
- Signatures use OpenZeppelin ECDSA validation and reject malformed or non-canonical signatures.
- Bounded provider iteration is limited to the hard maximum of 20.
- Ciphertext is treated as public chain data; plaintext values and encryption secrets are never stored or logged.

## 8. Test Strategy

Implementation follows RED-GREEN-REFACTOR checkpoints. Each production behavior begins with a test that fails for the intended missing behavior.

Required suites:

1. Unit state-transition tests for creation, quoting, cancellation, resolution, every terminal outcome, and claims.
2. Boundary and fuzz tests for amounts, deadlines, ciphertext sizes, provider counts, result quotes, and expiry.
3. Stateful invariants with multiple sellers, providers, RFQs, result orders, and claim orders.
4. Reentrancy harnesses for FCC instruction creation and token transfers.
5. False-return, revert-on-transfer, fee-on-transfer, and rebasing token harnesses.
6. Signature and binding rejection matrices.
7. All claim-order permutations for trade and no-trade outcomes.
8. Gas snapshots for creation, quote submission, resolution at two and 20 providers, finalization, and claims.

Critical contract logic must reach at least 90% line and branch coverage. No skipped test counts toward the verification gate.

## 9. Delivery Sequence

1. Cancellation and deadline-policy tests and implementation.
2. Result constraint tests and implementation.
3. Adversarial-token harnesses and exact-transfer behavior.
4. Claim-order and failure-preservation tests.
5. Explicit accounting views and conservation tests.
6. Fuzz and stateful invariant suites.
7. Gas snapshots, coverage, formatting, linting, and security review.
8. Compatibility verification against the M1 FCC fixtures and live-branch interface.

Generated ABI artifacts, root configuration, and lockfiles remain integration-agent owned and are not edited manually in the M2 branch.

## 10. Completion Gate

M2 is complete when:

- all required lifecycle and refund paths are implemented;
- Forge build, formatting, unit, fuzz, and invariant suites pass;
- critical line and branch coverage is at least 90%;
- gas at 20 providers and maximum ciphertext size is measured and documented;
- no critical or high-confidence high-severity security finding remains;
- deployment exposes no activated admin withdrawal or signer-replacement path;
- M1 fixture and result-verification compatibility remains green.

Passing local M2 tests does not replace the separate M1 requirement for a real FCC transaction on Coston2.
