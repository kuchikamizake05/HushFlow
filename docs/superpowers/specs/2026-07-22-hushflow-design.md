# HushFlow Product and Technical Design

Status: approved design specification

Approved: 2026-07-22

Primary deployment target: Flare Coston2

## 1. Project Context

HushFlow is being designed for the Flare Summer Signal hackathon, with the Confidential Compute Apps bounty as the primary track. It may also qualify for the Interoperable Asset Products bounty because FXRP is the core traded asset.

The project is optimized for hackathon impact, a reliable end-to-end Coston2 demo, meaningful Flare integration, and credible continuation after the hackathon. The builder will use multiple AI agents, so being a solo entrant is not treated as a reason to make the product interface artificially small. Scope is constrained by integration coherence, security, and demonstrable reliability rather than raw implementation capacity.

## 2. Product Direction

HushFlow is a confidential trading execution layer for XRPFi.

The hackathon MVP is a private Request for Quote (RFQ) for a fixed FXRP trade:

1. A seller requests price quotes for a fixed amount of FXRP.
2. Liquidity providers submit encrypted USDT0 quotes.
3. Flare Confidential Compute (FCC) privately evaluates the quotes.
4. The best valid quote is returned as a signed result.
5. The HushFlow contract verifies the result and settles FXRP for USDT0.

The auction is an internal quote-selection mechanism, not the product category or primary user-facing language.

### Working pitch

> HushFlow provides private best-available execution for FXRP. A seller opens an RFQ, liquidity providers submit encrypted quotes, FCC selects the best valid quote, and the contract settles the trade atomically without publishing the losing quotes.

### Primary user

- XRPFi treasury managers
- Professional or large FXRP traders
- Liquidity providers and market makers
- Protocols performing liquidity rebalancing

The initial persona is a seller executing a fixed-size FXRP block trade for USDT0.

## 3. Winning Thesis

HushFlow should demonstrate a complete private execution flow rather than a privacy mockup:

1. FXRP is actually locked in a contract on Coston2.
2. Multiple quotes are actually encrypted.
3. The seller and competing providers cannot read quote values before selection.
4. A custom FCC extension actually evaluates the quotes.
5. The result is actually signed and verified on-chain.
6. FXRP and USDT0 are actually settled.
7. Unused collateral is actually refundable.

The intended differentiation is the combination of private price discovery, verifiable FCC execution, and real FXRP settlement.

## 4. MVP Scope

### Included

- One direction: sell FXRP for USDT0
- Fixed FXRP amount per RFQ
- One seller
- Up to 20 liquidity providers
- One encrypted quote per provider
- Encrypted seller minimum total proceeds
- Equal USDT0 collateral for every provider
- Highest valid quote wins
- Winner pays its own quoted amount
- FCC-signed result
- Atomic on-chain allocation of settlement entitlements
- Individual refund claims
- Cancellation before the first quote
- Timeout recovery
- Coston2 deployment
- Zero protocol fee for the MVP

### Excluded

- Reusable maker vaults
- Quote replacement or withdrawal
- Partial fills
- Multiple winners
- Multiple token pairs
- DEX routing
- Conditional or trigger orders
- Always-on keeper
- AI
- Mainnet deployment
- Production-grade secure off-chain secret delivery
- Reputation, governance, or a project token

## 5. Terminology

HushFlow uses hybrid terminology: professional trading language remains, while unnecessary infrastructure jargon is hidden from the main UI.

| Technical/domain term | User-facing treatment |
| --- | --- |
| RFQ | Private RFQ, defined once as a request for competing price quotes |
| Taker | Seller for the one-direction MVP |
| Market maker | Liquidity provider |
| Quote | Quote or private price offer |
| Collateral | Collateral, explained as a refundable deposit |
| Resolve | Finalize RFQ |
| Resolver | Not shown in the main UI |
| TEE attestation | Verified by Flare Confidential Compute |
| Settlement | Settlement or complete trade |

The pitch should explain the benefit in plain language before introducing technical terminology.

## 6. Participants

