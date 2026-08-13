# HushFlow M5 Demo Runner and Readiness Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secret-free M5 CLI readiness plan and a read-only web dashboard that prepare the controlled three-wallet demo without transaction authority.

**Architecture:** A pure shared module in `scripts/coston2` accepts only public configuration and the frozen deployment manifest, then emits an allowlisted readiness result. A small CLI serializes it, while `/demo/readiness` maps only selected environment-presence booleans into the same model; neither surface signs, connects a wallet, or broadcasts.

**Tech Stack:** TypeScript 6, Vitest 4, Next.js 16, React 19, viem 2, Playwright 1.57.

**Spec:** `docs/superpowers/specs/2026-08-13-hushflow-m5-demo-readiness-design.md`

## Global Constraints

- Do not broadcast a Coston2 transaction, open a tunnel, request faucet funds, run containers, or change credentials.
- Never read, serialize, render, or log private keys, ciphertexts, plaintext quotes, or raw environment values.
- The pending deployment manifest remains authoritative and must fail closed.
- `HUSHFLOW_BROADCAST_APPROVED=true` does not give the CLI or dashboard broadcast capability.
- The browser receives only public constants and requirement-presence booleans.

---

## File Structure

- `scripts/coston2/demo-readiness.ts`: pure readiness state, validation, deterministic actions, and sanitization.
- `scripts/coston2/prepare-demo.ts`: `pnpm demo:plan` CLI entry point.
- `scripts/fixtures/demo-readiness.test.ts`: shared-module and CLI tests.
- `apps/web/src/demo/readiness.ts`: browser-safe view model.
- `apps/web/src/demo/demo-readiness.tsx`: read-only dashboard component.
- `apps/web/app/demo/readiness/page.tsx`: safe server route.
- `scripts/web/demo-readiness.test.ts`: component/view tests.
- `tests/e2e/web.spec.ts`: dashboard smoke journey.
- `package.json`, `README.md`, `docs/verification/m5-demo-readiness.md`, `docs/submission/hackathon.md`: commands and evidence.

### Task 1: Shared readiness model

**Files:** Create `scripts/coston2/demo-readiness.ts`; create `scripts/fixtures/demo-readiness.test.ts`.

**Produces:** `buildDemoReadiness(input): DemoReadiness`, where state is `READY_FOR_APPROVAL`, `BLOCKED`, or `INVALID`.

- [ ] Write failing tests for a pending manifest (`BLOCKED` / `FCC_ORGANIZER_ACCESS`), the eleven deterministic actions, duplicate/malformed wallets, missing requirement order, and omitted unknown secret fields.
- [ ] Run `pnpm exec vitest run scripts/fixtures/demo-readiness.test.ts`; confirm RED because the module is absent; commit `test: define M5 demo readiness contract`.
- [ ] Implement only public inputs: deployment status/reason, seller/provider public addresses, approval boolean, and these presence flags: `COSTON2_RPC_URL`, `FCC_INDEXER_ACCESS`, `FCC_EXT_PROXY_URL`, `FCC_TEE_EXTENSION_REGISTRY`, `FCC_TEE_MACHINE_REGISTRY`, `FCC_TEE_SIGNER`.
- [ ] Normalize addresses with `viem/getAddress`, reject duplicates with `SCENARIO_WALLETS_NOT_DISTINCT`, return missing reasons as `MISSING:<name>`, and allowlist output fields.
- [ ] Rerun the test GREEN; commit `feat: add public M5 demo readiness model`.

### Task 2: Sanitized CLI

**Files:** Create `scripts/coston2/prepare-demo.ts`; modify `package.json`; modify `scripts/fixtures/demo-readiness.test.ts`.

**Produces:** `pnpm demo:plan`, valid sanitized JSON with `classification`, `state`, `reasons`, `requirements`, and `actions`.

- [ ] Add a failing `spawnSync` CLI test: empty environment exits zero and returns `BLOCKED`; supplied private-key sentinel never occurs in stdout; malformed public address returns `INVALID` without raw input.
- [ ] Run the fixture test RED; commit `test: define sanitized M5 demo CLI`.
- [ ] Implement the CLI using the frozen `coston2Deployment`; map only public address fields and `Boolean(process.env[name])` requirement flags. Catch validation errors into public `INVALID` JSON and exit zero.
- [ ] Add `"demo:plan": "node --env-file-if-exists=.env.local --import tsx scripts/coston2/prepare-demo.ts"`.
- [ ] Rerun test and `pnpm demo:plan` GREEN; commit `feat: add M5 demo readiness CLI`.

### Task 3: Read-only dashboard

**Files:** Create `apps/web/src/demo/readiness.ts`, `apps/web/src/demo/demo-readiness.tsx`, `apps/web/app/demo/readiness/page.tsx`; create `scripts/web/demo-readiness.test.ts`.

**Produces:** `/demo/readiness`, a direct-link read-only page with no buttons, forms, inputs, wallet connector, server action, or transaction endpoint.

- [ ] Add failing tests that the view displays `CONTROLLED TESTNET ACTIVITY`, `BLOCKED`, `FCC_ORGANIZER_ACCESS`, and eleven actions; serialize no private-key sentinel; render no `button`, `form`, or `input`.
- [ ] Run the new test RED; commit `test: define read-only M5 dashboard`.
- [ ] Implement a view model that accepts `DemoReadiness` and preserves only public text/action IDs. The route imports `coston2Deployment`, passes public address strings, and constructs presence flags with `Boolean(process.env[name])` only.
- [ ] Render inside `RfqRouteShell` with eyebrow `CONTROLLED TESTNET` and copy: `No wallet, signing key, or transaction authority is available on this page.` Do not add navigation.
- [ ] Run test, web typecheck, and build GREEN; commit `feat: add read-only M5 readiness dashboard`.

### Task 4: Browser evidence and documentation

**Files:** Modify `tests/e2e/web.spec.ts`, `README.md`, `docs/submission/hackathon.md`; create `docs/verification/m5-demo-readiness.md`.

- [ ] Add a failing Playwright journey for `/demo/readiness`: controlled-testnet heading, blocked reason, and no `button`, `input`, `form`, or `Connect wallet` surface on both configured browser projects.
- [ ] Run it RED and commit `test: define M5 readiness browser journey`.
- [ ] Document `pnpm demo:plan` and `/demo/readiness` as preparation only, with no Coston2 transaction claimed.
- [ ] Run targeted Vitest, web typecheck/build, `pnpm e2e:web`, and `pnpm format:check` GREEN; commit `docs: record M5 demo readiness evidence`.

### Task 5: Completion review

- [ ] Inspect `git diff --check origin/main..HEAD`, status, and changed files.
- [ ] Confirm changed readiness surfaces contain no secret assignment, `sendTransaction`, `writeContract`, `startBroadcast`, wallet connector, or raw environment value sent to the browser.
- [ ] Run root `pnpm verify` and Forge test before marking M5 locally complete.
