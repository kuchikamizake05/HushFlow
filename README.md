# HushFlow

HushFlow is a confidential trading execution layer for XRPFi. The hackathon MVP is a private RFQ in which a seller offers a fixed amount of FXRP for USDT0, Flare Confidential Compute selects the highest valid encrypted quote, and a Coston2 contract verifies and settles the signed result.

The approved product and protocol design is in docs/superpowers/specs/2026-07-22-hushflow-design.md. The dependency-ordered implementation plan is in docs/superpowers/plans/2026-07-22-hushflow-implementation-plan.md.

## Current phase

Milestone 0 establishes the reproducible toolchain, Coston2/FCC preflight checks, provenance records, and versioned protocol fixtures. The real FCC vertical slice is the first product milestone.

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