| Participant | Responsibility |
| --- | --- |
| Seller | Locks the fixed FXRP amount and submits encrypted minimum total proceeds |
| Liquidity provider | Locks the required USDT0 collateral and submits one encrypted quote |
| HushFlow FCC extension | Decrypts inputs, validates quotes, selects the result, and signs it |
| HushFlow RFQ contract | Holds assets, verifies the FCC result, records the terminal outcome, and supports pull-based settlement claims |
| Result submitter | Fetches the signed FCC result and submits it to the contract; this can be anyone |

## 7. Access Model

The MVP uses an open, permissionless RFQ:

- Any wallet may submit a quote.
- A provider must lock the required collateral.
- One wallet may submit only one quote per RFQ.
- A maximum of 20 providers may participate in one RFQ.
- No administrator or allowlist is required.
- Approved liquidity-provider pools may be added after the hackathon.

Anyone may submit the signed FCC result to the contract. The submitter cannot alter the result because the contract verifies the FCC signature and result fields.

## 8. Quote and Collateral Rules

The seller publishes a maximum possible total payment (the quote cap). Every provider locks the same quote-cap amount of USDT0, while the actual quote remains encrypted. For the fixed FXRP lot, the seller minimum and every provider quote represent total USDT0 proceeds, not a per-FXRP unit price.

Example:

- Fixed lot: 100 FXRP
- Quote cap: 120 USDT0
- Private seller minimum total proceeds: 94 USDT0
- Provider A actual quote: 92 USDT0
- Provider B actual quote: 97 USDT0
- Provider C actual quote: 95 USDT0
- Each provider locks: 120 USDT0

Provider B wins and pays 97 USDT0. It receives 23 USDT0 back. Providers A and C can each reclaim their full 120 USDT0.

### Approved selection rules

- The highest valid quote wins.
- The winner pays its own quoted amount (pay-as-quoted).
- A quote must be greater than or equal to the seller's encrypted minimum total proceeds.
- A quote must not exceed the public quote cap.
- The seller minimum and every quote must be greater than zero and use USDT0 base units.
- A provider may submit only one immutable quote.
- If two quotes have the same value, the earlier submitted quote wins.
- If no quote meets the minimum total proceeds, no trade occurs.

## 9. Privacy Boundary

### Public

- Seller address
- Fixed FXRP amount
- Quote cap and required collateral
- Quote deadline
- Provider addresses and participation
- Ciphertext stored in transactions
- Winning provider after finalization
- Winning price and final token transfers

### Private

- Seller minimum total proceeds before finalization
- Actual provider quote values before finalization
- All losing quote values after finalization

The product does not claim fully private trading. It protects price discovery and trading intent before execution and does not publish losing quotes.

## 10. Private Data Storage

The MVP stores encrypted payloads on-chain as ciphertext. The plaintext is only processed inside the FCC extension.

This choice prioritizes auditability, reliability, and hackathon feasibility. It avoids adding a secure database and private upload service.

Production roadmap: deliver encrypted payloads through a secure off-chain channel and store only a commitment or hash on-chain. Permanent on-chain ciphertext has long-term confidentiality risk if its encryption is broken in the future.

### 10.1 Encrypted Payload Binding

- The browser uses the encrypted-envelope and public-key workflow supported by the current Flare FCC tooling, with the exact dependency and key version pinned during the feasibility spike.
- Every encrypted payload includes a schema version, chain ID, HushFlow contract address, RFQ ID, sender address, payload kind, value, and unique payload nonce.
- Contract call arguments bind the ciphertext to `msg.sender`, the RFQ, and whether it is a seller minimum or provider quote.
- FCC rejects decrypted envelopes whose embedded bindings do not match the on-chain record.
- The application never persists plaintext minimums or quotes in server storage, telemetry, or browser analytics.

## 11. System Architecture

The protocol uses one application contract and a set of isolated supporting components:

- HushFlow web application
- HushFlow RFQ contract
- Custom HushFlow FCC extension
- Lightweight event indexer and read API
- Shared protocol and cryptographic packages
- Coston2-only demo liquidity-provider helper
- Result-submission action available through the web app, an operational script, or any independent submitter

### Data flow

