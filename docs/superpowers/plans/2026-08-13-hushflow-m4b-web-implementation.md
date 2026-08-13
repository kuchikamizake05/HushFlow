# HushFlow M4B Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the judge-first HushFlow web experience with safe fixture-first reads and a same-origin M4A adapter.

**Architecture:** `apps/web` is a Next.js App Router application. Browser components consume typed view models only; server routes proxy and revalidate M4A reads using `@hushflow/protocol` schemas. Wallet writes remain presentational until live deployment and direct-RPC preflight are available.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, Playwright, viem, Zod.

**Spec:** `docs/superpowers/specs/2026-08-13-hushflow-m4b-web-design.md`

## Global Constraints

- Own only `apps/web`, M4B frontend tests, provenance, and M4B evidence.
- Do not change contracts, `services/indexer`, `packages/protocol`, `packages/crypto`, deployment configuration, or the root lockfile without integration-owner coordination.
- M4A read contract is `codex/m4a-indexer-read-api@97f281d`: `/metadata`, `/deployment`, `/health`, `/rfqs`, `/wallets/:address/portfolio`, and `/v2/rfqs/:id/proof`.
- `/metadata` is exactly `{ mode, sourceId }`; fixture mode always shows `Local fixture data`.
- Read adapter accepts no private form values, ciphertext inputs, signatures, or secrets.
- Pending deployment, invalid provenance, unavailable health, and replay-required health disable write CTAs and render unavailable rather than stale success.
- Private seller minimum and provider quote never enter URL, storage, logs, read routes, analytics, errors, screenshots, or test fixtures.
- M4B must keep at least 80% lines and branches, with RED/GREEN commits per task.

---

### Task 1: Create the isolated web package and verification harness

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/src/lib/routes.ts`
- Test: `scripts/web/package-contract.test.ts`

**Interfaces:**
- Produces `@hushflow/web` scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:coverage`.
- Produces route constant `productRoutes` for all eight approved routes.

- [ ] **Step 1: Write failing package/route contract tests**

```ts
expect(productRoutes).toEqual(["/", "/trade", "/market", "/liquidity", "/portfolio", "/proof", "/demo"]);
expect(existsSync("apps/web/app/rfq/[id]/page.tsx")).toBe(true);
```

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run scripts/web/package-contract.test.ts`
Expected: FAIL because the web package and route files do not exist.

- [ ] **Step 3: Create minimal Next.js/Tailwind package and route constants**

```ts
export const productRoutes = ["/", "/trade", "/market", "/liquidity", "/portfolio", "/proof", "/demo"] as const;
```

- [ ] **Step 4: Run GREEN and static gates**

Run: `pnpm exec vitest run scripts/web/package-contract.test.ts && pnpm --filter @hushflow/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web scripts/web/package-contract.test.ts
git commit -m "feat: scaffold M4B web application"
```

### Task 2: Build typed fixture/read adapters and same-origin proxy boundary

**Files:**
- Create: `apps/web/src/adapters/contracts.ts`
- Create: `apps/web/src/adapters/fixture.ts`
- Create: `apps/web/src/adapters/m4a.ts`
- Create: `apps/web/app/api/read/[...path]/route.ts`
- Test: `scripts/web/read-adapter.test.ts`

**Interfaces:**
- Consumes M4A DTO schemas from `@hushflow/protocol/read-api`.
- Produces `loadReadModel(path, options)` and `fixtureReadModel` with provenance `{ mode, sourceId }`.

- [ ] **Step 1: Write failing adapter tests**

```ts
expect(await fixtureReadModel.metadata()).toEqual({ mode: "fixture", sourceId: "m4b-local-v1" });
await expect(loadReadModel("/metadata", badFetcher)).rejects.toMatchObject({ code: "READ_UNAVAILABLE" });
```

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run scripts/web/read-adapter.test.ts`
Expected: FAIL because no adapter exists.

- [ ] **Step 3: Implement schema-validating read adapter**

```ts
export async function loadReadModel(path: ReadPath, fetcher = fetch): Promise<ReadModel> {
  // allowlisted path; no body; parse metadata before any downstream DTO.
}
```

- [ ] **Step 4: Run GREEN**

Run: `pnpm exec vitest run scripts/web/read-adapter.test.ts`
Expected: PASS, including malformed upstream DTO and missing provenance rejection.

- [ ] **Step 5: Commit**

```bash
git add apps/web scripts/web/read-adapter.test.ts
git commit -m "feat: add safe M4A read adapter"
```

### Task 3: Add shell, design tokens, navigation, and state banners

