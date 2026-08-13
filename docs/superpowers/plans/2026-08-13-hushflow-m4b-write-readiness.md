# HushFlow M4B Write Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace coarse M4B write gating with an explicit public preflight model without adding wallet or broadcast authority.

**Architecture:** Extend the pure write preflight helper, pass the pending-manifest result to seller/provider forms, and render a stable public block reason. The model accepts facts rather than performing network or wallet effects.

**Spec:** `docs/superpowers/specs/2026-08-13-hushflow-m4b-write-readiness-design.md`

### Task 1: Readiness model

- [ ] Add failing `scripts/web/write-guard.test.ts` cases for pending manifest, wrong chain, missing code, missing wallet, and exact ready facts.
- [ ] Run the test RED; commit `test: define M4B write readiness matrix`.
- [ ] Extend `apps/web/src/writes/preflight.ts` with public `WriteReadiness` facts and stable reasons `DEPLOYMENT_PENDING`, `COSTON2_CHAIN_REQUIRED`, `CONTRACT_CODE_REQUIRED`, `RPC_PREFLIGHT_REQUIRED`, and `WALLET_CONNECTION_REQUIRED`.
- [ ] Run the test GREEN; commit `feat: add M4B write readiness model`.

### Task 2: Seller and provider presentation

- [ ] Add failing component assertions that both forms render the pending reason and contain no enabled submit control.
- [ ] Run the test RED; commit `test: define M4B readiness presentation`.
- [ ] Update the forms to consume the shared pending facts and display their public reason; retain local-only private form state.
- [ ] Run targeted tests, web typecheck/build, and browser smoke GREEN; commit `feat: show M4B write readiness blocks`.

### Task 3: Review

- [ ] Run formatting, diff check, and a changed-file scan for signing, transaction, and private-key APIs.
- [ ] Document local readiness evidence without claiming wallet activation or Coston2 execution.