1. The seller creates an RFQ, locks FXRP, and submits the encrypted minimum total proceeds.
2. Providers lock equal USDT0 collateral and submit encrypted quotes.
3. The quote window closes.
4. FCC processes the RFQ inputs.
5. The extension decrypts and validates all values.
6. The extension selects the highest qualifying quote.
7. FCC returns a signed result.
8. Anyone submits the result to the RFQ contract.
9. The contract verifies the FCC result and atomically records the terminal outcome and settlement entitlements.
10. Participants individually claim the assets owed to them.
11. The indexer derives searchable and historical views from emitted contract events without becoming an execution dependency.

## 12. RFQ Lifecycle

The stored on-chain status is one of:

- `OPEN`
- `SETTLED`
- `NO_VALID_QUOTE`
- `INVALID_RFQ`
- `CANCELLED`
- `TIMED_OUT`

`PROCESSING` is a derived product phase: the quote deadline has passed, the resolution deadline has not passed, and the stored status remains `OPEN`. It does not require a trusted state-transition transaction. `REFUNDABLE` is a derived wallet condition indicating that the connected participant has an unclaimed entitlement.

Successful path:

```text
OPEN -> PROCESSING (derived) -> SETTLED
```

No qualifying quote or invalid seller payload:

```text
OPEN -> PROCESSING (derived) -> NO_VALID_QUOTE or INVALID_RFQ
```

Cancellation and infrastructure failure paths:

```text
OPEN with zero quotes -> CANCELLED
OPEN -> PROCESSING (derived) -> TIMED_OUT
```

After the absolute resolution deadline, anyone may call the timeout function. Every terminal no-trade status creates pull-based refund entitlements.

## 13. FCC-Signed Result

The signed result must bind at least:

- Chain ID
- HushFlow contract address
- RFQ ID
- Winning provider
- Winning quote
- Result type: trade, no valid quote, or invalid RFQ
- Result expiry
- Unique result nonce

These fields prevent cross-chain, cross-contract, cross-RFQ, stale-result, and replay attacks.

Trade results contain a participating provider and a positive winning quote. No-valid-quote and invalid-RFQ results use the zero address and zero quote. A result may be submitted only after the quote deadline and before both its signed expiry and the RFQ's absolute resolution deadline. Each result nonce can be consumed only once.

The MVP deployment pins the FCC-supported verifier configuration, authorized extension identity, or equivalent verification material as immutable deployment configuration. There is no administrator function that can replace it after deployment. The feasibility spike must confirm the exact verifier interface supported by the current FCC environment.

## 14. Cancellation, Failure, and Refund Rules

| Situation | Required behavior |
| --- | --- |
| Seller cancels before any quote | Allowed; seller reclaims FXRP |
| Seller cancels after a quote | Not allowed |
| Provider submits a second quote | Rejected |
| Provider changes or withdraws a quote | Not allowed |
| Ciphertext is malformed or cannot be decrypted | Quote is ignored; collateral remains refundable |
| Seller minimum is malformed, bound incorrectly, or outside valid bounds | Signed invalid-RFQ outcome; all assets become refundable |
| Quote exceeds the cap | Quote is invalid |
| All quotes are below the minimum total proceeds | No trade; assets become refundable |
| FCC does not return a result | Timeout makes all assets refundable |
| FCC result is expired | Rejected |
| FCC result is replayed | Rejected |
| FCC result targets another RFQ/contract/chain | Rejected |
| FCC signature is invalid | Rejected |
| Token transfer fails during a claim | That claim transaction reverts without consuming the entitlement or affecting another participant |

## 15. Refund Model

All payouts use individual claims instead of mass token transfers:

1. Finalization atomically stores the terminal result, winner, winning quote, and global accounting needed to derive entitlements.
2. Seller and providers call their respective claim functions.
3. The seller claims the winning USDT0 amount after a trade, or reclaims FXRP after a no-trade terminal state.
4. The winner claims the fixed FXRP lot plus unused USDT0 collateral equal to the quote cap minus the winning quote.
5. Each losing provider reclaims its full quote-cap collateral.
6. Per-wallet claim flags prevent double claims.
7. One failed transfer cannot block another participant.
8. Finalization does not require a mass payout loop; entitlement calculation is performed for the individual claimant.

The UI should display the available refund and a clear Claim Refund action.

## 16. Contract Safety Requirements