**Files:**
- Create: `apps/web/src/shell/app-shell.tsx`
- Create: `apps/web/src/shell/navigation.tsx`
- Create: `apps/web/src/shell/data-status-banner.tsx`
- Create: `apps/web/src/feedback/unavailable-state.tsx`
- Test: `scripts/web/shell.test.tsx`

**Interfaces:**
- Consumes `DataProvenance` and health state.
- Produces `<AppShell>`, `<DataStatusBanner>`, and keyboard-accessible global navigation.

- [ ] **Step 1: Write failing shell tests**

```tsx
render(<DataStatusBanner provenance={{ mode: "fixture", sourceId: "m4b-local-v1" }} />);
expect(screen.getByText("Local fixture data")).toBeVisible();
```

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run scripts/web/shell.test.tsx`
Expected: FAIL because shell components do not exist.

- [ ] **Step 3: Implement navy/silver/cobalt shell with semantic landmarks**

```tsx
export function DataStatusBanner({ provenance }: { provenance: DataProvenance }) {
  return provenance.mode === "fixture" ? <p role="status">Local fixture data</p> : null;
}
```

- [ ] **Step 4: Run GREEN**

Run: `pnpm exec vitest run scripts/web/shell.test.tsx`
Expected: PASS for desktop/mobile navigation, focus visibility, fixture and unavailable states.

- [ ] **Step 5: Commit**

```bash
git add apps/web scripts/web/shell.test.tsx
git commit -m "feat: add M4B shell and honest data states"
```

### Task 4: Implement landing page and reduced-motion convergence story

**Files:**
- Create: `apps/web/src/marketing/hero.tsx`
- Create: `apps/web/src/marketing/encrypted-quote-convergence.tsx`
- Create: `apps/web/src/marketing/landing.tsx`
- Create: `apps/web/app/page.tsx`
- Test: `scripts/web/landing.test.tsx`

**Interfaces:**
- Produces `<LandingPage>` with `Start Private RFQ` and `Explore Proof` actions.
- Produces a static equivalent for reduced motion.

- [ ] **Step 1: Write failing landing tests**

```tsx
expect(screen.getByRole("link", { name: "Start Private RFQ" })).toHaveAttribute("href", "/trade");
expect(screen.queryByText("2,400,000")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run scripts/web/landing.test.tsx`
Expected: FAIL because landing components do not exist.

- [ ] **Step 3: Implement content-first landing and aria-hidden decorative scene**

```tsx
<section aria-labelledby="hero-title"><h1 id="hero-title">Private FXRP execution. Verifiable settlement.</h1></section>
```

- [ ] **Step 4: Run GREEN**

Run: `pnpm exec vitest run scripts/web/landing.test.tsx`
Expected: PASS for CTA routes, no invented metrics, reduced-motion text equivalence, and fixture label.

- [ ] **Step 5: Commit**

```bash
git add apps/web scripts/web/landing.test.tsx
git commit -m "feat: build M4B judge-first landing"
```

### Task 5: Add all static route shells and lifecycle view models

**Files:**
- Create: `apps/web/src/rfq/lifecycle.ts`
- Create: `apps/web/src/rfq/route-shell.tsx`
- Create: `apps/web/app/trade/page.tsx`
- Create: `apps/web/app/market/page.tsx`
- Create: `apps/web/app/liquidity/page.tsx`
- Create: `apps/web/app/portfolio/page.tsx`
- Create: `apps/web/app/proof/page.tsx`
- Create: `apps/web/app/rfq/[id]/page.tsx`
- Create: `apps/web/app/demo/page.tsx`
- Test: `scripts/web/lifecycle.test.tsx`

**Interfaces:**
- Produces `derivePresentationState(summary, now)` and route shells for all approved statuses.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
expect(derivePresentationState(openRfq, nowAfterQuoteDeadline)).toBe("PROCESSING");
expect(derivePresentationState(settledRfq, now)).toBe("SETTLED");
```

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run scripts/web/lifecycle.test.tsx`
Expected: FAIL because lifecycle helpers and pages do not exist.

- [ ] **Step 3: Implement display-only lifecycle mapper and route shells**

```ts
export function derivePresentationState(rfq: RfqSummary, now: number): PresentationState { /* OPEN -> PROCESSING only for display */ }
```

- [ ] **Step 4: Run GREEN**

Run: `pnpm exec vitest run scripts/web/lifecycle.test.tsx`
Expected: PASS for all stored/derived states, unavailable state, and no write authority from indexed data.

- [ ] **Step 5: Commit**

```bash
git add apps/web scripts/web/lifecycle.test.tsx
git commit -m "feat: add M4B state-aware route shells"
```

### Task 6: Add private-form and wallet/preflight presentation boundaries

**Files:**
- Create: `apps/web/src/writes/preflight.ts`
- Create: `apps/web/src/rfq/private-form.tsx`
- Create: `apps/web/src/feedback/write-state.tsx`
- Test: `scripts/web/private-form.test.tsx`

**Interfaces:**
- Produces `canEnableWrite(preflight)` and controlled `PrivateAmountForm`.
- No implementation performs a wallet write or passes private fields to the read adapter.

- [ ] **Step 1: Write failing privacy/preflight tests**

```tsx
expect(canEnableWrite({ deployment: "pending", rpc: "ready" })).toBe(false);
expect(screen.queryByText("424242")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run scripts/web/private-form.test.tsx`
Expected: FAIL because form and preflight boundary do not exist.

- [ ] **Step 3: Implement controlled input and disabled-only write presentation**

```ts
export function canEnableWrite(state: PreflightState): boolean {
  return state.deployment === "live" && state.rpc === "ready" && state.contract === "fresh";
}
```

- [ ] **Step 4: Run GREEN**

Run: `pnpm exec vitest run scripts/web/private-form.test.tsx`
Expected: PASS for no URL/storage/read-adapter leakage and disabled pending/fixture/replay states.

- [ ] **Step 5: Commit**

```bash
git add apps/web scripts/web/private-form.test.tsx
git commit -m "feat: add safe private form and preflight states"
```

### Task 7: Add Proof Center v2 and portfolio pagination presentation

**Files:**
- Create: `apps/web/src/proof/proof-panel.tsx`
- Create: `apps/web/src/portfolio/portfolio-list.tsx`
- Test: `scripts/web/proof-portfolio.test.tsx`

**Interfaces:**
- Consumes `/v2/rfqs/:id/proof` `PARTIAL | VERIFIED` DTO and portfolio `nextCursor`.
- Produces explicit partial evidence and incomplete-list messaging.

- [ ] **Step 1: Write failing proof/portfolio tests**

```tsx
expect(screen.getByText("Evidence is partial")).toBeVisible();
expect(screen.queryByText("Signature verified")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run scripts/web/proof-portfolio.test.tsx`
Expected: FAIL because proof and portfolio components do not exist.

- [ ] **Step 3: Implement strict partial/verified rendering and cursor continuation**

```tsx
return proof.evidenceStatus === "PARTIAL" ? <PartialEvidence reason={proof.reason} /> : <VerifiedBindings proof={proof} />;
```

- [ ] **Step 4: Run GREEN**

Run: `pnpm exec vitest run scripts/web/proof-portfolio.test.tsx`
Expected: PASS for partial reason, verified bindings, fixture labeling, and cursor continuation.

- [ ] **Step 5: Commit**

```bash
git add apps/web scripts/web/proof-portfolio.test.tsx
git commit -m "feat: add proof and portfolio read states"
```

### Task 8: Run browser privacy, accessibility, responsive, and coverage gates

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/privacy.spec.ts`
- Create: `apps/web/e2e/judge-journey.spec.ts`
- Create: `docs/verification/m4b-web.md`

**Interfaces:**
- Produces repeatable verification evidence with no private plaintext in retained browser artifacts.

- [ ] **Step 1: Write failing browser privacy test**

```ts
await expect(page).not.toHaveURL(/424242/);
expect(await page.evaluate(() => localStorage.getItem("sellerMinimum"))).toBeNull();
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @hushflow/web exec playwright test e2e/privacy.spec.ts`
Expected: FAIL until the browser harness and route are available.

- [ ] **Step 3: Implement browser harness and semantic assertions**

```ts
await expect(page.getByRole("main")).toBeVisible();
await expect(page.getByText("Local fixture data")).toBeVisible();
```

- [ ] **Step 4: Run final gates**

Run: `pnpm --filter @hushflow/web test:coverage && pnpm --filter @hushflow/web build && pnpm --filter @hushflow/web exec playwright test`
Expected: all suites pass; lines and branches are at least 80 percent.

- [ ] **Step 5: Commit**

```bash
git add apps/web docs/verification/m4b-web.md
git commit -m "test: verify M4B privacy and judge journey"
```

## Plan Self-Review

- Spec coverage: Tasks 1-8 cover package setup, design shell, landing, all route shells, fixture/same-origin reads, private input boundaries, proof/portfolio, browser privacy, accessibility, responsive checks, and coverage.
- Scope: no task edits M4A, protocol, crypto, contracts, deployment, or a root lockfile.
- Contract consistency: every read uses the frozen M4A paths, fixture provenance `{ mode, sourceId }`, portfolio `nextCursor`, and `/v2/rfqs/:id/proof`.
- Placeholder scan: no TBD/TODO items or unspecified error behavior remain.
