# HushFlow M6 Local Release Readiness Design

Date: 2026-08-14

Status: approved by the project-wide staged-delivery decision

## Objective

Turn the remaining M6 local work into repeatable, safe release preparation:
an operational-drill plan, a fail-closed container-scan preflight, and an
evidence checklist that distinguishes local evidence from live Coston2 proof.

## Design

`pnpm release:drills` emits an allowlisted list of failure drills and their
safe expected outcomes. It does not make RPC, FCC, tunnel, Docker, database, or
wallet calls. The plan covers unavailable/fallback RPC, delayed FCC result,
unavailable proxy, restarted tunnel, registration expiry, indexer lag/rebuild,
failed result relay, expired result, insufficient helper gas/collateral,
reverted claim transfer, and timeout.

`pnpm preflight:container-scan` validates only that an operator-supplied image
reference has an immutable lowercase SHA-256 digest and that an approved local
scanner command is available. It never pulls, scans, builds, runs, or publishes
a container during preflight. An actual scan remains an explicit operator step.

The evidence document lists exact local passes and the live evidence still
required, including three consecutive guided Coston2 demos and a fallback RFQ.

## Acceptance criteria

- Drill output is deterministic, sanitized, and covers all eleven planned
  operational failures.
- Container scan preflight rejects tags/malformed digest and reports missing
  scanner without printing environment values.
- README/runbook/submission wording never claims a local drill or preflight is
  a live Coston2 demo, container scan, or security audit.
- Unit tests and root release gates remain green.
