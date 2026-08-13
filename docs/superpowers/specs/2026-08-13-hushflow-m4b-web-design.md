# HushFlow M4B Web Application and Adapted Design System

Date: 2026-08-13

Status: approved design; implementation pending plan

Branch: `worktree-m4b-frontend`

Baseline: `c5709cb`

M4A handoff: `docs/verification/m4a-m4b-frontend-handoff.md` at commit `66e5e25`

## 1. Purpose

Milestone 4B builds HushFlow's public product experience and wallet workflows against the frozen M3 interfaces while M4A completes its read-model corrections in parallel. The web application must make a confidential FXRP-to-USDT0 RFQ understandable within 30 seconds and preserve a three-to-four-minute judge journey without misrepresenting fixture data, protocol activity, privacy guarantees, or deployment status.

M4B owns `apps/web`, frontend component and route tests, frontend Playwright journeys, frontend provenance, and M4B verification documents. It does not change contracts, `services/indexer`, database schemas, deployment infrastructure, `packages/protocol`, or `packages/crypto` without owner coordination.

No push, deployment, live address substitution, public test link, or fabricated protocol evidence is part of this design.

## 2. Product and visual direction

### 2.1 Audience and goal

The landing page is judge-first and trader-ready:

- a first-time evaluator should understand the problem, privacy boundary, FCC role, and proof path within 30 seconds;
- a treasury seller should find the private RFQ action immediately;
- a liquidity provider should find quote opportunities and collateral terms;
- a security-conscious reviewer should reach technical evidence without reading marketing claims first.

Primary hero action: `Start Private RFQ` to `/trade`.

Secondary hero action: `Explore Proof` to `/proof`.

### 2.2 Visual language

HushFlow combines privacy-focused atmosphere with restrained premium product hierarchy:

- deep navy background instead of pure black;
- stepped navy surfaces with fine silver borders;
- cobalt reserved for primary action, focus, active state, and encrypted-flow emphasis;
- silver-white primary type and WCAG AA muted text;
- subtle technical grid and authored noise for depth;
- medium radii and disciplined density instead of excessive rounded cards;
- no generic purple neon, pervasive glass effects, fake charts, decorative token imagery, or unsupported partner walls.

The approved visual references are Aztec for privacy atmosphere, Linear for typography and motion restraint, and LayerZero for technical hierarchy. They are visual-only references; no source, composition, brand, asset, or copy is copied from them.

## 3. Reference selection and adaptation

The detailed record is `docs/provenance/frontend.md`.

Selected structural base:

- `pdsuwwz/nextjs-nextra-starter` at `34de7d1e7cac308430dd69c653214b22af62c329`;
- MIT license;
- selected for a current Next.js 16, React 19, Tailwind 4, Motion, theme, and responsive shell baseline.

Selected motion source:

- `magicuidesign/magicui` at `2d671cc6c0e0f40e28682c9cbddd16694dcfe627`;
- MIT license;
- selected only for audited animated beam, grid, reveal, and border primitives.

Rejected adaptation candidate:

- `nextify-limited/saasfly` at `49f7e28f69eae9cd9eed84221e13a3dbae87da67`;
- MIT license is compatible, but its Next.js 15 baseline and unrelated auth, billing, database, and generic SaaS surface make adaptation slower and riskier.

Every retained file is copied into a HushFlow-owned path, restyled, reduced to the needed behavior, tested, and covered by a third-party notice. Source branding, external media, testimonials, activity, metrics, copy, icons, favicons, and remote assets are rejected.

## 4. Information architecture

Required routes:

- `/` — product landing and privacy explanation;
- `/trade` — private seller RFQ wizard;
- `/market` — public RFQ discovery;
- `/liquidity` — provider opportunity and encrypted quote workspace;
- `/portfolio` — connected-wallet RFQs, deposits, outcomes, and claims;
- `/proof` — Proof Center index and privacy model;
- `/rfq/[id]` — state-aware RFQ lifecycle detail;
- `/demo` — guided judge journey.

