# Milestone 4B Web Verification

Status: locally integrated; live read and wallet activation pending

Date: 2026-08-13

Branch: `codex/m4-integration`

## Delivered

- Next.js judge-first landing, navigation, mobile-safe route shells, and
  persistent fixture/live/unavailable provenance states.
- Same-origin read-only M4A adapter. It accepts no private form value,
  ciphertext, signature, or wallet authority. Downstream reads require valid
  provenance first.
- Safe fixture Market, Portfolio, Liquidity, Trade, Proof Center, RFQ, and
  guided Demo views. Fixture proof is explicitly `PARTIAL` and never claims a
  signed result.
- Private seller minimum and provider quote remain controlled component state;
  no URL, browser storage, telemetry, or read-adapter path receives them.
- Write and claim controls fail closed until live deployment plus direct RPC
  preflight are available.
- A build-compatible runtime export at `@hushflow/protocol/runtime/read-api`
  lets Next consume the frozen read DTO artifact rather than package source.

## Verification

| Gate | Result |
| --- | --- |
| M4B unit/component tests | 31 passed |
| M4B coverage | 94.93% lines, 94.11% statements, 91.52% branches, 100% functions |
| Web typecheck | passed |
| Web production build | passed |
| Browser E2E | 4 passed: Chromium desktop and Pixel 5 mobile |
| Browser assertions | fixture label, accessible navigation, private value absent from URL/storage, write CTA disabled |
| M4A integration regression | 106 targeted indexer tests passed on the integration candidate |
| Full pinned candidate coverage | 46 files, 273 tests passed; 90.85% statements, 81.93% branches, 95.75% functions, 92.25% lines |
| Contract ABI gate | Forge build passed; checked-in ABI has no artifact drift |

## Not yet claimed

- Browser execution against live M4A data; `M4A_READ_API_URL` is not set.
- Live Market/Portfolio/RFQ/Proof data mapping.
- Wallet connection, `@hushflow/crypto` encryption submission, direct viem RPC
  preflight, and transaction lifecycle.
- Live Coston2 evidence. These remain blocked by the M1 organizer access and
  deployment gate.

## Pinned runtime note

The repository-local WSL toolchain reports Node 24.18.0, pnpm 11.15.1, Go
1.26.5, Foundry 1.7.1, and Docker 29.1.3. Its full coverage gate passed after
building the required Forge artifact. The worktree's Windows-specific Git
pointer requires explicit repository metadata when that gate is run from WSL.
