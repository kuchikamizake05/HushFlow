# HushFlow Implementation Plan

Status: ready for implementation review

Date: 2026-07-22

Source specification: docs/superpowers/specs/2026-07-22-hushflow-design.md

Primary target: Flare Coston2

Primary bounty: Confidential Compute Apps

Secondary bounty candidate: Interoperable Asset Products

## 1. Objective

Build and prove a real confidential FXRP-to-USDT0 RFQ on Coston2:

1. A seller locks a fixed FXRP amount and submits an encrypted minimum total proceed.
2. Up to 20 liquidity providers each lock the public quote cap in USDT0 and submit one encrypted quote.
3. Flare Confidential Compute decrypts and validates the inputs, then selects the highest qualifying quote with an earlier-submission tie-break.
4. A TEE-signed result is relayed to the HushFlow contract and verified on-chain.
5. The contract records one terminal outcome and exposes pull-based settlement or refund claims.
6. The UI, indexer, Proof Center, demo helpers, and automated tests expose the real protocol without becoming execution dependencies.

This plan does not reopen approved product decisions. Any implementation discovery that would change the privacy boundary, settlement rules, token pair, access model, or winning condition must be written as a decision record and approved before implementation proceeds.

## 2. Non-Negotiable Constraints

- The first product milestone is the real FCC vertical slice.
- A simulated local TEE may be used for development, but it is not sufficient evidence for milestone completion.
- The Coston2 flow must use real testnet transactions and configured FXRP and USDT0 contracts.
- Losing quote values must not be emitted, indexed, logged, traced, screenshotted, or returned by the FCC result.
- The contract is the source of truth. The indexer is a disposable read model.
- There is no administrator path that can withdraw user funds or replace FCC verification material after activation.
- All payouts are pull-based. Finalization must not transfer to every participant.
- No fake activity, fabricated volume, synthetic charts presented as protocol data, or simulated reviews presented as real users.
- No push, deployment, public tunnel, public test link, publishing, or other external mutation without explicit user approval.
- Code implementation follows RED, GREEN, REFACTOR. A production file is not edited before its relevant test has produced a valid RED signal.

## 3. Verified Implementation Baseline

The following facts were rechecked on 2026-07-22 and should be recorded again immediately before deployment:

- Coston2 chain ID is 114.
- The official public RPC is https://coston2-api.flare.network/ext/C/rpc.
- The official explorer is https://coston2-explorer.flare.network.
- The official faucet currently provides C2FLR, FXRP, and USDT0.
- The current official FXRP lookup guide resolves FTestXRP through the Asset Manager and currently shows 0x0b6A3645c240605887a5532109323A3E12273dc7.
- The FCC weather-insurance example verifies a TEE-signed ActionResult on-chain. The signed hash binds keccak256(resultData), actionId, submissionTag, and status using an EIP-191 prefix.
- The FCC extension stack currently includes the extension TEE, extension proxy, and Redis. Coston2 setup requires a public HTTPS route to the proxy and read-only C-chain indexer credentials.
- The official FCC workflow learns or configures the registered TEE signing address after extension registration.

Primary references:

- https://dev.flare.network/fcc/guides/weather-insurance-extension
- https://dev.flare.network/fcc/guides/sign-extension
- https://dev.flare.network/network/overview
- https://dev.flare.network/fxrp/token-interactions/fxrp-address
- https://faucet.flare.network/coston2

Reference repositories are pinned for comparison only:

| Reference | Commit |
| --- | --- |
| flare-foundation/fce-extension-scaffold | cc6de5f57490d920f296403e590e95601e315024 |
| flare-foundation/fce-weather-api | d759e3de258913c51480c8dae485e510da6c5c64 |
| flare-foundation/fce-sign | c5bbf11fbcfb786a6b24e335f6e786b1c7f3d8bd |

GitHub did not report a license for these three repositories at review time. They may guide compatibility research, but their source must not be copied, vendored, or adapted until license or written permission is documented in docs/provenance/fcc.md. If permission is unavailable, implement against public documentation, published interfaces, and properly licensed packages.

### 3.1 Toolchain Pins

These exact versions are the initial reproducibility baseline. Dependency changes require a short decision record plus a full verification rerun.

| Tool | Pin |
| --- | --- |
| Ubuntu under WSL2 | 24.04 |
| Node.js | 24.18.0 LTS |
| npm | 11.6.2 |
| pnpm | 11.15.1 |
| Turborepo | 2.10.5 |
| Go, required by current FCC deployment tooling | 1.26.5 |
| Foundry | 1.7.1 |
| Solidity compiler | 0.8.27 |
| Docker Desktop | 29.1.3 or the recorded compatible patch |
| PostgreSQL container | 18, pinned to an image digest during scaffolding |

