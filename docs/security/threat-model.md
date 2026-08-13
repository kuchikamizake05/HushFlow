# HushFlow Threat Model

## Scope and non-goals

This model covers the hackathon prototype's RFQ custody, FCC resolution,
read-model, and web boundaries. It does not claim that a local fixture or an
unapproved external deployment is production-ready.

## Assets

- Seller FXRP lot and provider USDT0 collateral.
- Seller minimum and provider quote plaintexts.
- FCC signer identity, action binding, and signed result.
- Testnet wallet keys, FCC indexer credentials, and tunnel credentials.
- Accurate public evidence and indexer provenance.

## Threats and mitigations

| Threat | Mitigation | Remaining condition |
| --- | --- | --- |
| Quote/minimum disclosure | Envelope ciphertext on-chain; plaintext exists only in FCC extension memory; UI read adapter rejects private input. | The live tee-node/proxy must be organizer-approved and separately audited. |
| Forged or replayed result | Chain-scoped signed result, action/result binding, expiry checks, replay protection, and one-time TEE signer initialization. | Live signer must be proven equal to the registered FCC machine signer. |
| Malformed/losing quote changes outcome | Canonical decoding, per-provider isolation, quote cap/minimum checks, deterministic highest-valid selection. | The FCC environment remains a trusted execution dependency. |
| Reentrancy or token accounting loss | Checks/effects/interactions protections, reentrancy coverage, pull claims, exact-transfer accounting. | Only supported ERC-20 behavior is in scope. |
| Indexer reorg/staleness misleads UI | Reconciliation, health states including replay-required, explicit provenance, and direct chain recheck before writes. | Deep reorg recovery requires operator-controlled replay. |
| Fixture represented as live | `fixture`/`live` metadata plus mandatory banner and unavailable state. | Operators must configure live source identity correctly. |
| Secret exposure | Ignored `.env.local`, set/missing-only preflight output, no values in plan/evidence, no public proxy in the compose template. | Users must keep shell history/screenshots clean. |
| Unreviewed tee-node supply chain | Required `@sha256` image digest and recorded official pin source. | Organizer must supply the exact supported image/configuration. |

## Operational controls

- Coston2 chain ID must be `114`; configuration checks refuse another chain.
- Deployment is dry-run only. Broadcast requires a separate user approval and
  `HUSHFLOW_BROADCAST_APPROVED=true` in a reviewed, local-only environment.
- Three test wallets must be distinct. The scenario stops at the first failed
  receipt and records transaction hashes only after confirmation.
- Evidence excludes plaintexts, private keys, indexer passwords, and tunnel
  tokens.

## Security verification evidence

- M1 covers signed ActionResult binding, replay/stale rejection, invalid/no-quote
  outcomes, refunds, and FCC instruction reentrancy.
- M2 adds adversarial token, fuzz, and invariant coverage.
- M3 freezes crypto/ABI/event contracts; M4A/M4B add provenance, privacy, and
  browser-safety checks.

See the detailed verification records in `docs/verification/`.
