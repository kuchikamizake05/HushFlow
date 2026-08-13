# HushFlow Hackathon Submission Pack

## One-line pitch

**HushFlow lets XRPFi liquidity providers compete on a private RFQ while a
verifiable FCC-signed result settles the best valid price on Coston2.**

## Problem

Public RFQ quotes reveal seller price floors and provider pricing strategies.
That information can be copied or front-run before a trade completes.

## Solution

HushFlow keeps the commercial terms encrypted, lets Flare Confidential Compute
evaluate them, and asks an on-chain contract to settle only a bound signed
result. The product surfaces public lifecycle/proof evidence without exposing
the private RFQ inputs.

## Demo flow

1. Open the judge-first landing page and note the explicit fixture-data banner.
2. Follow **Demo** to see the encrypted RFQ lifecycle.
3. Show **Trade**: seller minimum stays in local component state and write is
   visibly disabled before live deployment.
4. Show **Market**, **Portfolio**, and **Proof Center**: read views retain data
   provenance; fixture proof is `PARTIAL`, never fabricated as a signature.
5. Explain the planned Coston2 three-wallet controlled test and evidence ledger.

## Technical highlights

- Coston2 RFQ custody contract with fixed FXRP lot, USDT0 collateral, terminal
  settlement/refund, and pull claims.
- Versioned encrypted envelopes; highest valid quote wins with deterministic
  tie-breaking.
- FCC HTTP/action adapter with bounded body handling, private tee-node decrypt
  wire, fresh result nonce, and signed-result validation.
- Reorg-aware indexer and a same-origin, read-only web adapter.
- Proof Center separates partial event evidence from verified signed evidence.

## Evidence

| Area | Current evidence |
| --- | --- |
| M1 local FCC slice | 32 TypeScript + 14 Solidity tests; 87.28% TypeScript statements and 89.50% Solidity lines. |
| M2 contract safety | 51 Solidity tests, fuzz/invariant suite; 98.28% HushFlowRfq lines. |
| M3 interfaces | 135 Vitest + 52 Forge tests; frozen ABI/events/crypto contracts. |
| M4A indexer | 242 TypeScript tests and 92% line coverage. |
| M4B web | 31 unit/component tests, 4 browser smoke tests, and 94.93% web line coverage. |
| Integrated candidate | 273/273 test suite, Forge ABI drift check, and all five production packages built with the pinned toolchain. |

Detailed records: [M1](../verification/m1-local-fcc-slice.md),
[M2](../verification/m2-contract-safety.md),
[M3](../verification/m3-interface-freeze.md),
[M4A](../verification/m4a-indexer-read-api.md), and
[M4B](../verification/m4b-web.md).

## Honest live-status statement

The local product and integration evidence are complete. A real FCC Coston2
transaction is intentionally **not** claimed until organizer read-only indexer
access, live registry/signer confirmation, a safe temporary proxy/tunnel, and
explicit deployment approval are available. The live kit uses the official
Flare `tee-node v0.0.24` source at reviewed commit `adc67a29...`, or an official
image only when its immutable digest and publication source are supplied. This
local preparation is not presented as FCC attestation or Coston2 deployment.
