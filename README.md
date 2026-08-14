# HushFlow

> Private RFQs for XRPFi. Sealed terms, verifiable settlement.

HushFlow is a confidential request-for-quote protocol for FXRP on Flare. A
seller's reservation price and liquidity-provider quotes are encrypted before
they reach the FCC workflow. Flare Confidential Compute (FCC) evaluates the
sealed terms, and the custody contract settles only a result that passes its
on-chain verification boundary.

**Submission status:** local product, contracts, FCC adapter, and submission
materials are ready. Coston2 operational readiness is in progress. This
repository does **not** claim a deployed HushFlow contract, a registered
production TEE machine, an FCC attestation, or a completed Coston2 trade.

[![Flare Coston2](https://img.shields.io/badge/Flare-Coston2%20%28chain%20114%29-E84142?style=flat-square)](https://dev.flare.network/network/overview)
[![FCC](https://img.shields.io/badge/Flare%20Confidential%20Compute-SIMULATED__TEE%20ready-0F9D8A?style=flat-square)](https://dev.flare.network/fcc/guides/getting-started)
[![TypeScript tests](https://img.shields.io/badge/TypeScript-321%20passing-3178C6?style=flat-square)](services/fcc-extension)
[![Foundry tests](https://img.shields.io/badge/Foundry-52%20passing-38BDF8?style=flat-square)](contracts/test)
[![License](https://img.shields.io/badge/License-MIT-475569?style=flat-square)](LICENSE)

## The problem

An RFQ can have public custody while its commercial terms must remain private.
Publishing a seller's floor or a provider's quote exposes negotiation intent
before settlement. HushFlow is designed for the narrow XRPFi case where a
seller escrows a fixed FXRP lot, multiple providers compete with sealed USDT0
quotes, and the best valid quote settles through explicit contract rules.

## What HushFlow does

1. The seller creates an RFQ with a public FXRP lot and an encrypted minimum.
2. Providers submit encrypted USDT0 quotes and public collateral.
3. FCC resolves the sealed inputs and produces a bound result.
4. `HushFlowResultVerifier` validates the result against the configured
   verification boundary.
5. `HushFlowRfq` computes terminal entitlements: seller proceeds, winner asset
   claim, and losing-provider collateral refunds.

The protocol is non-custodial at settlement: funds move through pull claims
instead of a privileged operator distributing balances.

## How it fits together

```text
Seller                         Providers
  |                               |
  | encrypted minimum             | encrypted quotes + collateral
  +---------------+---------------+
                  |
                  v
       HushFlow RFQ custody contract
                  |
                  | FCC instruction
                  v
   Flare Compute Extension (SIMULATED_TEE on Coston2)
                  |
                  | signed, bound result
                  v
       HushFlowResultVerifier -> HushFlowRfq
                  |
                  v
      seller proceeds / winner FXRP / provider refunds
```

## What is private, and what is not

| Surface | Public | Protected by the design |
| --- | --- | --- |
| RFQ | asset lot, lifecycle, custody state | seller reservation minimum |
| Quote | provider address, collateral, lifecycle | provider quote amount |
| FCC resolution | result metadata needed for settlement | plaintext RFQ inputs during evaluation |
| Settlement | terminal claim state and transaction evidence | prior sealed commercial terms |

HushFlow does not claim that encrypted application data makes every aspect of
execution private. Contract calls, encrypted payloads, public lifecycle data,
and final settlement evidence remain observable. Read the
[threat model](docs/security/threat-model.md) for the precise security boundary.

## Why Flare

| Flare primitive | Role in HushFlow |
| --- | --- |
| Flare Confidential Compute / FCE | Processes sealed RFQ instructions and returns a verifiable result. |
| Coston2 | Testnet environment for the planned three-wallet validation. |
| FXRP | Asset lot offered by the seller in the RFQ flow. |
| USDT0 | Provider collateral and settlement denomination. |

FCC is the correct primitive here because the decision depends on private
mutual commercial terms, not on proving an observable external event.

## Judge's tour

Start here; every item is local source or documented evidence, not a claim of
live deployment.

| What to inspect | Where |
| --- | --- |
| RFQ custody, claim paths, and terminal settlement | [HushFlowRfq.sol](contracts/src/HushFlowRfq.sol) |
| Result-domain verification boundary | [HushFlowResultVerifier.sol](contracts/src/HushFlowResultVerifier.sol) |
| Contract regression and invariant suite | [contracts/test](contracts/test) |
| Canonical private-RFQ resolution | [resolve-rfq.ts](services/fcc-extension/src/resolve-rfq.ts) |
| Official FCC wire adapter for `HUSHFLOW / RESOLVE_RFQ` | [app handler](services/fcc-extension/src/app/handlers.ts) |
| FCC adapter tests and pinned provenance | [adapter handoff](docs/ai-handoff-fcc-scaffold-adapter.md) |
| Architecture and component boundaries | [architecture overview](docs/architecture/overview.md) |
| Trust assumptions and attack boundaries | [threat model](docs/security/threat-model.md) |
| Submission narrative and evidence index | [hackathon pack](docs/submission/hackathon.md) |
| Controlled Coston2 runbook | [live runbook](docs/runbooks/coston2-m1-live.md) |

## Current status

| Area | Status | Evidence / boundary |
| --- | --- | --- |
| RFQ contracts and verifier | Implemented and locally tested | 52 Foundry tests, including invariant calls. |
| FCC resolver and scaffold adapter | Implemented and locally tested | 321 TypeScript tests pass across 55 files. |
| Typecheck, lint, and formatting | Locally verified | TypeScript, ESLint, and Prettier checks passed. |
| FCC Docker template | Structurally valid | Compose config was validated without pulling or running containers. |
| Web interface | Present as a read-only/demo surface | Live wallet writes are not acceptance evidence. |
| Coston2 RPC and token metadata | Read-only preflight verified | Chain ID 114; expected FXRP and USDT0 addresses are frozen locally. |
| Indexer and tunnel prerequisites | User-configured; pending runtime verification | Credentials and named Cloudflare Tunnel are local secrets/configuration. |
| Contract deployment and extension registration | Not claimed | Requires separate explicit owner approval. |
| Production TEE machine and real FCC result | Not claimed | Requires current official FCC lifecycle configuration and Coston2 execution. |

## Coston2 path

The intended controlled test uses three distinct testnet wallets:

1. Seller deposits the FXRP lot and creates a sealed RFQ.
2. Provider A and Provider B submit sealed quotes with USDT0 collateral.
3. FCC resolves the RFQ; the contract verifies the result.
4. Seller, winner, and non-winner claim their respective terminal balances.

The repository intentionally blocks this path until the following are true:

- Coston2 prerequisites and the public endpoint are healthy;
- the current official FCC registry/signer configuration has been verified;
- the TEE machine reaches `PRODUCTION` with fresh availability;
- the owner explicitly approves the relevant deployment and registration
  transactions.

This is an operational safety boundary, not a missing product claim. See the
[Coston2 M1 runbook](docs/runbooks/coston2-m1-live.md) for the exact gates.

## Local verification

These commands validate local code or configuration. They do not deploy
contracts, request faucet funds, register an extension, start a public tunnel,
or broadcast a transaction.

```bash
# Contracts
forge test

# Workspace tests, types, style, and lint
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check

# Safe Coston2 and controlled-demo checks
pnpm preflight:coston2
pnpm demo:plan

# Validate the FCC Compose template only
docker compose -f infra/fcc/docker-compose.template.yml config --quiet
```

The project requires Node.js `>=24.18.0 <25` and pnpm `11.15.1`. Copy
`.env.example` to ignored `.env.local`; never commit wallet keys, indexer
credentials, or Cloudflare tunnel tokens.

## Built for the hackathon

HushFlow's application protocol, contracts, tests, verifier, and TypeScript
FCC adapter were built in this repository. The adapter pins the relevant
official FCE scaffold wire components and routes `HUSHFLOW / RESOLVE_RFQ` into
HushFlow's canonical resolver. The project preserves the upstream framework
boundary rather than presenting generic FDC proofs as an answer to private
agreement evaluation.

## Next milestones

1. Validate the local FCC stack against the current Coston2 configuration.
2. Deploy and register only after explicit owner approval.
3. Reach a fresh `PRODUCTION` TEE machine state and execute the controlled
   three-wallet scenario.
4. Record explorer links and a demo video only after the underlying actions
   have actually succeeded.

## Disclaimer

HushFlow is a hackathon prototype for testnet evaluation. It has not been
audited and is not suitable for production funds. No performance, privacy, or
settlement outcome is guaranteed beyond the behavior of the deployed code and
the documented assumptions.

## License

[MIT](LICENSE)
