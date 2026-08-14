# HushFlow RFQ Workflow UI Design

## Purpose

Refocus the application interface on HushFlow's real workflow: a seller creates
a private RFQ, liquidity providers submit sealed quotes, FCC resolves the RFQ,
and each wallet sees only its own resulting position. The UI must not represent
fixtures or locally simulated actions as Coston2 execution.

## Scope

This change covers the authenticated product surfaces only:

- `/trade`: seller RFQ creation;
- `/liquidity`: provider response to a selected RFQ;
- `/portfolio`: wallet-specific positions and settlement evidence.

Landing-page marketing, FCC runtime/deployment logic, contracts, and live wallet
write support are out of scope. Write controls remain fail-closed until the
existing live deployment preflight explicitly enables them.

## Product direction

Use a premium, restrained fintech presentation: graphite surfaces, warm ivory
text, sparse emerald/amber status color, generous spacing, and compact
transactional typography. The product must read as a private bilateral/RFQ
workflow, not an AMM, orderbook, or generic trading terminal.

## Page design

### Trade: create private RFQ

The page has a concise seller workspace:

1. A header states the role and presents the RFQ lifecycle: `Open`, `Quotes
   sealed`, `FCC resolves`, `Settle`.
2. The form distinguishes public custody (FXRP lot) from protected data (seller
   minimum in USDT0), and explicitly labels the latter as locally encrypted
   before FCC processing.
3. A review block states public and private boundaries, required custody, and
   the current readiness state.
4. A disabled/preflight action is honest: it explains why it cannot submit
   rather than manufacturing a transaction hash.

No price chart, market volume, orderbook, public reservation minimum, or
synthetic "live" RFQ stream appears on this page.

### Liquidity: respond to an RFQ

The provider first sees a selected-RFQ summary with the public FXRP lot,
deadline, collateral requirement, and RFQ state. It never reveals the seller's
minimum. The quote form accepts a private USDT0 quote, clearly explains that
competing makers cannot read it, and includes a review of collateral and
refund outcomes. The call to action remains fail-closed before live readiness.

### Portfolio: positions for the connected role

The page presents a single wallet's view. It contains a small balance summary
(`locked`, `claimable`, `settled`) followed by RFQ rows with role, status,
asset outcome, and proof availability. Fixtures carry a persistent `Demo data
— no on-chain transaction` label. Seller and multiple provider outcomes are
not mixed into a single wallet's portfolio.

## State and integrity requirements

- Fixture data is identified as fixture/demo at every relevant page boundary.
- Buttons never claim broadcast, verification, or settlement without a real
  receipt from a live action.
- Explorer links are only rendered for verified transaction data; fixture rows
  render an unavailable/placeholder proof state instead.
- Security copy is specific and bounded: secret amounts and quotes are
  encrypted before FCC handling; avoid absolute claims such as "immune" or
  "zero leakage".
- Accessible labels, visible focus treatment, readable status text, and mobile
  stacking are preserved.

## Test plan

Add presentation-level Vitest coverage for:

- an RFQ lifecycle that never exposes a seller secret;
- provider copy that shows public RFQ terms and protected quote boundaries;
- portfolio fixture state labeling and wallet-role isolation;
- the absence of a successful transaction state without a real receipt.

Run the focused web tests, then the web typecheck and lint checks. The full
workspace suite may be re-run when the local dependency environment is repaired.

## Non-goals

- No contract deployment, Coston2 broadcast, faucet action, public tunnel
  change, or FCC registration.
- No wallet signer or transaction implementation.
- No representation that HushFlow is already live on Coston2.
