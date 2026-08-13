# HushFlow Architecture

## Outcome

HushFlow settles a fixed FXRP-for-USDT0 RFQ without putting the seller's
minimum proceeds or provider quotes on the public chain. It is a controlled
testnet prototype; it does not claim live liquidity or users.

```text
Seller / providers
        | encrypted EnvelopeV1 payloads
        v
Coston2 HushFlowRfq contract ---- immutable RFQ events ---> M4A indexer ---> M4B web read views
        |                                                          ^               |
        | RESOLVE_RFQ instruction                                  |               | same-origin only
        v                                                          |               v
Flare Confidential Compute extension ---------------- signed result / explicit provenance banner
        |
        +-- private local tee-node decrypt/sign interface
```

## Trust boundaries

| Boundary | Rule |
| --- | --- |
| Browser to read API | Same-origin adapter accepts only approved read paths; it never forwards form plaintext, ciphertext, signatures, or wallet authority. |
| Browser to chain | Write/claim state must be rechecked directly from the contract; an indexer record is never enough to authorize a write. |
| Contract to FCC | The contract accepts a chain-scoped, bound signed result once, checks expiry/action binding, and settles only known participants. |
| Extension to tee-node | The extension calls the private `127.0.0.1:7701` decrypt/sign surface; no quote plaintext is logged or sent to the web read path. |
| Indexer to UI | Responses carry fixture/live provenance. Reorg/degraded health is visible instead of silently serving stale success. |

## Lifecycle

1. Seller deposits a fixed FXRP lot and creates an RFQ with an encrypted minimum.
2. Each provider deposits fixed USDT0 collateral and submits an encrypted quote.
3. After the quote window, the contract forwards a versioned FCC instruction.
4. FCC decrypts only inside the trusted extension, rejects invalid entries, and
   selects the highest valid quote (earlier valid submission breaks ties).
5. The extension returns a bound signed result. The contract verifies it once,
   records `SETTLED`, `NO_VALID_QUOTE`, or `INVALID_RFQ`, then supports pull
   claims/refunds.
6. M4A projects public events to read models. M4B displays only data with clear
   provenance; Proof Center distinguishes `PARTIAL` evidence from a verified
   signed-result record.

## Safety posture

- FCC container startup refuses an unpinned tee-node image.
- The deployment script is simulation-only and contains no broadcast call.
- Fixture data is never presented as live; no client write CTA is enabled until
  deployment/RPC preflight succeeds.
- The indexer is read-only and its pagination/reorg behavior is explicit.

For implementation evidence see [M1](../verification/m1-local-fcc-slice.md),
[M2](../verification/m2-contract-safety.md),
[M3](../verification/m3-interface-freeze.md),
[M4A](../verification/m4a-indexer-read-api.md), and
[M4B](../verification/m4b-web.md).
