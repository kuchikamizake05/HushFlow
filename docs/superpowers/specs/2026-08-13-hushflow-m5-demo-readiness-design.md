# HushFlow M5 Demo Runner and Readiness Dashboard Design

Date: 2026-08-13

Status: approved design; implementation pending

## Objective

Make the controlled three-wallet Coston2 demo operationally repeatable without
granting the web application transaction authority or weakening the existing
pending-deployment and broadcast guards.

The scope delivers both a local CLI dry-run and a browser-visible readiness
dashboard. It prepares the exact same scenario for a later approved live run,
but it does not broadcast transactions, open a tunnel, run containers, request
faucet funds, or store private keys.

## Scope

### Shared demo plan

A shared TypeScript module defines the controlled roles (seller, provider A,
provider B), public prerequisites, and ordered action plan. It has no wallet
private-key input and it does not call a signing or broadcast API.

The plan includes these actions:

1. verify Coston2 chain and pending/live deployment status;
2. verify public seller/provider addresses are present and distinct;
3. verify required FCC and proxy configuration names are present;
4. inspect only public readiness data when an RPC is available;
5. identify the safe stop point when live deployment or approval is absent;
6. list the later seller, provider, FCC result, and claim actions in order;
7. identify the evidence fields that must be recorded after an approved run.

Each action has a stable identifier, role, category, blocking status, and a
safe human-readable description. No plaintext seller minimum, quote,
ciphertext, credential, token value, private key, or environment value becomes
part of the plan output.

### CLI

`pnpm demo:plan` invokes the shared module and prints a sanitized JSON report
to stdout. It is usable with an absent `.env.local`, in which case it exits
successfully with a `BLOCKED` readiness state and descriptive public reason
codes. It exits nonzero only for malformed public configuration or an internal
program error.

The CLI may write a JSON report only when a caller supplies an explicit output
path. The report has restrictive permissions where supported and is still
sanitized. It never reads or prints private-key values.

### Web dashboard

The new `/demo/readiness` route renders the same shared plan. It is read-only:
there is no key input, wallet connection, server action, transaction endpoint,
or broadcast button. It displays the current deployment state, the readiness
summary, prerequisite categories, action sequence, and a permanent controlled
testnet label.

The dashboard obtains only selected public environment-presence booleans and
known non-secret configuration. It must not expose URLs that contain credentials
or any raw environment value to the browser.

## State model

The readiness result is one of:

- `READY_FOR_APPROVAL`: all public prerequisites are present and the manifest
  is live, but no transaction is sent;
- `BLOCKED`: a required external prerequisite, approval, or live manifest is
  absent;
- `INVALID`: provided public configuration is malformed or inconsistent.

`READY_FOR_APPROVAL` is deliberately not `READY_TO_BROADCAST`: a separate,
reviewed deployment change and `HUSHFLOW_BROADCAST_APPROVED=true` are still
required before a live action is possible.

## Error and privacy behavior

- The pending deployment manifest always returns `BLOCKED` and names only its
  public blocking reason.
- Missing requirements are reported by environment variable name, never value.
- Duplicate or malformed public addresses produce `INVALID`.
- An RPC failure produces `BLOCKED` with a coarse `RPC_UNAVAILABLE` code; it
  does not expose request headers, raw upstream errors, or credentials.
- The CLI and dashboard share the same serialization function, which admits
  only an explicit public allowlist of fields.

## Test strategy

Implementation follows test-first RED/GREEN checkpoints.

Unit tests prove that the shared module:

- blocks a pending deployment manifest;
- requires the three distinct public wallet addresses;
- reports FCC/indexer/proxy configuration by name only;
- preserves the deterministic controlled action order;
- never serializes private-key-like fields or provided secret values; and
- refuses malformed addresses and unsafe broadcast state.

CLI tests prove default output is sanitized and valid JSON. Route/component
tests prove the dashboard shows the blocked/invalid states and has no write or
wallet-control surface. Existing browser smoke coverage is extended only with
the read-only readiness journey.

## Acceptance criteria

This scope is complete when:

- `pnpm demo:plan` works without secrets and returns a deterministic, sanitized
  readiness plan;
- the CLI has no signing, transaction, private-key, or broadcast capability;
- `/demo/readiness` renders the shared status and scenario without exposing
  environment values or adding a write path;
- pending deployment, missing prerequisites, malformed public input, and
  unavailable RPC fail closed with stable public reason codes;
- targeted unit, CLI, route/component, and browser tests pass; and
- documentation accurately says this is preparation for controlled Coston2
  activity, not a completed live demo.

## Non-goals

This design does not implement the later M4B wallet transaction flow, a live
multi-wallet broadcaster, FCC registration, a liquidity-provider service,
container vulnerability scanning, or a Coston2 deployment. Those are separate
follow-on scopes because they require either a live environment or a distinct
security design.
