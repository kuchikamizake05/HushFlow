# Milestone 6 Local Release Readiness Evidence

Status: local release preparation complete; live Coston2 release acceptance pending

Date: 2026-08-14

## Delivered locally

- `pnpm release:drills` emits eleven deterministic controlled operational
  drills without contacting RPC, FCC, Docker, a tunnel, database, or wallet.
- `pnpm preflight:container-scan` refuses an absent, tag-based, or malformed
  image reference. With a valid digest, it additionally requires `trivy` to be
  present before an operator may explicitly scan; preflight itself never pulls
  or scans an image.
- M4B write readiness now distinguishes pending deployment, wrong chain,
  missing contract code, unavailable RPC, and unavailable wallet. It introduces
  no wallet connector, signer, or transaction function.

## Local verification

| Gate | Result |
| --- | --- |
| Operational-drill and container-preflight tests | 2 passed |
| M4B readiness matrix and presentation tests | 4 passed |
| Existing M4B liquidity guard regression | 1 passed |

## Live evidence still required

- Run and archive an explicit digest-pinned image vulnerability scan.
- Perform the listed operational drills against the approved Coston2/FCC stack.
- Record three consecutive controlled guided demos and one independently
  verifiable fallback RFQ.
- Record contract addresses, runtime code hashes, FCC identity, deployment and
  scenario transaction hashes, and sanitized privacy evidence.
- Obtain and record honest external or simulated-persona feedback separately
  from controlled testnet activity.

No local preflight, drill plan, or test is presented as a live security audit
or a Coston2 deployment.
