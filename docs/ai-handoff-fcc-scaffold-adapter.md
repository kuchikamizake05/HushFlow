# HushFlow: AI Contribution Handoff — FCC Scaffold Adapter

**Date:** 2026-08-14  
**Scope:** Finish the local-simulated FCC/Coston2 integration path for the
HushFlow hackathon demo.  
**Do not deploy, broadcast, register an extension, request faucet funds, or
change any third-party credentials without the owner's explicit, separate
approval.**

## One-paragraph brief

HushFlow is a confidential RFQ execution layer for XRPFi: a seller creates an
FXRP-for-USDT0 RFQ, providers send encrypted quotes, FCC resolves the highest
valid quote privately, and a Solidity verifier accepts the signed resolution
before settlement. The existing contracts, crypto, TypeScript resolver, web
readiness UI, and local test suite are already implemented. The remaining task
is to replace the previous hand-assembled FCC live kit with an adapter built on
the **current official Flare FCE extension scaffold**, using the scaffold's
TypeScript path and HushFlow's existing resolver. The demo must use
`SIMULATED_TEE=true` against Coston2 and make no hardware-attestation claim.

## Current state

- Repository: `C:\Users\ASUS\Documents\coding\HushFlow`
- Branch: `main`
- Last pushed integration baseline: `95f8e34`
- Local design checkpoint: `63f2081 docs: define FCC scaffold adapter`
- Working tree was clean immediately after the design checkpoint.
- Do not alter user-owned `.claude/` files or unrelated changes if they appear.
- The owner has configured Coston2 in a Rabby **testnet** wallet. Never ask for
  or paste its seed phrase/private key.
- The owner reports `hushflow.dev` is active on Cloudflare and a named tunnel
  `hushflow-fcc` is connected. The intended public hostname is
  `fcc.hushflow.dev`, routing to `http://localhost:6664`.
- A tunnel token was accidentally pasted in a prior conversation and the owner
  reports it was refreshed and reinstalled. Treat the prior token as revoked;
  never request, log, commit, or paste a token.
- Hackathon indexer credentials are available only in the official pinned
  message. Put current values only in ignored local config; do not repeat them
  in issues, docs, tests, commits, shell output, or chat.

## FCC facts confirmed from official guidance and organizer messages

1. Coston2 FCC was redeployed. The live `FlareTeeManager` is
   `0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE`.