Global navigation exposes HushFlow, Trade, Market, Liquidity, Proof, and wallet/network state. Portfolio becomes prominent when a wallet is connected. Mobile navigation preserves every route and wallet state without hiding critical actions behind hover behavior.

## 5. Landing architecture

Landing sections appear in this order:

1. Navigation and deployment/data-provenance state.
2. Hero with concise value proposition, two CTAs, and Encrypted Quote Convergence.
3. Trust strip containing only verified platform facts: Coston2, FCC, encrypted inputs, and onchain settlement. It contains no unverified metrics or partner claims.
4. Short sticky privacy story: private inputs, confidential resolution, public verifiable result.
5. Product route cards for Private RFQ, Liquidity Desk, Proof Center, and Portfolio.
6. Protocol lifecycle: Create, Quote, Resolve, Claim.
7. Proof preview using real protocol evidence or persistent labeled fixture data.
8. Final CTA and privacy boundary summary.
9. Footer with technical docs, deployment state, Coston2 explorer, provenance, and privacy links.

The landing page must not fetch ciphertext, wallet portfolio, or private-form data. Statistics appear only when validated real data provenance and healthy indexer state are available. Otherwise the section presents product mechanics without invented numbers.

## 6. Encrypted Quote Convergence

### 6.1 Story

The hero scene explains protocol behavior without depicting private values:

1. One seller envelope and several provider ciphertext streams enter an FCC core.
2. Labels use roles and encrypted symbols, never minimum or losing-quote numbers.
3. The FCC core resolves the inputs.
4. One public winning result exits toward settlement.
5. Losing streams remain encrypted and fade without becoming readable.
6. Scroll shifts focus from private inputs to confidential computation to public proof.

### 6.2 Motion behavior

Motion is balanced with restrained choreography:

- idle beam movement remains subtle;
- one short sticky sequence guides the privacy story;
- scrolling is never hijacked or snapped;
- pointer movement creates a small magnetic displacement on capable desktop pointers;
- core animation favors `transform` and `opacity`;
- animation pauses outside the viewport and while the document is hidden;
- mobile removes magnetic behavior and uses a lighter sequence;
- `prefers-reduced-motion` receives an equivalent static diagram and immediate content visibility.

Animation is decorative support. Semantic text explains the same information independently. Canvas or SVG nodes are hidden from assistive technology when equivalent text exists.

## 7. Component and module boundaries

M4B uses focused units with narrow public interfaces:

- `marketing/`: hero, convergence scene, trust strip, privacy story, product routes, proof preview;
- `shell/`: navigation, mobile menu, wallet state, network guard, deployment/provenance banner, footer;
- `rfq/`: wizard steps, lifecycle summary, public amount presentation, deadlines, participant list, action panels;
- `proof/`: proof index, evidence state, binding matrix, transaction links, ciphertext disclosure panel;
- `portfolio/`: combined account history, claim cards, pagination, completeness state;
- `feedback/`: coarse errors, empty states, retry controls, live-region transaction status;
- `motion/`: retained and adapted motion primitives plus reduced-motion variants;
- `adapters/`: labeled local fixtures, same-origin M4A reads, DTO parsing, and view-model mapping;
- `writes/`: live deployment guard, direct RPC preflight, encryption orchestration, and wallet transaction state.

Components do not redefine ABI, deployment addresses, statuses, result types, DTOs, amount logic, or encryption. Those remain owned by `@hushflow/protocol` and `@hushflow/crypto`.

## 8. Read architecture and M4A integration

### 8.1 Same-origin boundary

Browser reads follow:

```text
Browser
  -> same-origin Next.js read route
  -> M4A read API
  -> strict @hushflow/protocol DTO parse
  -> M4B view model
```

The server-side adapter owns the internal indexer URL. It is read-only and accepts no private form value, encryption input, wallet signature, secret, or transaction-enabling authority. It validates upstream DTOs, requires explicit `fixture | live` provenance, and maps transport failures to closed coarse codes.

No raw upstream error, connection detail, query text, credential, parser dump, or oversized payload reaches the browser. Responses use `no-store` where wallet-specific or health-sensitive state could become stale.

### 8.2 Fail-closed read states