- Safe ERC-20 transfer handling
- Reentrancy protection
- Checks-effects-interactions ordering
- Explicit state transitions
- Per-RFQ and per-provider accounting
- Replay protection
- Result expiry validation
- Timeout escape hatch
- No administrator function that can withdraw user funds
- No unbounded loop over an arbitrary number of providers
- Maximum 20 providers per RFQ
- Immutable supported-token and FCC-verifier configuration for the MVP deployment
- Per-role claim flags and double-claim protection
- Explicit upper bounds for ciphertext size and provider count
- Amounts are stored and compared in token base units; UI decimal formatting cannot affect settlement math
- Only the configured Coston2 FXRP and USDT0 contracts are supported; fee-on-transfer and rebasing tokens are excluded

## 17. Product Roadmap

1. Hackathon MVP: execute-now confidential RFQ.
2. Reusable liquidity-provider vaults with explicit public reservations.
3. Approved or seller-selected liquidity-provider pools.
4. Secure off-chain encrypted payload delivery.
5. Private trigger conditions using FTSO.
6. Conditional execution through the HushFlow RFQ engine.
7. DCA, take-profit, and treasury-rebalancing strategies.
8. Optional XRPL-native entry through Flare Smart Accounts.

## 18. RFQ Timing Rules

- The seller chooses the quote window when creating an RFQ.
- The contract accepts quote windows between 1 minute and 24 hours.
- The Coston2 demo UI defaults to a 2-minute quote window.
- After the quote window closes, FCC has a 30-minute resolution grace period to produce a valid signed result.
- If no valid result is submitted before the resolution deadline, the RFQ enters `TIMED_OUT` and all deposited assets become individually refundable.
- The judge demo will include an RFQ that is already close to its quote deadline, so evaluators can observe the full flow without unnecessary waiting.
- The short Coston2 default is a demo configuration, not a permanent product constraint.

## 19. UX and Frontend Direction

HushFlow should look and behave like a credible trading protocol rather than a single-purpose hackathon form. The interface may be broad, but every surface must be supported by real protocol data or a working action.

### 19.1 Landing Page

- Product story and concise value proposition: execute meaningful FXRP trades without exposing the seller's price limit or competing quotes.
- Primary actions: Launch App and View Guided Demo.
- Explanation of the privacy advantage, protocol lifecycle, and Flare/FCC integration.
- Real protocol statistics where available.
- Clear labels for information that is public, encrypted, or revealed after settlement.
- FAQ and links to technical material.

### 19.2 Trade

- A dedicated wizard for creating a private RFQ.
- Inputs for FXRP amount, private minimum USDT0 received, public quote cap, and quote duration.
- Wallet-balance, collateral, deadline, and settlement previews before confirmation.
- Transaction progress with understandable approval, deposit, encryption, and confirmation stages.

### 19.3 RFQ Market

- Active and completed RFQs backed by real contract data.
- Filtering and sorting by status, asset pair, amount, participation, and remaining time where useful.
- Recent settlements and actual protocol activity.
- Direct navigation into each RFQ opportunity.

### 19.4 Liquidity Desk

- A provider-focused workspace for discovering eligible RFQs.
- Encrypted-quote submission and collateral-deposit flow.
- Provider-specific locked collateral, pending RFQs, completed results, and claimable balances.
- Clear distinction between the provider's quote during submission and information made public by the protocol.
- Do not persist or reconstruct plaintext submitted quotes after submission; show submission status and public outcome instead.

### 19.5 Portfolio

- RFQs created by the connected wallet.
- RFQs in which the wallet submitted a quote.
- Active deposits, settlements, refunds, and claimable funds.
- Real transaction history with explorer links.

### 19.6 Proof Center

- FCC results and signature-verification status.
- Contract events, relevant ciphertext or commitments, result bindings, and transaction links.
- A plain-language privacy model alongside deeper technical evidence.
- Evidence must clarify what FCC proved without implying stronger privacy than the MVP actually provides.

### 19.7 RFQ Detail

One state-aware route represents the complete lifecycle of an individual RFQ:

- `OPEN`: countdown, participant count, collateral terms, and encrypted-quote action.
- `PROCESSING`: clear FCC evaluation status.
- `SETTLED`: winner, execution price, transfers, and FCC result evidence.
- `NO_VALID_QUOTE`, `INVALID_RFQ`, `CANCELLED`, `TIMED_OUT`, or `REFUNDABLE`: plain-language reason and Claim Refund action.