2. Pull the latest `main` of
   [`flare-foundation/fce-extension-scaffold`](https://github.com/flare-foundation/fce-extension-scaffold)
   and use its **own pinned dependency versions together**. Do not independently
   pin/update `tee-node`, `tee-proxy`, or `go-flare-common`.
3. `SIMULATED_TEE=true` is accepted for the hackathon Coston2 demonstration.
   GCP Confidential Space is not required.
4. Use a stable public HTTPS hostname. A temporary quick-tunnel URL is invalid
   because the registered URL remains on-chain after a restart.
5. A restart creates a new `teeId`; recovery is new identity → re-register →
   reach `PRODUCTION` → pause the old identity. Keep one active TEE per
   endpoint.
6. Before HushFlow instructions are sent, the selected machine must be status
   `2` (`PRODUCTION`), have a fresh availability check (currently < 6 hours),
   have a registered `teeId`, and serve the current public hostname.
7. Providers post cosigned instructions directly to `/instruction` on the
   extension-proxy path (known-good setup maps the tunnel origin to local port
   `6664`). The indexer is still part of the stack/readiness path but is not an
   instruction-discovery substitute.
8. `404` from the normal FTDC proxy is not automatically a failure; a fresh
   availability action can be pending. Collect on-chain dispatch, extension ID,
   `teeId`, URL, status, proxy `/info`, and action-status result before asking
   organizers to trace provider logs.

Official references:

- [FCC overview](https://dev.flare.network/fcc/overview)
- [Build Your First Extension](https://dev.flare.network/fcc/guides/getting-started)
- [Official FCE scaffold](https://github.com/flare-foundation/fce-extension-scaffold)
- [Coston2 Systems Explorer](https://coston2-systems-explorer.flare.network/tee/objects?tab=machines)

## Existing HushFlow ownership boundaries

| Area | Primary paths | Role |
| --- | --- | --- |
| Contracts | `contracts/src/HushFlowRfq.sol`, `contracts/src/HushFlowResultVerifier.sol` | RFQ lifecycle, instruction emission, signer/result verification, settlement rules. |
| Contract interfaces | `contracts/src/interfaces/ITeeExtensionRegistry.sol`, `contracts/src/interfaces/ITeeMachineRegistry.sol` | Current FCC registry surface used by contracts/tests. |
| Existing resolver | `services/fcc-extension/src/resolve-rfq.ts`, `services/fcc-extension/src/handle-action.ts`, `services/fcc-extension/src/main.ts` | TypeScript HushFlow resolution, action handling, and HTTP runtime. Reuse; do not reimplement in Go. |
| Protocol shapes | `packages/protocol/src/fcc.ts`, `packages/protocol/src/events.ts` | Canonical FCC/RFQ encoding and public event data. |
| Crypto | `packages/crypto/src/` | Envelopes, ECIES compatibility, metadata validation. |
| Existing local kit | `infra/fcc/`, `scripts/setup/check-fcc-*.sh` | Legacy preparation template. It must not be treated as the Coston2 source of truth after redeploy. |
| Readiness UI | `apps/web/app/demo/readiness/page.tsx`, `scripts/coston2/demo-readiness.ts` | Public, read-only preflight status. No wallet/signing controls. |

## Approved technical direction

The design is committed in
[`docs/superpowers/specs/2026-08-14-hushflow-fcc-scaffold-adapter-design.md`](superpowers/specs/2026-08-14-hushflow-fcc-scaffold-adapter-design.md).

Implement a narrow TypeScript adapter:

```text
Coston2 instruction
  → official scaffold TypeScript wire/router
  → HUSHFLOW / RESOLVE_RFQ adapter
  → existing HushFlow resolver
  → scaffold ActionResult
  → existing HushFlow on-chain verifier (later, only with approval)
```

- Use `HUSHFLOW` as the OP type and `RESOLVE_RFQ` as the OP command.
- Never use an OP type starting with `F_`; that prefix is reserved by Flare.
- Keep HushFlow selection, settlement, result format, and verifier semantics
  where they already live.
- The adapter only validates the action payload, calls the resolver, and maps
  success/failure to the scaffold's `ActionResult` contract.
- Vendor or otherwise pin an inspectable scaffold revision. Record its commit
  in repository documentation; do not silently track moving `main` in a
  reproducible build.

## Required implementation sequence

Follow this order. It is deliberate because the deadline is short.

1. Inspect the latest official scaffold, its TypeScript implementation,
   dependency pins, Coston2 compose configuration, and testing/conformance
   commands. Do not copy old `tee-node` pins into it.
2. Decide the smallest isolated location for the vendored scaffold (for
   example `services/fcc-scaffold/` or `vendor/fce-extension-scaffold/`) and
   document the exact upstream commit/license/provenance.
3. Add tests first for:
   - valid `HUSHFLOW / RESOLVE_RFQ` request maps to the canonical HushFlow
     resolution result;
   - malformed/oversized/unsupported request returns an error action result;
   - a resolver exception returns a failed action result;
   - reserved `F_` OP types are rejected or never registered.
4. Run the new test target and confirm it fails for the intended missing adapter
   behaviour. Commit that RED checkpoint.
5. Implement only the adapter/config/contract glue necessary to pass the tests.
   Run the same test target; commit the GREEN checkpoint.
6. Run the official TypeScript scaffold unit and conformance tests, then the
   relevant HushFlow tests and `forge test`.
7. Render Compose/config only. Do not build, run Docker, start the tunnel,
   run `pre-build`, run `post-build`, or invoke `--broadcast` without owner
   approval.
8. Update the README/runbook/readiness wording: current FCC scaffold path is
   the planned demo runtime; existing live claims remain absent until evidence
   exists.

## Safe verification commands

Run only after inspecting the scaffold's current README and package scripts:

```text
# HushFlow baseline
pnpm test
forge test

# Existing safe configuration checks
pnpm preflight:coston2
pnpm preflight:fcc
docker compose -f infra/fcc/docker-compose.template.yml config --quiet
```

Treat `docker compose build`, any public tunnel start/route mutation,
scaffold `pre-build`, `post-build`, `full-setup`, `test.sh`, faucet request,
and every chain transaction as external/operator actions requiring explicit
approval at the time of execution.

## External approval gate

Before a live Coston2 run, request an explicit approval that names:

- Coston2, chain ID `114`;
- deployer public address;
- FXRP and USDT0 test token addresses;
- current TeeExtensionRegistry and TeeMachineRegistry addresses from the
  current scaffold/configuration;
- `fcc.hushflow.dev` as the registered endpoint;
- permission to deploy/register/send testnet transactions.

Do not guess stale registry addresses or silently add `--broadcast`.

## Prompt for the next AI

> You are continuing HushFlow's FCC scaffold adapter task. Read
> `docs/ai-handoff-fcc-scaffold-adapter.md` and the linked design spec first.
> Work in the existing repository without overwriting unrelated changes. Build
> the smallest TypeScript adapter on the current official FCE scaffold so
> `HUSHFLOW / RESOLVE_RFQ` delegates to the existing HushFlow resolver. Follow
> TDD with a real RED checkpoint before production changes and a GREEN
> checkpoint afterward. Do not use or expose any secrets. Do not deploy,
> register, run a public tunnel, faucet, or broadcast any Coston2 transaction
> without separate explicit owner approval. Report exact test evidence and
> remaining blockers.
