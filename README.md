# HushFlow

HushFlow is a confidential trading execution layer for XRPFi. The hackathon MVP
is a private RFQ: a seller offers a fixed amount of FXRP for USDT0, providers
submit encrypted quotes, Flare Confidential Compute selects the highest valid
quote, and a Coston2 contract verifies and settles the signed result.

The approved product and protocol design is in docs/superpowers/specs/2026-07-22-hushflow-design.md. The dependency-ordered implementation plan is in docs/superpowers/plans/2026-07-22-hushflow-implementation-plan.md.

## What is ready

- M1 local FCC vertical slice: encrypted resolution, signed-result verification,
  settlement/refund, replay protection, and one-time signer initialization.
- M2 contract hardening, M3 frozen protocol/crypto interfaces, M4A read indexer,
  and M4B judge-first web experience are merged on `main`.
- The UI starts in explicit fixture mode. It never represents fixture data as
  live, never sends private quote/minimum values to a read API, and fails closed
  for writes before live deployment/RPC checks.

See [architecture overview](docs/architecture/overview.md),
[threat model](docs/security/threat-model.md), and the
[hackathon submission guide](docs/submission/hackathon.md).

## Live status

No Coston2 transaction or FCC deployment is claimed yet. Live validation still
needs organizer-issued read-only indexer credentials, confirmation of the live
FCC registry/signer configuration, a temporary Coston2-only proxy route, and a
separate explicit approval before any testnet broadcast.

## Canonical development environment

- Windows 11 host
- WSL2 Ubuntu 24.04 shell
- Docker Desktop with WSL integration
- Node.js, pnpm, Go, and Foundry versions from .tool-versions

From WSL2:

    bash scripts/setup/bootstrap-tools.sh
    source scripts/setup/use-local-tools.sh
    pnpm install --frozen-lockfile
    pnpm preflight:toolchain
    pnpm verify

No push, deployment, public tunnel, faucet request, or other external mutation is implied by the local setup commands.

## M1 live kit (safe preparation)

The following commands only validate local configuration or simulate deployment:

    set -a
    source .env.local
    set +a
    pnpm preflight:coston2
    pnpm preflight:fcc-container
    docker compose -f infra/fcc/docker-compose.template.yml config --quiet
    pnpm preflight:fcc
    pnpm plan:coston2
    forge script contracts/script/DeployHushFlow.s.sol:DeployHushFlow --rpc-url "$COSTON2_RPC_URL"

The default template builds the official Flare `tee-node` source pinned to
`v0.0.24` and commit `adc67a29eb7162f6f1b5dabcbca320009480695e`. If Flare or
the organizer supplies a prebuilt image, use
`infra/fcc/docker-compose.image.template.yml`; the preflight accepts it only
with an immutable `@sha256` digest and a recorded publication source. Both
modes share the tee-node network namespace with the HushFlow extension, so the
signing/decrypt port stays private and no service publishes a port.

`docker compose ... config` and the preflight only validate configuration. They
do not pull, build, run, register, tunnel, or broadcast. A later explicit
`docker compose build` may access the network to fetch the reviewed source.
Use [the M1 runbook](docs/runbooks/coston2-m1-live.md) for the controlled
three-wallet sequence and evidence ledger.

## M5 demo readiness (no broadcast)

`pnpm demo:plan` emits a sanitized, deterministic readiness plan for the
controlled seller/provider A/provider B scenario. It accepts no private key,
cannot sign or broadcast, and reports missing prerequisites by name only. The
internal [readiness dashboard](/demo/readiness) renders the same public plan;
it has no wallet connection or transaction control. Both are preparation for a
later approved Coston2 run, not evidence of a live demo.