The primary experience remains readable, while advanced evidence is linked to the Proof Center or shown in a secondary Technical Proof panel.

### 19.8 Judge Demo Experience

- Target a 3-to-4-minute guided demonstration.
- Begin with the trading problem and enter through View Guided Demo.
- Create a private RFQ by locking FXRP and encrypting the seller's minimum acceptable USDT0 amount.
- Show the RFQ in the market and allow two disclosed testnet LP helpers to submit real Coston2 transactions. A judge may also submit a quote using their own wallet.
- Keep competing quote values hidden while showing participation, collateral, deadlines, and transaction evidence.
- When the quote window closes, show FCC evaluating the encrypted minimum and encrypted quotes.
- Use the Proof Center to expose the signed result and its chain, contract, RFQ, expiry, and nonce bindings.
- Finalize through the real contract, reveal only the winning provider and execution price, and show the resulting FXRP and USDT0 transfers.
- Keep losing quote values unpublished and show each wallet's resulting settlement or refund state in Portfolio.
- Maintain at least one completed RFQ backed by real Coston2 transactions as a fallback if FCC or the testnet is temporarily slow.
- Preserve the real contract and FCC flow; guidance and testnet helpers reduce navigation, counterparty, and waiting friction but do not replace protocol execution.
- Never present test helpers, seeded flows, or fallback records as organic production activity.

### 19.9 Visual Implementation Rule

- Adapt a mature existing website layout or template rather than designing the interface from scratch.
- Select the reference later based on flow compatibility, implementation speed, responsive behavior, and license suitability.
- Modify its information architecture and components to serve the HushFlow workflow; do not copy branding or force the product into an unsuitable layout.
- Prioritize a clear working demo and credible technical proof over decorative complexity.
- Do not use fabricated charts, protocol volume, participants, or other fake activity to make the interface look complete.

## 20. Observability and Protocol Data

HushFlow uses a lightweight event indexer while keeping the Flare contract as the source of truth.

### 20.1 Responsibilities

- The indexer consumes contract events for RFQ creation, quote participation, FCC results, settlement, timeout, and refunds.
- The read database powers market listings, filtering, protocol statistics, historical activity, and responsive portfolio views.
- The frontend verifies critical current state such as settlement eligibility, balances, claimable funds, and RFQ status against the contract before enabling transactions.
- Indexed data must never authorize settlement, modify balances, choose a winner, or override contract state.

### 20.2 User-Facing Evidence

- Every RFQ exposes a lifecycle timeline with transaction hashes and explorer links.
- Proof Center exposes FCC result data, signature-verification status, and chain, contract, RFQ, expiry, and nonce bindings.
- Protocol statistics and activity feeds are derived only from real contract events.
- The interface distinguishes indexed convenience data from contract-verified execution state where that distinction matters.

### 20.3 Operational Health

Monitor at least:

- RPC availability and error rate
- Indexer block lag and last processed block
- FCC request age and unresolved RFQs
- Failed result submissions and failed settlement attempts
- Testnet LP-helper balances
- RFQs approaching or entering timeout

### 20.4 Privacy-Safe Telemetry

The following must never be stored in application logs, the read database, error trackers, or product analytics:

- Plaintext seller minimum
- Plaintext provider quote
- Decrypted FCC input
- Wallet or FCC private keys
- Encryption secrets

Operational telemetry should use RFQ IDs, public transaction hashes, public state transitions, coarse error codes, and latency measurements. Sensitive payloads must not be included in exception messages or request tracing.

## 21. FCC Feasibility Spike

FCC integration is the first implementation milestone. The project must prove a real vertical slice before investing heavily in the rest of the product interface.

### 21.1 Acceptance Criteria

The spike passes only when all of the following work:

1. A custom FCC extension can be started from a clean setup using repository documentation.
2. A seller minimum and at least two provider quotes can be encrypted.
3. FCC can decrypt and validate those payloads.
4. FCC selects the highest quote that meets the seller minimum total proceeds and does not exceed the public quote cap.
5. Equal winning quotes resolve in favor of the quote submitted earlier on-chain.
6. FCC output contains the winning provider and winning quote without emitting losing quotes into results or application logs.
7. The signed result binds chain ID, contract address, RFQ ID, result type, winner, winning quote, expiry, and a unique nonce.
8. A Coston2 contract accepts and records a valid result.
9. The contract rejects a modified, replayed, expired, wrong-chain, wrong-contract, or wrong-RFQ result.
10. The end-to-end FXRP-to-USDT0 settlement and no-trade refund paths succeed.
11. Another developer or clean environment can reproduce the flow using repository instructions.
12. Under healthy infrastructure, confidential resolution completes within an operational target of three minutes for the guided demo.

### 21.2 Decision Gate

- Do not treat a mock FCC response as completion of this milestone.
- If the spike fails, isolate whether the blocker is environment setup, encryption transport, extension logic, result signing, verification, or token settlement.
- Fix or simplify the mechanism while preserving the HushFlow positioning before expanding product scope.
- The complete frontend may use mocked adapters during parallel UI work, but the hackathon's core path is not considered viable until this real FCC slice passes.

## 22. Validation Strategy

External users are useful but not required for the hackathon submission. HushFlow will use honest simulated and technical validation as the dependable baseline, while treating external testers as an optional bonus.

### 22.1 Simulated Persona Review

- Use independent AI reviewers representing an XRPFi treasury trader, liquidity provider, Flare developer, first-time evaluator, and security-conscious reviewer.
- Give each reviewer the same product materials and concrete tasks rather than prompting them to praise the design.
- Record misunderstandings, blocked actions, privacy misconceptions, and requested information.
- Convert findings into prioritized product changes.
- Describe this evidence as simulated persona review or adversarial UX review, never as real interviews or user traction.

### 22.2 Automated Multi-Wallet Validation

- Use separate controlled Coston2 wallets for seller, multiple providers, result submitter, and other protocol roles.
- Exercise RFQ creation, encrypted quote submission, FCC resolution, settlement, no-valid-quote, cancellation, timeout, and individual refund claims.
- Record real transaction hashes and reproducible test scenarios.
- Label activity from controlled wallets and test helpers as testnet demo activity, not organic protocol usage.

### 22.3 Optional External Feedback

- Publish a working test link and a lightweight feedback channel when the demo is stable.
- External testing is optional and must not delay the reliable core demo.
- Report only real external wallets, feedback, or community interest that can be supported by evidence and permission.
- Never fabricate interview counts, users, partnerships, volume, quotes, or testimonials.

### 22.4 Submission Language

If there is no external testing by submission time, state clearly that HushFlow was validated through adversarial persona simulation, automated multi-wallet testing, and end-to-end Coston2 scenarios, with external user testing as a next step.

## 23. Test Strategy and Release Gates

HushFlow uses layered testing, protocol invariants, and real Coston2 end-to-end runs. Happy-path coverage alone is not sufficient for contracts that custody user assets, while full formal verification is outside the MVP release gate.

### 23.1 Test Matrix

| Layer | Required evidence |
| --- | --- |
| Smart-contract unit tests | All state transitions, access rules, collateral accounting, settlement, claims, cancellation, and timeout behavior |
| Fuzz and invariant tests | Assets cannot be created or lost; deposited funds always become settled or refundable; an RFQ finalizes at most once; each provider has at most one quote per RFQ |
| FCC extension tests | Decryption, malformed payload handling, minimum and cap validation, winner selection, deterministic tie-break, no-valid-quote behavior, and nonpublication of losing quotes |
| Signature security tests | Invalid, modified, replayed, expired, wrong-chain, wrong-contract, and wrong-RFQ results are rejected |
| Token edge cases | Failed transfers, supported-token assumptions, decimal handling, and reentrancy attempts |
| Indexer tests | Historical event replay, duplicate processing, restart recovery, block lag, and reorganization-safe behavior |
| Frontend tests | Wallet states, encryption flow, transaction progress, empty, error, timeout, settlement, and refund states |
| Browser end-to-end tests | Seller flow, provider flow, guided demo, Proof Center, Portfolio, and critical desktop/mobile layouts |
| Coston2 end-to-end tests | RFQ creation through FCC settlement plus cancellation, no-valid-quote, timeout, and individual refund paths |
| Operational drills | Slow FCC, unavailable RPC, lagging indexer, failed result submission, and insufficient LP-helper balance |