The current machine has WSL2 Ubuntu 24.04 and Docker Desktop. Native Windows currently has Node 24.13.0 and pnpm 11.8.0, while Go and Foundry are missing. Milestone 0 must install or expose the pinned toolchain inside WSL2 and make WSL2 the canonical shell for FCC and Foundry commands.

### 3.2 JavaScript and Solidity Pins

| Package | Pin |
| --- | --- |
| next | 16.2.11 |
| react / react-dom | 19.2.8 |
| typescript | 6.0.3 |
| tailwindcss | 4.3.3 |
| wagmi | 3.7.3 |
| viem | 2.55.5 |
| @tanstack/react-query | 5.101.4 |
| zod | 4.4.3 |
| vitest / @vitest/coverage-v8 | 4.1.10 |
| @playwright/test | 1.61.1 |
| drizzle-orm | 0.45.2 |
| postgres | 3.4.9 |
| tsx | 4.23.1 |
| pino | 10.3.1 |
| prom-client | 15.1.3 |
| @openzeppelin/contracts | 5.6.1 |
| @flarenetwork/flare-periphery-contracts | 0.1.52 |
| @flarenetwork/flare-wagmi-periphery-package | 3.6.0 |
| solhint | 6.2.3 |
| prettier | 3.9.6 |
| eslint | 10.7.0 |

All direct dependencies use exact versions in package manifests. pnpm-lock.yaml is committed. Container images are pinned by digest after the first successful clean setup.

## 4. Target Repository Layout

    HushFlow/
    |-- apps/
    |   |-- web/
    |   |-- indexer/
    |-- services/
    |   |-- fcc-extension/
    |   |-- demo-lp/
    |-- contracts/
    |   |-- src/
    |   |-- script/
    |   |-- test/
    |-- packages/
    |   |-- protocol/
    |   |-- crypto/
    |   |-- ui/
    |-- tests/
    |   |-- e2e/
    |-- scripts/
    |   |-- setup/
    |   |-- coston2/
    |   |-- demo/
    |   |-- audit/
    |-- infra/
    |   |-- compose/
    |   |-- postgres/
    |-- docs/
    |   |-- architecture/
    |   |-- provenance/
    |   |-- runbooks/
    |   |-- security/
    |   |-- superpowers/
    |-- package.json
    |-- pnpm-workspace.yaml
    |-- pnpm-lock.yaml
    |-- turbo.json
    |-- .tool-versions
    |-- .env.example

## 5. AI-Agent Ownership

One path has one write owner at a time. Agents may review any path but must not edit another owner's files. Cross-boundary changes are proposed as an interface note and applied by the path owner. Only the integrator updates the root lockfile.

| Agent role | Exclusive write ownership | Required handoff |
| --- | --- | --- |
| Integration and release agent | Root configuration, pnpm-lock.yaml, infra/, docs/runbooks/, docs/provenance/, docs/architecture/decisions/ | Publishes toolchain, environment, CI, and deployment manifests |
| Contract agent | contracts/ | Publishes compiled ABI, bytecode hash, event manifest, storage/interface notes, and contract test evidence |
| FCC agent | services/fcc-extension/ | Publishes FCC request/result fixtures, public-key discovery procedure, ActionResult evidence, and container health contract |
| Protocol and crypto agent | packages/protocol/, packages/crypto/ | Publishes versioned schemas, canonical encoders, generated ABI package, encryption API, and cross-language fixtures |
| Indexer agent | apps/indexer/ | Publishes read API schema, migration state, replay evidence, and lag/health contract |
| Web and UI agent | apps/web/, packages/ui/ | Publishes route behavior, wallet action requirements, accessibility evidence, and responsive screenshots |
| Demo and validation agent | services/demo-lp/, tests/e2e/, scripts/coston2/, scripts/demo/, scripts/audit/ | Publishes controlled-wallet manifests, scenario evidence, demo runbook inputs, and privacy-log audit results |

Read-only review roles:

- Security reviewer: contract/FCC threat review and high-confidence findings.
- Protocol reviewer: checks schema and accounting consistency across boundaries.
- UX persona reviewers: perform the explicitly labeled simulated persona review.
- Release reviewer: independently reproduces clean setup and three consecutive demos.

### 5.1 Lockfile and Generated-Artifact Rule

- Feature agents modify their package.json only.
- The integration agent runs pnpm install and owns pnpm-lock.yaml.
- The contract agent does not write packages/protocol.
- The protocol agent consumes contract artifacts and generates packages/protocol/src/generated/.
- Generated artifacts include source commit, chain ID, contract address when applicable, ABI hash, and generator version.
- Generated files are never hand-edited.

