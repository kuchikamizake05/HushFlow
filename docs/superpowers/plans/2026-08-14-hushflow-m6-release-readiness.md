# HushFlow M6 Local Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic operational-drill planning and fail-closed container-scan preparation without external side effects.

**Architecture:** Pure TypeScript produces the public drill matrix and a small Bash preflight validates only scanner availability and immutable image shape. Documentation records their boundary and lists the live evidence still absent.

**Spec:** `docs/superpowers/specs/2026-08-14-hushflow-m6-release-readiness-design.md`

### Task 1: Operational drill matrix

- [ ] Add RED Vitest cases for eleven stable drill IDs, all-safe outcome strings, and secret-free JSON.
- [ ] Commit `test: define M6 operational drill matrix` after RED.
- [ ] Add `scripts/release/operational-drills.ts`, `scripts/release/prepare-drills.ts`, and `pnpm release:drills`.
- [ ] Run GREEN and commit `feat: add M6 operational drill plan`.

### Task 2: Container scan preflight

- [ ] Add RED tests for absent scanner, tag image, malformed digest, and valid immutable digest.
- [ ] Commit `test: define M6 container scan preflight` after RED.
- [ ] Add `scripts/setup/check-container-scan.sh` and `pnpm preflight:container-scan`; preflight must never call the scanner.
- [ ] Run GREEN and commit `feat: add M6 container scan preflight`.

### Task 3: Evidence

- [ ] Add M6 verification evidence, update operator docs, run formatting/diff/security review, root verification, Forge, and browser smoke.
- [ ] Commit verified documentation only after gates are green.
