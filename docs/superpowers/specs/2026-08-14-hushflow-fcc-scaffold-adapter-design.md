# HushFlow FCC Scaffold Adapter Design

## Goal

Run HushFlow's existing private-RFQ resolution logic as a TypeScript Flare
Compute Extension (FCE) on the current official FCC scaffold, using a local
simulated TEE against Coston2. This is a hackathon demonstration path; it does
not claim hardware-backed production attestation.

## Context

The previous HushFlow live kit used an independently assembled `tee-node`
container pin. Coston2 FCC was redeployed and the organizer now requires the
current official extension scaffold and its dependency versions as one stack.
The existing `services/fcc-extension` package already owns the HushFlow RFQ
resolution and result-shaping logic, so rewriting it in Go would add risk
without improving the deadline-critical demo.

## Chosen approach

Vendor the current `flare-foundation/fce-extension-scaffold` into an isolated
FCC integration directory, retain its TypeScript implementation, and implement
one HushFlow command on top of its normative action contract.

The custom operation names are:

- OP type: `HUSHFLOW` (not reserved because it does not start with `F_`).
- OP command: `RESOLVE_RFQ`.

The scaffold handler accepts only the serialized encrypted-RFQ resolution
request required by the existing HushFlow resolver. It validates the envelope,
delegates resolution to the existing package, and returns a successful
`ActionResult` containing the canonical signed-result payload. The deployed
HushFlow verifier remains the authority that accepts or rejects a submitted
result.

## Boundaries

- Do not alter HushFlow settlement semantics, quote-selection rules, or result
  verification.
- Do not create a second resolver implementation or copy business logic into
  the scaffold.
- Do not publish tee-node signing/decrypt interfaces.
- Configure the proxy hostname as `fcc.hushflow.dev` and use the active
  Cloudflare Tunnel only during the later Coston2 run.
- Use a single active TEE identity per endpoint. A restart requires a new
  registration and pausing the stale identity.
- Use `SIMULATED_TEE=true`; no GCP Confidential Space claim is made.
- Do not deploy, register an extension, request faucet funds, or broadcast a
  transaction in this change. Those remain separate approved operator actions.
- Keep all wallet keys, indexer credentials, and tunnel tokens in ignored local
  configuration only.

## Component layout

1. The vendored scaffold owns FCC lifecycle scripts, Compose stack, proxy
   configuration, contract registration tooling, and version pins.
2. The scaffold TypeScript handler owns FCC wire decoding, routing, and
   `ActionResult` construction.
3. A narrow adapter maps `HUSHFLOW / RESOLVE_RFQ` into the existing
   `services/fcc-extension` resolver and maps its output back to the scaffold
   result shape.
4. Existing HushFlow contract and crypto packages remain the only owners of
   protocol encoding and verification semantics.

## Failure behavior

- Malformed, oversized, or unsupported requests produce an extension error;
  they never create a settlement result.
- A resolver error is returned as a failed `ActionResult` and is not retried by
  the adapter.
- Missing Coston2 prerequisites, a non-production TEE status, stale
  availability, or an unhealthy proxy stops the run before sending a HushFlow
  instruction.
- A changed tunnel hostname is treated as a configuration failure requiring
  post-build registration, never silently reused.

## Verification

Before any Coston2 action, the change must demonstrate:

1. Unit tests proving successful HushFlow request-to-result mapping.
2. Unit tests for malformed request, resolver failure, and reserved OP type
   rejection.
3. The official scaffold conformance target for the chosen TypeScript path.
4. Existing HushFlow package tests and contract tests remain green.
5. Compose/config rendering is valid without pulling, building, registering,
   opening a tunnel, or broadcasting.

The later approved live run must additionally verify `fcc.hushflow.dev/info`,
TEE status `2`, a fresh availability check, one active machine, on-chain
dispatch, and proxy result retrieval.

## Alternatives rejected

- Reimplementing HushFlow resolution in Go: better image reproducibility but
  duplicates protocol logic under the deadline.
- Retaining the previous hand-assembled tee-node template: it can drift from
  the redeployed Coston2 FCC stack and does not meet the organizer's current
  scaffold guidance.
