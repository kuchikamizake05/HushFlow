<p align="center">
  <img src="apps/web/app/icon.svg" width="72" height="72" alt="HushFlow logo" />
</p>

<h1 align="center">HushFlow</h1>

<p align="center">
  <strong>Private quote clearing for XRPFi.</strong><br />
  Seller intent stays sealed. The settlement rule stays on-chain.
</p>

<p align="center">
  <a href="https://dev.flare.network/fcc/guides/getting-started">Flare FCC</a>
  · <a href="docs/architecture/overview.md">Architecture</a>
  · <a href="docs/security/threat-model.md">Threat model</a>
  · <a href="docs/submission/hackathon.md">Hackathon pack</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Coston2-chain%20114-E84142?style=flat-square" alt="Flare Coston2" />
  <img src="https://img.shields.io/badge/FCC-SIMULATED__TEE%20ready-0F9D8A?style=flat-square" alt="FCC simulated TEE" />
  <img src="https://img.shields.io/badge/TypeScript-321%20passing-3178C6?style=flat-square" alt="321 TypeScript tests passing" />
  <img src="https://img.shields.io/badge/Foundry-52%20passing-38BDF8?style=flat-square" alt="52 Foundry tests passing" />
</p>

## The short version

HushFlow is a sealed RFQ protocol for FXRP liquidity on Flare.

A seller escrows a fixed FXRP lot and keeps the reservation minimum private.
Providers compete with sealed USDT0 quotes. FCC evaluates the private terms,
then `HushFlowResultVerifier` and `HushFlowRfq` enforce the resulting allocation
on-chain.

This is not an AMM and it is not a public order book. It is a negotiation rail
for a specific moment: **one seller, several providers, one verifiable result**.

## Why a sealed RFQ?

Public quotes create a race. A seller's floor can be copied, a provider's price
can be shaded, and the negotiation can be front-run before the trade clears.

HushFlow separates the two things that need different visibility:

- **Public:** the asset lot, collateral, lifecycle, and final claim state.
- **Sealed:** the seller's minimum and each provider's quote while FCC resolves.

The result is not a promise that the chain is invisible. Contract calls,
ciphertext, lifecycle events, and final settlement remain observable. The
privacy claim is narrower: the private commercial terms are not posted as
plaintext inputs to the clearing decision.

## One RFQ, end to end

```text
1. Seller creates RFQ
   public: FXRP lot       sealed: minimum USDT0 price
              |
              v
2. Providers submit quotes
   public: collateral     sealed: quote amount
              |
              v
3. FCC resolves the sealed inputs
   highest valid quote + deterministic tie-break
              |
              v
4. Contract verifies the signed result
   HushFlowResultVerifier -> HushFlowRfq
              |
              v
5. Participants claim terminal balances
   seller proceeds · winning FXRP · losing-provider refunds
```

## The Flare boundary

| Component | What it does | What it does not claim |
| --- | --- | --- |
| Client encryption | Protects seller minimums and provider quotes before submission. | It does not hide public custody or transaction metadata. |
| FCC / FCE | Evaluates the sealed RFQ and produces a bound result. | It is not an oracle for arbitrary external events. |
| `HushFlowResultVerifier` | Checks the result against the configured domain and signer boundary. | It does not make an unregistered or unverified signer trusted. |
| `HushFlowRfq` | Holds custody accounting and exposes pull claims/refunds. | It does not rely on an operator to distribute user balances. |

FCC is the right Flare primitive for this use case because the input is a
private mutual agreement, not an observable payment or external-data fact that
belongs in FDC.

## What can be verified in this repository

| Claim | Inspect |
| --- | --- |
| Custody, settlement, timeout, and claims | [contracts/src/HushFlowRfq.sol](contracts/src/HushFlowRfq.sol) |
| Signed-result verification boundary | [contracts/src/HushFlowResultVerifier.sol](contracts/src/HushFlowResultVerifier.sol) |
| Canonical RFQ resolver | [services/fcc-extension/src/resolve-rfq.ts](services/fcc-extension/src/resolve-rfq.ts) |
| FCC wire adapter for `HUSHFLOW / RESOLVE_RFQ` | [services/fcc-extension/src/app/handlers.ts](services/fcc-extension/src/app/handlers.ts) |
| Pinned scaffold provenance and handoff | [FCC adapter handoff](docs/ai-handoff-fcc-scaffold-adapter.md) |
| System boundaries | [Architecture overview](docs/architecture/overview.md) |
| Assumptions and attacks | [Threat model](docs/security/threat-model.md) |
| Controlled Coston2 procedure | [Coston2 runbook](docs/runbooks/coston2-m1-live.md) |
| Hackathon narrative and evidence | [Submission pack](docs/submission/hackathon.md) |

## Evidence scoreboard

| Area | Evidence | Boundary |
| --- | --- | --- |
| Contract safety | 52 Foundry tests, including invariant coverage | Local verification; no live deployment implied. |
| FCC adapter | 321 TypeScript tests across 55 files | Local simulated integration; no production TEE claim. |
| Tooling | Typecheck, lint, formatting, and web production build pass | Build evidence is not deployment evidence. |
| Web product | `/trade`, `/liquidity`, `/portfolio`, `/proof`, and demo/readiness routes | Read views and fixtures remain visibly labelled. |
| Compose kit | Template config validates without pulling or running containers | Runtime/provider health still needs an approved rehearsal. |
| Coston2 preflight | Chain ID 114 and expected FXRP/USDT0 metadata checked read-only | Indexer, registry, signer, and TEE lifecycle remain operational gates. |

## Current status

The repository is submission-ready as a local, reproducible hackathon build.
The remote `main` contains the contracts, FCC adapter, web surface,
documentation, and Vercel configuration.

The live Coston2 path is intentionally **pending**, not silently inferred. A
real deployment requires:

1. current official FCC registry and signer configuration;
2. verified indexer access and a stable public proxy endpoint;
3. a registered TEE machine with fresh availability and status `PRODUCTION`;
4. separate owner approval for deployment, registration, and testnet writes.

Until those gates are complete, HushFlow does not present fixture output as a
Coston2 transaction, FCC attestation, or user traction.

## Local checks

These commands validate code or configuration only. They do not deploy,
broadcast, request faucet funds, register a TEE machine, or start a public
tunnel.

```bash
# Contracts and workspace
forge test
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check

# Web production build
pnpm --filter @hushflow/web build

# Read-only Coston2 and controlled-demo checks
pnpm preflight:coston2
pnpm demo:plan

# Compose template syntax only
docker compose -f infra/fcc/docker-compose.template.yml config --quiet
```

Requirements: Node.js `>=24.18.0 <25`, pnpm `11.15.1`, Foundry, and Docker for
the optional template check. Keep wallet keys, indexer credentials, and tunnel
tokens in ignored `.env.local`; never commit them.

## Repository map

```text
contracts/                 custody and result-verification contracts
services/fcc-extension/    FCC resolver and official scaffold adapter
apps/web/                  read-first product and demo interface
infra/fcc/                 pinned local FCC container templates
docs/architecture/         system and trust boundaries
docs/security/             threat model and disclosures
docs/submission/            judge-facing evidence and narrative
```

## Disclaimer

HushFlow is a testnet hackathon prototype. It has not been audited and is not
for production funds. No yield, privacy outcome, execution quality, or
settlement result is guaranteed outside the documented code and assumptions.

## License

No project-level license file is currently included. Review the dependency and
provenance notes before publishing the repository for reuse.