Market and portfolio display unavailable rather than stale success when:

- DTO validation fails;
- data provenance is missing or untrusted;
- database health is unavailable;
- reorg replay is required;
- pagination completeness cannot be established.

Indexer lag may remain visible as a labeled degraded read state, but action authorization still comes only from direct contract reads.

### 8.3 Integration gate

Final M4A integration remains blocked until every checklist item in `docs/verification/m4a-m4b-frontend-handoff.md` passes. Independent M4B work uses a versioned local adapter and persistent `Local fixture data` label. Fixture mode never presents external explorer links for synthetic hashes as real evidence.

## 9. Write architecture and authority

Wallet writes use a separate path:

```text
Controlled browser form state
  -> @hushflow/crypto encryption
  -> fresh viem contract-state recheck
  -> wallet transaction containing ciphertext and public parameters only
```

Every action button remains disabled until a fresh live RPC check succeeds. Relevant preflight checks include:

- chain ID and canonical live deployment address;
- current RFQ status and deadlines;
- provider participation and provider limit;
- cancellation eligibility;
- resolution request state;
- timeout eligibility;
- `claimable` and `claimed` state;
- wallet balances and token allowances;
- required C2FLR for gas or FCC instruction fee.

Indexed status, deadline, balance, `claimable`, or `claimed` values never authorize a transaction. A recheck failure disables the action and shows a coarse retryable state. A rejected wallet prompt is not retried automatically.

## 10. Private input lifecycle

Seller minimum and provider quote follow this lifecycle:

1. User enters the value into controlled form state.
2. Validation converts decimal text to bigint-safe base units without floating point.
3. `@hushflow/crypto` creates and validates the bound envelope.
4. Encryption produces ciphertext within the 4,096-byte protocol maximum.
5. Wallet submission receives only ciphertext and public transaction parameters.
6. Plaintext form state is cleared after confirmed submission or explicit cancellation.
7. The submitted plaintext is not reconstructed or displayed after submission.

Plaintext minimums and quotes must never enter:

- URL, path, search parameters, or fragment;
- localStorage, sessionStorage, IndexedDB, cookies, or persisted query cache;
- server actions or same-origin read routes;
- indexer requests;
- analytics, telemetry, error tracking, session replay, or browser performance spans;
- console, thrown error messages, logs, screenshots, test traces, or fixture files;
- clipboard without an explicit user copy action during the still-controlled input stage.

Error messages use stable coarse codes and never include amount values, serialized envelopes, ciphertext, keys, raw FCC metadata, or upstream errors.

## 11. Route behavior

### 11.1 Trade

The seller wizard covers:

1. fixed FXRP lot;
2. private minimum total USDT0 proceed;
3. public USDT0 quote cap;
4. quote duration;
5. public/private/revealed summary;
6. token approval where required;
7. FCC metadata validation and local encryption;
8. live contract preflight;
9. wallet submission and confirmation.

Pending deployment, wrong network, unsupported wallet, insufficient C2FLR, insufficient FXRP, failed metadata validation, oversized ciphertext, rejected signature, reverted transaction, and stale preflight each have explicit states.

### 11.2 Market

Market uses stable cursor pagination and public fields only. It supports approved status, seller, and provider filters. Derived `PROCESSING` is computed from an indexed `OPEN` status plus time for presentation only; a transaction action still rechecks contract state. Ciphertext is never prefetched.

### 11.3 Liquidity

Liquidity Desk shows public lot, quote cap, deadline, participation count, and collateral requirement. Provider quote plaintext remains controlled only until encryption. After submission, UI shows participation and transaction status, not the submitted value.

### 11.4 Portfolio

Portfolio presents one deterministic combined seller/provider history with cursor continuation and explicit completeness state. It distinguishes indexed convenience values from directly verified claim readiness. Claim and refund actions require a fresh `claimable` and `claimed` read.

### 11.5 RFQ detail

One route handles stored and derived states:

- `OPEN`;
- derived `PROCESSING`;
- `SETTLED`;
- `NO_VALID_QUOTE`;
- `INVALID_RFQ`;
- `CANCELLED`;
- `TIMED_OUT`;
- wallet-specific `REFUNDABLE`.

