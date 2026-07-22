# ADR 0001: Toolchain and FCC Baseline

Status: accepted for Milestone 0

Date: 2026-07-22

## Context

HushFlow needs one reproducible environment across TypeScript, Foundry, Docker, and current Flare FCC deployment tooling. The implementation plan initially pinned TypeScript 7.0.2.

During M0 preflight, the current typescript-eslint 8.65.0 package declared support for TypeScript versions below 6.1.0. Forcing TypeScript 7 would make lint behavior unsupported and weaken the verification gate.

The current official FCC examples also require Go-based deployment tools even when application logic is written in TypeScript.

## Decision

- WSL2 Ubuntu 24.04 is the canonical development shell.
- Node.js is pinned to 24.18.0 LTS.
- pnpm is pinned to 11.15.1.
- TypeScript is pinned to 6.0.3 until the lint toolchain declares TypeScript 7 support.
- Go is pinned to 1.26.5 for FCC deployment tooling.
- Foundry is pinned to 1.7.1 and solc to 0.8.27.
- Docker Desktop 29.1.3 provides the WSL2 container runtime.
- PostgreSQL uses the multi-platform postgres:18 manifest digest recorded in infra/compose/docker-compose.yml.
- pnpm build scripts are denied by default; only the pinned esbuild package is explicitly allowed during M0.

## Consequences

- The approved product and protocol design is unchanged.
- Dependency upgrades require a compatibility check, lockfile update by the integration owner, and a full verification rerun.
- TypeScript 7 can be reconsidered after typescript-eslint support is published.