## 6. Dependency Order

    M0 Toolchain and interface preflight
      -> M1 FCC vertical slice
        -> M2 Complete contract and protocol safety
          -> M3 Shared packages and interface freeze
            -> M4A Indexer and read API
            -> M4B Web and UI
              -> M5 Demo helpers, Proof Center, and multi-wallet automation
                -> M6 Security, reliability, validation, and release

M4A and M4B may run in parallel only after M3 publishes stable schemas, ABI, events, and fixtures. UI shell work may start earlier against an explicit mock adapter, but it cannot redefine protocol types or be counted as core progress.

## 7. Milestone 0: Reproducible Foundation and FCC Preflight

### Goal

Create a clean, reproducible workspace and remove external blockers before protocol implementation.

### Tasks

1. Create the pnpm/Turborepo workspace and exact-version root manifests.
2. Add .tool-versions, WSL2 setup instructions, environment validation, and non-secret .env.example files.
3. Install Go and Foundry in WSL2; verify Docker integration, jq, curl, git, Node, pnpm, Go, forge, and Docker.
4. Confirm access to:
   - Coston2 RPC;
   - Coston2 faucet;
   - FCC extension proxy images or packages;
   - FCC C-chain indexer read credentials;
   - a safe Coston2-only public tunnel mechanism.
5. Record the current TeeExtensionRegistry, TeeMachineRegistry, normal proxy, and FCC configuration source from the pinned official tooling.
6. Resolve FCC example provenance before copying any source.
7. Query the FXRP address through the Asset Manager, not only from documentation.
8. Identify the exact USDT0 contract dispensed by the official faucet. Verify code exists, symbol, decimals, total supply behavior, and successful transfer/transferFrom.
9. Add a token-address verification script that refuses to deploy if chain ID, bytecode, symbol, decimals, or expected balances do not match recorded deployment configuration.
10. Create a secrets inventory. Private keys, tunnel tokens, database credentials, and encryption secrets belong only in ignored environment files or an external secret store.

### Initial files

- package.json
- pnpm-workspace.yaml
- turbo.json
- .tool-versions
- .gitignore
- .env.example
- README.md
- scripts/setup/check-toolchain.sh
- scripts/setup/check-coston2.ts
- docs/provenance/fcc.md
- docs/provenance/frontend.md
- docs/runbooks/local-development.md
- docs/architecture/decisions/0001-toolchain-and-fcc-baseline.md

### Verification gate M0

- A fresh WSL2 shell reports every pinned tool version.
- pnpm install --frozen-lockfile succeeds after the lockfile is created.
- pnpm build, pnpm typecheck, pnpm lint, and pnpm test are defined, even if packages are initially empty.
- Docker can start and stop a minimal health-check container.
- Coston2 chain ID is read as 114 from RPC.
- FXRP and USDT0 addresses are recorded from runtime verification.
- FCC indexer credentials and public-tunnel availability are confirmed without committing secrets.
- A second clean shell can follow the setup document.

### Definition of done M0

No production protocol code exists yet, but every external dependency required for the FCC slice is accessible, pinned, documented, and reproducible. Missing FCC indexer access, unclear example licensing, missing Go/Foundry, or unidentified faucet USDT0 is a blocker for M1.

## 8. Milestone 1: FCC Vertical Slice

### Goal

Prove the smallest real HushFlow path on Coston2 before building the full product.

### Thin-slice scope

- One RFQ.
- One seller minimum.
- Two provider quotes.
- Encrypted payloads on-chain.
- Highest-valid-quote selection.
- Earlier-submission tie-break.
- Trade, no-valid-quote, and invalid-seller outcomes.
- TEE-signed ActionResult.
- On-chain result verification.
- Minimal FXRP/USDT0 settlement and refund.

### 8.1 Interface-first work

The protocol and crypto agent defines version 1 fixtures before contract or FCC business logic:

- Plaintext EnvelopeV1 fields:
  - schemaVersion;
  - chainId;
  - contractAddress;
  - rfqId;
  - sender;
  - payloadKind;
  - value in token base units;
  - unique 32-byte payloadNonce.
- FCC ResultDataV1 fields:
  - schemaVersion;
  - chainId;
  - contractAddress;
  - rfqId;
  - resultType;
  - winningProvider;
  - winningQuote;
  - resultExpiry;
  - unique 32-byte resultNonce.
- FCC framework wrapper fields:
  - exact resultData bytes;
  - actionId;
  - submissionTag;
  - status;
  - TEE signature.

Canonical fixtures must be consumable by TypeScript, FCC handler code, and Solidity tests. Values are integers; JSON floating-point numbers are forbidden for token amounts.

### 8.2 Contract thin slice

Planned contract surface:

- createRfq
- submitQuote
- requestResolution, payable only for the FCC instruction fee
- submitResult
- timeoutRfq
- claim
- view helpers for RFQ, provider participation, and claimable entitlement

The contract also acts as the FCC InstructionSender so the FCC action is created from canonical on-chain RFQ data. Resolution input construction may iterate only over the hard maximum of 20 providers.

The requestResolution transaction stores the returned actionId against the RFQ. submitResult must require that exact actionId and must consume both the actionId and result nonce.

### 8.3 FCC handler

The handler:

1. Accepts only the HushFlow operation type and versioned resolve command.
2. Decrypts the seller envelope and validates every binding.
3. Treats a malformed or misbound seller envelope as INVALID_RFQ.
4. Decrypts provider envelopes independently.
5. Ignores malformed, misbound, zero, over-cap, and otherwise invalid provider quotes.
6. Selects the highest quote greater than or equal to the seller minimum.
7. Preserves provider on-chain submission order for deterministic ties.
8. Produces only the winner and winning quote for a trade result.
9. Produces zero address and zero quote for NO_VALID_QUOTE and INVALID_RFQ.
10. Never logs plaintext inputs or losing quote values.
11. Returns exact ResultDataV1 bytes to the FCC framework for signing.

### 8.4 TEE signer initialization

The approved design requires non-replaceable FCC verification material. Current official FCC examples discover the TEE signing address after extension registration. Implementation must use this preference order:

1. Constructor-time immutable signer if the registered signer can be known and verified before contract activation.
2. Otherwise, a one-time initializeTeeSigner call that:
   - is callable only while the signer is zero;
   - prevents RFQ creation until initialization completes;
   - validates the signer against the registered FCC machine where the current registry exposes sufficient data;
   - emits an initialization event;
   - permanently rejects replacement.

The second option preserves the no-replacement security property but must be documented as a deployment sequencing interpretation. If registry validation is impossible, deployment evidence must prove that the configured signer equals the FCC proxy's registered TEE address before activation.

Use OpenZeppelin ECDSA verification rather than raw ecrecover. Reject malformed signatures and non-canonical values.

### 8.5 TDD order

1. Protocol fixtures and cross-language decoding tests go RED.
2. Contract tests for result binding and rejection cases go RED.
3. FCC selection and privacy-log tests go RED.
4. Minimal schema, verifier, and handler code make the same tests GREEN.
5. Coston2 integration tests go RED against the unregistered extension.
6. Deploy/register the extension only after explicit deployment approval.
7. Run the live test until the same scenarios are GREEN.

Local checkpoint commits:

- test: add RED fixtures for FCC result binding
- feat: encode HushFlow FCC envelopes and results
- test: add RED verifier rejection matrix
- feat: verify TEE-signed HushFlow result
- test: add RED confidential selection cases
- feat: resolve encrypted HushFlow quotes in FCC

No push is implied.

### Verification gate M1

- Clean setup starts the extension stack.
- Seller minimum and at least two quotes are encrypted using the live extension public key.
- The FCC handler decrypts and validates all payload bindings.
- Highest valid quote and tie-break cases pass.
- Losing quote values are absent from result bytes, stdout, structured logs, traces, and saved artifacts.
- A real Coston2 contract accepts a valid signed result.
- Modified resultData, signature, status, tag, actionId, result nonce, chain, contract, RFQ, winner, quote, and expiry are rejected.
- Replay and stale-result attempts are rejected.
- Trade and no-trade refund transactions complete.
- Resolution completes within three minutes in a healthy guided-demo run.
- A clean environment reproduces the slice from documentation.

### Definition of done M1

All 12 FCC feasibility acceptance criteria from the design specification pass with transaction hashes and sanitized logs. A mock response, locally forged signer, or simulated-only chain does not count.

## 9. Milestone 2: Complete Contract and Protocol Safety

### Goal

Expand the thin slice into the full approved RFQ lifecycle and prove custody/accounting invariants.

### Contract model

Statuses stored on-chain:

- OPEN
- SETTLED
- NO_VALID_QUOTE
- INVALID_RFQ
- CANCELLED
- TIMED_OUT

PROCESSING and REFUNDABLE remain derived conditions.

Required functions and behavior:

- Configure Coston2 FXRP, USDT0, FCC registries, and verification identity as immutable or one-time pre-activation values with no replacement path.
- Create RFQ with nonzero fixed FXRP amount, nonzero public quote cap, encrypted minimum, and a quote window from one minute to 24 hours.
- Transfer the seller's FXRP before recording a successful creation.
- Submit one immutable encrypted quote per provider while OPEN and before deadline.
- Lock exactly quoteCap USDT0 for every provider.
- Enforce 20 providers and ciphertext byte limits.
- Permit seller cancellation only while there are zero quotes.
- Set the absolute resolution deadline to 30 minutes after the quote deadline.
- Permit a bounded FCC resolution request after quote deadline and before resolution deadline.
- Accept one valid result before both signed expiry and absolute resolution deadline.
- Require a TRADE result to name a participating provider and a positive winning quote no greater than quoteCap.
- Require NO_VALID_QUOTE and INVALID_RFQ results to use the zero address and zero quote.
- Require malformed, zero, over-cap, or misbound seller minimums to produce INVALID_RFQ rather than a trade.
- Permit anyone to mark timeout after the absolute deadline.
- Create individual entitlements without mass payouts.
- Consume claim state before performing token transfer.
- Revert a failed claim transfer without consuming entitlement.
- Charge zero protocol fee.

### Accounting invariants

For every RFQ:

- Deposited FXRP equals the fixed seller lot until claimed.
- Deposited USDT0 equals providerCount multiplied by quoteCap until claims.
- A terminal outcome is recorded at most once.
- A provider submits at most one quote.
- A result actionId and result nonce are consumed at most once.
- SETTLED entitlements equal:
  - seller: winningQuote USDT0;
  - winner: fixed FXRP plus quoteCap minus winningQuote USDT0;
  - every loser: quoteCap USDT0.
- No-trade entitlements equal:
  - seller: fixed FXRP;
  - every provider: quoteCap USDT0.
- Total claimed plus total claimable never exceeds total deposited.
- Every valid deposit eventually becomes settled or refundable.
- No address with no role in an RFQ can claim its assets.

### Test suites

- Unit state-transition tests.
- Fuzzed amount, deadline, provider-count, and ciphertext-bound tests.
- Stateful invariant tests with multiple actors.
- Reentrancy token harness.
- False-return and revert-on-transfer token harnesses.
- Fee-on-transfer and rebasing rejection/assumption tests.
- Signature rejection matrix.
- Cancellation, timeout, malformed seller, malformed provider, no-valid-quote, tie, and all claim-order permutations.
- Gas snapshots for create, quote, resolution request at 2 and 20 providers, finalization, and claims.

### Verification gate M2

- Forge build, fmt check, lint, unit, fuzz, and invariant tests pass.
- Critical contract logic reaches at least 90 percent line and branch coverage.
- No critical or high security finding remains.
- Gas remains below documented Coston2 transaction limits at 20 providers and maximum ciphertext size.
- A fresh deployment has no activated admin withdrawal or signer-replacement path.

### Definition of done M2

The full approved state machine and every refund path are implemented, invariant-tested, and compatible with the M1 FCC result.

## 10. Milestone 3: Shared Packages and Interface Freeze

### Goal

Create one stable source of truth before indexer and frontend work proceed independently.

### packages/protocol

- ABI and typed contract access.
- Coston2 deployment manifest with chain ID, token addresses, HushFlow address, FCC identity, deployment block, transaction hash, code hash, and ABI hash.
- RFQ status and result type enums.
- Event schemas.
- ResultDataV1 schema and canonical encoding.
- Read API DTO schemas.
- Explorer URL builders.
- Compatibility fixtures.

### packages/crypto

- Fetch and validate FCC public-key metadata.
- Construct EnvelopeV1 with crypto-safe nonces.
- Encode then ECIES-encrypt seller minimum and provider quote.
- Enforce address, chain, RFQ, sender, kind, value, and nonce bindings.
- Keep plaintext in function-local memory only.
- Expose no persistence or analytics hook.
- Redact sensitive values from all typed errors.

### Interface contract tests

- TypeScript-generated result bytes decode identically in Solidity.
- FCC fixture output validates through the contract verifier.
- Event fixtures decode identically in indexer and web.
- Every schema rejects unknown incompatible versions.
- Amount formatting round-trips without floating-point conversion.
- The browser bundle contains no server secret or private key.

### Verification gate M3

- Schema and ABI compatibility tests pass across all consumers.
- A versioned fixture set is committed.
- No consumer owns a duplicate protocol enum, ABI, address, or crypto implementation.
- Interface freeze is tagged in a local checkpoint commit before M4 parallel work.

### Definition of done M3

Indexer, frontend, demo helper, and scripts can consume stable packages without importing each other's internals.

## 11. Milestone 4A: Event Indexer and Read API

### Goal

Provide searchable, restart-safe public views while preserving the contract as the execution authority.

### Data model

- chain_cursor
- rfqs
- rfq_providers
- fcc_actions
- rfq_outcomes
- claims
- transactions
- indexer_health

Never store plaintext seller minimum, plaintext quotes, decrypted inputs, encryption secrets, or wallet private keys.

### Ingestion behavior