Primary content remains readable. Technical ciphertext is requested only after the user opens an explicit proof disclosure, subject to the final shared endpoint policy.

### 11.6 Proof Center

Proof Center explains what is public, encrypted, revealed, and not guaranteed forever. It supports versioned `PARTIAL | VERIFIED` evidence:

- `PARTIAL` displays a coarse reason and never invents signature evidence;
- fixture and pending-deployment modes always display `PARTIAL`;
- `VERIFIED` requires the approved proof DTO v2, including exact result data, signature, action ID, submission tag, successful action status, decoded bindings, configured and recovered TEE signer, hashes, and transaction/block references.

M4B does not perform ad hoc transaction-calldata decoding. Until proof DTO v2 passes its owner gate, M4B builds and tests only the partial-evidence shell.

### 11.7 Guided demo

Demo route guides the approved real flow and labels controlled testnet helpers. It does not fabricate transaction hashes or activity. Until live evidence exists, development fixtures remain persistently labeled and cannot be presented as completed Coston2 proof.

## 12. Data honesty and deployment state

- Pending deployment blocks all writes before wallet interaction.
- Local fixtures display a persistent `Local fixture data` banner on every affected route and evidence card.
- Live data requires a live deployment manifest, explicit live provenance, valid DTOs, and compatible health state.
- No fabricated metrics, volumes, users, partners, testimonials, addresses, transaction hashes, quotes, minimums, or activity appear.
- Controlled testnet activity is labeled as controlled; it is not presented as organic protocol usage.
- Explorer links are built only from validated real chain identifiers and hashes.

## 13. Error and recovery model

Frontend errors use closed categories:

- wallet disconnected;
- wrong or unsupported network;
- unsupported wallet;
- insufficient C2FLR;
- insufficient FXRP or USDT0;
- approval required or failed;
- signature rejected;
- encryption unavailable;
- deployment not live;
- invalid cursor;
- indexer lagging;
- reorg replay required;
- database unavailable;
- RPC unavailable;
- FCC delayed;
- result expired;
- transaction failed;
- safe timeout available;
- proof partial or unavailable.

Retry controls appear only when retry is safe. Wallet rejection and failed writes are never auto-retried. Every repeated write starts from a new contract preflight. FCC delay explains the timeout path without promising settlement. Error text remains coarse and redacted.

## 14. Accessibility requirements

- Semantic header, navigation, main, section, aside, and footer landmarks.
- One logical heading hierarchy per route.
- Complete keyboard navigation and no pointer-only action.
- Visible cobalt focus indication meeting contrast requirements.
- Dialog focus trap and focus restoration.
- Screen-reader labels and descriptions for every form control.
- `aria-live` status for encryption, wallet, confirmation, processing, and recovery transitions without excessive announcements.
- WCAG AA contrast for text, controls, focus, and meaningful visual boundaries.
- Minimum 44 by 44 CSS pixel touch targets for critical controls.
- Reduced-motion equivalence for every animated section.
- Errors programmatically associated with their fields.
- Public, encrypted, revealed, fixture, degraded, partial, and verified states communicated by text and semantics, not color alone.

Critical routes must have no unresolved critical accessibility issue.

## 15. Responsive and performance requirements

Critical viewports cover compact mobile, large mobile, tablet, laptop, and wide desktop. Layouts must not cause horizontal page scrolling. Tables, proof bytes, and long hashes scroll inside bounded containers.

Performance rules:

- no WebGL requirement for the hero;
- no remote marketing media or runtime font dependency;
- motion code loads only where used;
- no landing fetch for ciphertext or wallet portfolio;
- pointer listeners use cleanup and passive behavior where applicable;
- animations pause while hidden or outside viewport;
- transforms and opacity are preferred over layout-triggering animation;
- mobile and reduced-motion variants avoid expensive choreography;
- long ciphertext and proof values render on explicit demand.

Performance budgets and measurement tooling are finalized in the implementation plan after the adapted source is inspected locally.

## 16. Testing strategy

All production behavior follows RED, GREEN, REFACTOR.