### 23.2 Release Gates

- Critical contract logic meets a minimum target of 90% line and branch coverage; coverage supplements rather than replaces invariant and security testing.
- All defined protocol invariants pass.
- No open critical or high-severity security finding remains.
- A clean setup reproduces the real FCC vertical slice.
- The guided demo succeeds end-to-end three consecutive times under normal testnet conditions.
- At least one completed fallback RFQ is independently verifiable through public Coston2 transactions.
- Plaintext private minimums, plaintext quotes, decrypted FCC inputs, private keys, and encryption secrets are absent from logs, database records, screenshots, traces, and error reports.
- Failure paths leave no user funds permanently trapped under the stated contract assumptions.

## 24. Repository Architecture and Stack

HushFlow uses a modular monorepo. This preserves one source of truth for contracts and interfaces while allowing components and AI-agent workstreams to remain isolated.

```text
HushFlow/
|-- apps/
|   |-- web/                 # Product interface
|   `-- indexer/             # Event ingestion and read API
|-- services/
|   |-- fcc-extension/       # Confidential quote evaluation
|   `-- demo-lp/             # Coston2-only liquidity helpers
|-- contracts/               # Foundry contracts, deployment scripts, and tests
|-- packages/
|   |-- protocol/            # ABI, addresses, shared protocol types and schemas
|   |-- crypto/              # Client encryption and FCC payload encoding
|   `-- ui/                  # Adapted design system and reusable components
|-- tests/
|   `-- e2e/                 # Browser and multi-wallet scenarios
|-- scripts/                 # Setup, demo seeding, and operational scripts
|-- infra/                   # Local containers and deployment configuration
`-- docs/
    `-- superpowers/specs/   # Approved product and technical specifications
```

### 24.1 Recommended Stack

- Next.js and TypeScript for the web application
- Tailwind CSS and an adapted, license-compatible interface template
- `wagmi` and `viem` for wallet and contract interaction
- Solidity, Foundry, and OpenZeppelin for contracts
- TypeScript/Node in Docker for the FCC extension
- TypeScript and PostgreSQL for the indexer and read model
- Foundry, Vitest, and Playwright for testing
- A workspace package manager and task runner for reproducible monorepo commands

Exact stable dependency versions are verified and pinned in the implementation plan rather than assumed in this design.

### 24.2 Component Boundaries

- The contract does not depend on the frontend, indexer, or demo helper.
- `packages/protocol` is the source of generated ABI, deployment addresses, event definitions, and shared protocol schemas.
- `packages/crypto` owns encrypted-envelope construction and validation; application components do not implement ad hoc cryptography.
- The indexer reads public events and never determines winners, authorizes claims, or changes settlement state.
- The FCC extension accepts one versioned input contract and returns one versioned signed-result contract.
- The web application verifies critical execution state against the contract before enabling a transaction.
- The demo LP service is Coston2-only, uses environment-managed secrets, is clearly disclosed, and cannot be enabled by production configuration.
- Services do not import frontend internals, and interface changes require corresponding shared-schema and compatibility-test updates.

### 24.3 Delivery Order

1. Prove the FCC vertical slice and verifier path.
2. Complete and test contract accounting and terminal states.
3. Generate shared ABI, schemas, and cryptographic adapters.
4. Build the indexer and frontend against stable interfaces; these workstreams may proceed in parallel.
5. Add the Coston2 demo helper, Proof Center, and guided demo automation.
6. Run security review, privacy-log audit, operational drills, and repeated release-gate demonstrations.

## 25. Reference Basis

- [Flare Confidential Compute overview](https://dev.flare.network/fcc/overview)
- [FCC private-key/sign-extension guide](https://dev.flare.network/fcc/guides/sign-extension)
- [FCC weather-insurance extension example](https://dev.flare.network/fcc/guides/weather-insurance-extension)
- [FAssets overview](https://dev.flare.network/fassets/overview)
- [FXRP overview](https://dev.flare.network/fxrp/overview)
- [Flare network and Coston2 overview](https://dev.flare.network/network/overview)
- [FTSO feeds](https://dev.flare.network/ftso/feeds)
