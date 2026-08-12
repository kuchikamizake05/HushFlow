# M2 Contract and Protocol Safety Evidence

Date: 2026-08-12

Branch: `codex/m2-contract-safety`

Baseline: `833d815` (`docs: finalize M1 local runtime evidence`)

## Result

The local M2 contract-safety scope is implemented and verified without changing the M1 FCC wire format. This report is local engineering evidence. It does not replace the separate M1 requirement for a real FCC transaction on Coston2.

## Production changes

- Seller cancellation is available only while an RFQ is open and has zero accepted quotes.
- Quote duration is bounded from one minute through 24 hours.
- Resolution deadline is required to equal quote deadline plus 30 minutes while preserving the M1 function signature.
- Per-RFQ accounting exposes deposited, claimable, and claimed FXRP and USDT0 totals.
- Claimed accounting updates before token transfers and rolls back with a failed transfer.
- No administrator withdrawal, signer replacement, protocol fee, or mass payout path was introduced.

## Verification results

### Solidity

The final Forge gate used:

- 256 fuzz runs per fuzz property;
- 128 invariant runs;
- invariant depth 64;
- 8,192 randomized handler calls per invariant property.

Result:

- 51 Solidity tests passed;
- zero failures;
- zero skipped tests;
- three stateful invariants passed with zero handler reverts.

Stateful properties:

- claimed plus claimable never exceeds deposits;
- terminal entitlements equal deposits;
- escrow balances equal all deposits not yet claimed.

### TypeScript and FCC compatibility

The existing fixture and FCC runtime suites were executed from the M2 worktree using the already-installed workspace dependencies, without updating the lockfile:

- 7 test files passed;
- 32 tests passed;
- zero failures.

This preserves `EnvelopeV1`, `ResultDataV1`, resolution instruction encoding, selection behavior, ActionResult handling, tee-node decryption, and HTTP runtime compatibility.

### Coverage

Forge coverage, measured with optimizer and `viaIR` disabled as required by Foundry's accurate coverage mode:

| Critical source | Lines | Statements | Branches | Functions |
|---|---:|---:|---:|---:|
| `HushFlowResultVerifier.sol` | 100.00% | 100.00% | 100.00% | 100.00% |
| `HushFlowRfq.sol` | 98.28% | 96.86% | 90.74% | 100.00% |

The M2 requirement of at least 90% line and branch coverage for critical contract logic is satisfied.

### Adversarial token behavior

The tests verify:

- false-return deposits revert without recording an RFQ;
- reverting deposits revert without recording an RFQ;
- short/fee-like deposits are rejected and rolled back;
- balance-increasing/rebasing-like deposits are rejected and rolled back;
- false-return outgoing claims preserve the entitlement;
- reverting outgoing claims preserve the entitlement;
- a restored standard token transfer can claim the same entitlement successfully.

### Lifecycle and replay matrix

The suites cover:

- seller-only cancellation and rejection after the first quote;
- cancellation, timeout, and result finality;
- one-minute and 24-hour exact deadline boundaries;
- zero amounts and ciphertext size boundaries;
- seller, duplicate, late, and 21st-provider quote rejection;
- early, duplicate, late, zero-ID, and reentrant resolution requests;
- unrequested, early, late, stale, misbound, malformed, and replayed results;
- action ID reuse across RFQs;
- TEE signer one-time initialization and zero/unauthorized/replacement rejection;
- all six seller/two-provider trade claim orders through fuzzing;
- open, unrelated, repeated, failed, and successful claims.

## Gas evidence

Gas was measured using the optimized default Foundry profile.

| Operation | Measurement |
|---|---:|
| Contract deployment | 2,998,633 gas |
| Contract deployed size | 14,041 bytes |
| `createRfq` representative | 187,731 gas |
| `requestResolution`, two providers | 114,076 gas |
| `requestResolution`, 20 providers with 4,096-byte ciphertexts | 5,879,331 gas |
| `submitQuote` observed range | 119,993–496,281 gas |
| `submitResult` observed range | 32,404–142,225 gas |
| `claim` observed range | 28,951–166,022 gas |

The 20-provider maximum-input scenario succeeds locally. The 5.88 million gas resolution measurement must still be compared with the current Coston2 transaction limit and exercised on Coston2; it is not presented as live-network evidence.

## Security review

No high-confidence critical or high-severity vulnerability was identified in the M2 diff.

Reviewed properties:

- authorization for cancellation and signer initialization;
- terminal-state enforcement;
- exact token custody and rollback behavior;
- checks-effects-interactions and reentrancy guards;
- action ID and result nonce replay protection;
- signature, status, tag, chain, contract, RFQ, expiry, winner, and quote bindings;
- bounded provider iteration;
- absence of admin withdrawal and signer replacement paths;
- absence of plaintext quote/minimum logging.

Remaining external or operational risks:

- production FXRP and USDT0 behavior must match the tested ordinary ERC-20 assumption;
- FCC registry, proxy, signer identity, and live ActionResult remain an M1 live concern;
- Coston2 gas limits and actual execution cost require live verification;
- smart-contract and FCC-flow independent audits remain required before mainnet use.

## TDD checkpoints

- `64985e6` — RED seller cancellation lifecycle
- `92c004a` — GREEN seller cancellation
- `90656c0` — RED deadline policy
- `55ea9ec` — GREEN bounded deadlines
- `669ad14` — RED accounting conservation
- `5979966` — GREEN accounting views and claim totals
- `b6ae118` — adversarial ERC-20 custody matrix
- `ad333a7` — fuzzed deadline, quote, and claim boundaries
- `6d36752` — stateful custody invariants
- `09ac12b` — FCC result rejection matrix
- `68ef6f1` and `c10f1b2` — coverage and gas branch evidence

## Integration note

This branch adds `cancelRfq`, `RfqCancelled`, deadline constants, and `accounting`. Existing M1 entry-point signatures and FCC result encoding remain unchanged. Generated ABI files and root lockfiles were not edited and remain integration-agent owned.