- Start from configured deployment block.
- Process events in block/log-index order.
- Use chainId, transactionHash, and logIndex as the idempotency key.
- Persist cursor and derived rows in one database transaction.
- Re-read a finality window and reconcile removed or changed logs.
- Support complete replay into an empty database.
- Expose last processed block, chain head, lag, and last error.
- Treat ciphertext as public chain data but return it only from explicit proof endpoints.

### Read API

- List RFQs with filters and pagination.
- Get RFQ lifecycle and participants.
- Get public FCC proof metadata.
- Get wallet portfolio and claim history.
- Get protocol statistics derived only from events.
- Health and indexer-lag endpoints.

Every transaction-enabling web action must recheck current contract state through viem; API data alone never enables settlement or claims.

### Verification gate M4A

- Historical replay produces the same database twice.
- Duplicate event ingestion is idempotent.
- Restart resumes without gaps.
- Reorg-window simulation removes orphaned state.
- API schemas match packages/protocol.
- Privacy database audit finds no forbidden plaintext fields or values.

### Definition of done M4A

The market, portfolio, proof, and statistics read models are fast and reproducible, and deleting the database cannot affect user funds.

## 12. Milestone 4B: Web Application and Adapted Design System

### Goal

Build the approved product surfaces against stable interfaces with a coherent, license-compatible visual foundation.

### Reference selection gate

Before adapting a site:

1. Compare at least three mature references for workflow fit, responsive behavior, accessibility, implementation speed, and license.
2. Record source URL, version or commit, license text, retained files, and modifications in docs/provenance/frontend.md.
3. Reject references with missing, incompatible, ambiguous, or non-redistributable licenses.
4. Do not copy brand assets, copywriting, activity data, or unsuitable information architecture.

### Routes

- / — Landing.
- /trade — Create private RFQ wizard.
- /market — RFQ Market.
- /liquidity — Liquidity Desk.
- /portfolio — Wallet portfolio and claims.
- /proof — Proof Center.
- /rfq/[id] — State-aware RFQ detail.
- /demo — Guided demo controller.

### Required UX states

- Wallet disconnected, wrong network, unsupported wallet, insufficient C2FLR, insufficient token, and rejected signature.
- Allowance/approval, encryption, submission, confirmation, processing, settlement, refund, failure, and retry.
- OPEN, derived PROCESSING, SETTLED, NO_VALID_QUOTE, INVALID_RFQ, CANCELLED, TIMED_OUT, and wallet-specific REFUNDABLE.
- Indexer lag, RPC failure, FCC delay, expired result, failed submission, and safe timeout path.
- Public, encrypted, and revealed information labels.

### Private input handling

- Plaintext seller minimum and quote live only in controlled form state until encryption.
- Values are never placed in URL, localStorage, sessionStorage, cookies, analytics, error trackers, console output, server actions, or indexer requests.
- After a provider submits, the UI shows submission state and public outcome, not a recovered plaintext quote.
- Error messages use coarse codes and do not include payload values.

### Frontend tests

- Component and route tests for all lifecycle and wallet states.
- Crypto-flow integration test using deterministic fixtures.
- Contract-state recheck before every write action.
- Keyboard navigation, focus order, labels, contrast, reduced motion, and screen-reader status updates.
- Responsive coverage for critical desktop and mobile viewports.
- Playwright journeys for seller, provider, proof, portfolio, claims, and guided demo.

### Verification gate M4B

- Build, typecheck, lint, unit, component, and Playwright suites pass.
- No critical accessibility issue remains on critical routes.
- Browser storage, network requests, console logs, and screenshots contain no private plaintext.
- All activity and statistics come from adapters backed by real protocol data or are clearly marked local fixture data in development.

### Definition of done M4B

Every approved route is usable and state-aware, while the core flow remains understandable within the three-to-four-minute judge journey.

## 13. Milestone 5: Demo Helpers, Proof Center, and Multi-Wallet Automation

### Goal

Make the real protocol easy to demonstrate repeatedly without misrepresenting controlled activity.

### Demo LP service

- Coston2-only hard fail on any other chain.
- Uses environment-managed provider keys.
- Supports explicit start/stop and a strict RFQ allowlist.
- Checks balances, allowances, deadlines, cap, and expected contract before signing.
- Submits real encrypted quotes and real collateral transactions.
- Logs only wallet address, RFQ ID, transaction hash, public state, latency, and coarse error codes.
- Labels every controlled wallet and helper transaction in demo documentation.

### Multi-wallet scenario runner

Separate controlled roles:

- seller;
- provider A;
- provider B;
- optional provider C;
- result requester/submitter;
- unrelated attacker wallet.

Required live scenarios:

- highest valid quote settles;
- equal quotes select earlier submission;
- all quotes below minimum;
- malformed provider quote;
- invalid seller payload;
- cancel before first quote;
- cancel rejected after quote;
- timeout and all refunds;
- invalid/modified/replayed/expired/wrong-domain result rejection;
- failed individual transfer without cross-participant blockage.

### Proof Center evidence

- RFQ lifecycle with Coston2 transaction links.
- Ciphertext references without plaintext.
- FCC ActionResult status, actionId, submission tag, signature, and signer verification.
- ResultData chain, contract, RFQ, type, winner, quote, expiry, and nonce bindings.
- Contract finalization and claim events.
- Plain-language privacy boundary.
- Explicit notice that losing quotes remain unpublished.

### Guided demo

1. Explain the execution problem.
2. Create or open a near-deadline RFQ.
3. Submit two controlled real quotes.
4. Show ciphertext and participation without revealing quote values.
5. Request FCC resolution.
6. Inspect the signed proof.
7. Submit the result.
8. Show winner, execution price, token movements, and individual claim states.
9. Keep one independently verifiable completed fallback RFQ.

### Verification gate M5

- Every controlled-wallet scenario records transaction hashes.
- Helper logs pass the privacy audit.
- A judge wallet can participate without helper privileges.
- The guided path completes within four minutes when infrastructure is healthy.
- The fallback RFQ is viewable even if FCC or RPC becomes slow.

### Definition of done M5

The demo reduces waiting and counterparty friction while preserving the real contract and FCC flow and clearly labeling all controlled activity.

## 14. Milestone 6: Security, Reliability, Validation, and Release

### Goal

Demonstrate that the complete system is secure enough for the stated testnet scope, operationally repeatable, honestly validated, and ready for hackathon submission.

### Security review scope

- Contract state transitions, accounting, replay protection, time windows, reentrancy, token behavior, and denial of service.
- FCC payload binding, decryption failures, deterministic selection, result signing, signer initialization, and log leakage.
- Browser private-data lifecycle and wallet transaction integrity.
- Indexer injection, pagination, replay, reorg, and privacy boundaries.
- Demo-service key isolation, allowlists, rate limits, and chain hard fails.
- CI, dependency, container, secret, and provenance risks.

Only high-confidence exploitable findings are reported as vulnerabilities. Unconfirmed issues remain explicit verification items. Critical and high findings block release.

### Automated verification

- pnpm install --frozen-lockfile
- pnpm format:check
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm test:coverage
- pnpm build
- forge fmt --check
- forge build
- forge test
- forge coverage
- forge snapshot --check
- Playwright critical journeys
- dependency audit
- secret scan
- privacy-log/database/browser audit
- container health and vulnerability scan

Coverage gates:

- Critical Solidity logic: at least 90 percent line and branch coverage.
- Other packages: at least 80 percent line and branch coverage, with no critical path exempted merely to meet the number.
- No skipped or focused test in CI.

### Operational drills

- RPC unavailable.
- RPC switches to fallback.
- FCC result delayed.
- Extension proxy unavailable.
- Public tunnel restarted.
- FCC registration challenge expired.
- Indexer lagging or rebuilding.
- Result submission fails then succeeds from another wallet.
- Result expires.
- LP helper lacks gas or collateral.
- Claim token transfer reverts.
- RFQ reaches timeout.

### Honest validation

Run independent simulated persona reviews for:

- XRPFi treasury seller;
- liquidity provider;
- Flare developer;
- first-time judge;
- security-conscious reviewer.

Give each reviewer the same artifact set and task list. Record errors, misconceptions, blocked actions, and requested evidence. Label the output simulated persona review. Optional external feedback is recorded separately and only with evidence and permission.

### Verification and release gate M6

- Clean setup reproduces the FCC vertical slice.
- Full unit, integration, invariant, E2E, and Coston2 suites pass.
- Three consecutive guided demos succeed under normal conditions.
- At least one fallback completed RFQ is independently verifiable.
- No critical/high security finding remains.
- No forbidden plaintext or secret appears in logs, database, browser storage, screenshots, traces, build output, or committed files.
- All deposited assets in every tested terminal state are settled or claimable.
- Contract addresses, code hashes, deployment transactions, FCC identity, extension commit, token verification, and test evidence are recorded.
- Submission claims distinguish controlled testnet activity, simulated persona review, optional external testing, and organic evidence.
- Dual-bounty eligibility and final deadline/timezone are reconfirmed with organizers.

### Definition of done M6

HushFlow is ready for hackathon submission only when the technical release gate and honest-evidence gate both pass.

## 15. Verification Evidence Format

Each milestone stores a sanitized report under docs/verification/ containing:

