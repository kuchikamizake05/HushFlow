# M2 → M3 → M4 Integration Audit

Date: 2026-08-13

Candidate branch: `codex/m4-integration` at `523f893`

Baseline: `main` at `ff63ffd`

## Decision

`codex/m4-integration` is the only current merge candidate. It already
contains the required milestone chain, so M2 and the canonical M3 interface
freeze must **not** be merged into it again.

Verified ancestors of `codex/m4-integration`:

1. `codex/m2-contract-safety`
2. `codex/m3-interface-freeze`
3. `codex/m4a-protocol-freeze`
4. `codex/m4a-indexer-read-api`
5. `worktree-m4b-frontend`

This preserves the intended dependency order:

```text
M2 contract safety
  → M3 canonical interface freeze
    → M4A protocol/read API
      → M4B web application
```

## Do not merge independently

The following are divergent implementation branches, not additional required
merge inputs:

- `codex/m3-crypto-core`
- `codex/m3-events`
- `codex/m3-read-api`

They overlap files already owned by `codex/m3-interface-freeze`. Merging them
again would duplicate protocol/ABI/fixture changes and risk DTO regressions.
In particular, the standalone read-API candidate was previously known red;
the frozen M4A protocol contract is the authoritative replacement.

## Integration evidence

The candidate contains 121 commits ahead of `main` and was validated locally:

- M4B web: 30 tests, coverage above 90% for lines and branches, typecheck and
  production build pass.
- M4A indexer: 106 targeted tests pass after the candidate merge.
- Protocol and indexer: protocol build, indexer typecheck, and indexer build
  pass after building the protocol dependency.

## Remaining gate before main

Do not merge into `main` yet. Resolve these first:

1. Add a build-compatible runtime export for `@hushflow/protocol/read-api`, or
   keep the M4B local strict boundary schemas synchronized through an explicit
   contract test. Turbopack cannot bundle the current source-first export.
2. Run the complete repository verification suite using the pinned Node 24.18
   runtime. The active Windows shell is Node 24.13.
3. Add browser E2E smoke coverage for fixture/unavailable/live-provenance
   states once Playwright is installed in the workspace.
4. Keep live deployment, FCC credentials, and Coston2 transactions outside the
   merge decision; they are M1 acceptance gates, not reasons to merge unsafe
   code into `main`.