### 16.1 Unit and component tests

Cover:

- route and navigation behavior;
- deployment and fixture labels;
- every stored and derived lifecycle state;
- wallet, network, balance, allowance, encryption, RPC, M4A health, FCC, timeout, proof, and retry states;
- bigint-safe amount parsing and formatting through shared APIs;
- reduced motion, pointer cleanup, hidden-document pause, and responsive variants;
- strict DTO parsing and coarse error normalization;
- no ciphertext fetch outside explicit proof action;
- direct contract preflight before every write.

### 16.2 Privacy browser tests

Automated tests inspect:

- URL and history;
- localStorage, sessionStorage, IndexedDB, and cookies;
- network requests and request bodies;
- console output and browser errors;
- analytics and telemetry calls;
- screenshots, videos, and traces;
- server adapter requests and errors.

Marker plaintext values must appear only in controlled input memory before encryption and nowhere in retained artifacts.

### 16.3 Accessibility and responsive tests

- keyboard journeys and focus order;
- automated accessibility scans on critical states;
- screen-reader status semantics;
- contrast and state-label review;
- reduced-motion behavior;
- desktop and mobile visual assertions without private values.

### 16.4 Playwright journeys

- landing to Trade and Proof;
- seller creation flow;
- provider quote flow;
- market discovery and RFQ detail;
- portfolio and individual claim/refund;
- partial and verified Proof Center states when interfaces exist;
- guided demo;
- pending deployment, fixture, lag, replay-required, database unavailable, RPC unavailable, FCC delayed, rejected wallet, failed write, retry, and safe timeout paths.

### 16.5 Coverage

`apps/web` must reach at least 80 percent line and branch coverage. Privacy lifecycle, deployment guards, DTO parsing, contract preflight, encryption handoff, and write-state branches cannot be excluded merely to meet the threshold. No focused or skipped critical test is accepted.

## 17. Delivery sequence

1. Record final provenance and license notices.
2. Add RED tests for shell, tokens, routes, and fixture labeling.
3. Adapt minimum selected shell and component primitives.
4. Build landing and Encrypted Quote Convergence with accessibility fallbacks.
5. Add RED tests and static route shells for approved lifecycle states.
6. Build the local fixture adapter and same-origin read-adapter contract without final M4A integration.
7. Add wallet/network presentation and direct-write preflight interfaces.
8. Integrate read and write flows only after their external gates pass.
9. Complete privacy, accessibility, responsive, coverage, and Playwright evidence.

Each implementation unit preserves RED and GREEN checkpoint evidence. Only the path owner changes frontend package manifests; root lockfile changes require integration-owner coordination.

## 18. Scope exclusions

This M4B design does not:

- fix or modify M4A indexer code;
- alter database schemas or migrations;
- change protocol or crypto interfaces;
- create proof DTO v2;
- decode signed-result transaction calldata inside the frontend;
- deploy contracts, indexer, FCC service, web app, or public tunnel;
- replace pending deployment data with invented live values;
- implement demo LP helpers;
- claim live Coston2 or complete FCC evidence before recorded verification.

## 19. Completion gate

M4B is complete only when:

- frontend provenance matches actual retained source and notices;
- all approved routes are implemented and state-aware;
- build, formatting, lint, typecheck, unit, component, coverage, and Playwright gates pass;
- line and branch coverage are at least 80 percent;
- critical routes have no unresolved critical accessibility issue;
- critical desktop and mobile journeys pass;
- reduced-motion and keyboard journeys pass;
- storage, URL, network, console, analytics, screenshots, videos, and traces contain no private plaintext;
- fixture data is persistently labeled and cannot masquerade as live data;
- market and portfolio fail closed on invalid, unavailable, replay-required, or incomplete reads;
- every write uses a fresh direct contract-state recheck;
- Proof Center labels partial evidence and makes verified claims only from approved complete evidence;
- judge journey remains understandable within 30 seconds and executable within three to four minutes when approved live infrastructure is healthy.

If M4A or shared-package integration gates remain open, independent visual work may be locally complete, but M4B cannot claim production read integration or milestone completion.
