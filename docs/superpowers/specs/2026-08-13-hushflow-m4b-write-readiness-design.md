# HushFlow M4B Write Readiness Design

Date: 2026-08-13

Status: approved by the project-wide staged-delivery decision

## Objective

Replace the M4B boolean write guard with an auditable readiness model that can
only enable a future wallet flow after a verified live Coston2 manifest, the
expected chain, a deployed contract-code check, and a public wallet address are
all present.

## Design

The browser-safe `writes/preflight` module accepts supplied public facts only:
deployment state, RPC status, chain ID, contract-code status, and wallet status.
It returns either `READY` or one stable blocking reason. The current pending
manifest therefore produces `DEPLOYMENT_PENDING` and keeps both seller and
provider forms disabled.

No module requests accounts, signs messages, encrypts values, constructs
calldata, calls `writeContract`, sends a transaction, or receives a private
key. A later approved live-wallet integration must consume this readiness model
before it introduces any transaction authority.

## Acceptance criteria

- Pending manifest, wrong chain, missing RPC/code confirmation, and unavailable
  wallet fail closed with explicit public reason codes.
- Only a live manifest, chain ID 114, contract code present, RPC ready, and a
  connected public wallet produce `READY`.
- Trade and Liquidity pages show the current public block reason and retain no
  enabled transaction control under the pending manifest.
- Unit, component, and browser checks cover both forms; no broadcast capability
  is added.