- timestamp and Git commit;
- toolchain versions;
- environment type: local, simulated TEE, or real Coston2 FCC;
- exact commands;
- tests passed/failed and coverage;
- contract addresses and transaction hashes when applicable;
- latency observations;
- privacy audit outcome;
- open risks and owner;
- reviewer sign-off.

Private keys, RPC credentials, indexer credentials, tunnel tokens, plaintext private inputs, and decrypted FCC values are never embedded in evidence.

## 16. Risk Register and Decision Gates

| Risk | Earliest gate | Response |
| --- | --- | --- |
| FCC indexer credentials unavailable | M0 | Escalate to Flare organizers immediately; do not disguise a mock as a live milestone |
| FCC reference source lacks license | M0 | Obtain permission or reimplement from public docs/interfaces without copying |
| Registered TEE signer cannot be immutable at constructor time | M1 | Use one-time pre-activation initialization with registry/evidence validation and no replacement |
| FCC action payload is too large or expensive at 20 providers | M1/M2 | Measure 2, 10, and 20 providers; reduce envelope overhead or use an FCC-supported on-chain read pattern without weakening bindings |
| Resolution exceeds three minutes | M1 | Profile instruction, proxy, attestation, and result retrieval stages; keep a fallback completed RFQ |
| Faucet USDT0 identity or behavior changes | M0 and deploy | Runtime-verify token and refuse deployment on mismatch |
| FXRP address changes | Every deploy | Resolve through Asset Manager and record the resulting address |
| Permanent ciphertext confidentiality degrades over time | Accepted MVP risk | State clearly in Proof Center and roadmap; never claim everlasting secrecy |
| Tunnel exposes proxy publicly | M0/M1 | Coston2 only, minimal exposure window, rate limiting where supported, stop immediately after test |
| Indexer reorg creates stale UI | M4A | Reconciliation window plus direct contract recheck before writes |
| Provider count causes finalization DoS | M2 | No payout loop; bounded resolution request only; gas snapshot at maximum |
| UI or telemetry leaks plaintext | M3/M4/M6 | Central crypto package, redacted errors, disabled sensitive analytics, automated storage/network/log audit |
| Frontend reference has incompatible license | M4B | Reject it and select another mature reference |
| Controlled demo activity is mistaken for traction | M5/M6 | Persistent labels in docs, UI demo mode, and submission language |

## 17. Local Commit Sequence

Commits remain local unless the user explicitly approves pushing. Suggested sequence:

1. chore: scaffold reproducible HushFlow monorepo
2. docs: record FCC and token preflight evidence
3. test: add RED protocol and FCC fixtures
4. feat: prove FCC vertical slice on Coston2
5. test: add RED RFQ accounting and invariant suite
6. feat: complete HushFlow RFQ lifecycle
7. feat: publish protocol and crypto packages
8. feat: add event indexer and read API
9. feat: build HushFlow trading interface
10. test: automate multi-wallet Coston2 scenarios
11. feat: add Proof Center and guided demo
12. fix: close security and reliability findings
13. docs: record release evidence and submission materials

Within each implementation unit, preserve the finer RED and GREEN checkpoint commits required by the TDD workflow. Do not squash them until the unit is fully verified.

## 18. Project-Level Definition of Done

HushFlow is complete for the hackathon MVP when:

- A real seller locks FXRP on Coston2.
- At least two real provider wallets lock USDT0 and submit encrypted quotes.
- The seller minimum and quotes are unreadable to competing participants before resolution.
- The custom FCC extension selects the correct result.
- The TEE-signed result is verified on-chain with full domain, RFQ, time, and replay bindings.
- Only the winner and winning quote become public.
- FXRP and USDT0 entitlements are correct and individually claimable.
- Cancellation, no-valid-quote, invalid-RFQ, timeout, and failed-claim recovery work.
- The contract invariants, security gates, privacy audit, clean setup, and three consecutive demo runs pass.
- Landing, Trade, RFQ Market, Liquidity Desk, Portfolio, Proof Center, RFQ Detail, and guided demo are backed by real protocol state or clearly labeled development fixtures.
- The indexer can be rebuilt from events and cannot authorize execution.
- All external code and design sources have documented provenance and compatible licenses.
- Submission evidence is accurate, attributable, and honest.

## 19. First Execution Batch After Plan Approval

Implementation starts with Milestone 0 only:

1. Create the root monorepo configuration.
2. Create WSL2 toolchain checks and environment documentation.
3. Verify FCC access, provenance, and current Coston2 token identities.
4. Freeze EnvelopeV1 and ResultDataV1 fixtures.
5. Write the first RED cross-language and verifier tests.

No frontend page, indexer schema, LP helper, or full contract feature should precede a passing M0 gate and the first valid RED tests for M1.
