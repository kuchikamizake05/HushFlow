<p align="center">
  <img src="apps/web/app/icon.svg" width="72" height="72" alt="HushFlow logo" />
</p>

<h1 align="center">HushFlow</h1>

<p align="center">
  <strong>Verifiable, Confidential RFQ & Settlement Protocol for XRPFi on Flare Network</strong><br />
  Off-chain commercial terms sealed with ECIES cryptography; on-chain mathematical settlement verified on Flare Coston2.
</p>

<p align="center">
  <a href="https://hushflow.dev"><strong>Live Web Application</strong></a> ·
  <a href="https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab"><strong>Coston2 Contract</strong></a> ·
  <a href="https://fcc.hushflow.dev/info"><strong>Simulated FCC Endpoint</strong></a> ·
  <a href="docs/submission/hackathon.md"><strong>Submission Pack</strong></a> ·
  <a href="docs/architecture/overview.md"><strong>Architecture</strong></a> ·
  <a href="docs/security/threat-model.md"><strong>Threat Model</strong></a>
</p>

<p align="center">
  <a href="https://hushflow.dev"><img src="https://img.shields.io/badge/Web%20App-hushflow.dev-00E599?style=flat-square&logo=vercel" alt="Live App on hushflow.dev" /></a>
  <a href="https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab"><img src="https://img.shields.io/badge/Coston2-Chain%20114%20(Deployed)-E84142?style=flat-square&logo=flare" alt="Flare Coston2" /></a>
  <img src="https://img.shields.io/badge/Settlement%20Drill-11%2F11%20Confirmed%20Txns-0F9D8A?style=flat-square" alt="11/11 Verified Coston2 Txns" />
  <img src="https://img.shields.io/badge/Flare%20FCC-SIMULATED__TEE%20Ready-8B5CF6?style=flat-square" alt="Flare FCC" />
  <img src="https://img.shields.io/badge/TypeScript-325%20Passing-38BDF8?style=flat-square" alt="325 Vitest Tests" />
  <img src="https://img.shields.io/badge/Foundry-52%20Passing-F59E0B?style=flat-square" alt="52 Foundry Tests" />
</p>

---

## Evaluation Guide (Live Application)

Evaluators can inspect the end-to-end confidential RFQ lifecycle directly on the live web deployment at **[hushflow.dev](https://hushflow.dev)**:

1. **Trading Cockpit (`/trade`):** Interactive controlled RFQ walkthrough, depth chart visualization, and FTSO V2-oriented reference-price interface (live oracle contract wiring is targeted for production migration).
2. **Liquidity Provider Desk (`/liquidity`):** Active target RFQ inspection and sealed quote submission walkthrough backed by refundable USDT0 escrow.
3. **Portfolio & Claims (`/portfolio`):** Terminal position ledger, claimable balance allocation, and 100% collateral refund auditing.
4. **Proof Center (`/proof`):** Cryptographic verification receipts and direct Flare Coston2 block explorer transactions.

---

## Executive Summary

Public Request-for-Quote (RFQ) protocols on decentralized networks suffer from systemic information leakage:
- Asset sellers reveal target reservation floor prices.
- Liquidity providers expose private pricing models and inventory constraints.
- Mempool searchers front-run and sandwich trades before execution completes.

**HushFlow decouples private negotiation from public settlement:**
1. **Client-Side Sealing:** Sellers and liquidity providers encrypt commercial terms using standard ECIES cryptography (secp256k1 + AES-GCM + SHA-256).
2. **Flare Confidential Compute (FCC):** A secure enclave adapter (`HUSHFLOW / RESOLVE_RFQ` built on the official FCE scaffold) decrypts private envelopes, selects the winning quote via deterministic tie-breaking, and signs an execution attestation.
3. **On-Chain Settlement:** The `HushFlowRfq` and `HushFlowResultVerifier` contracts verify the signed resolution on Flare Coston2, transferring the FXRP lot to the winner and USDT0 proceeds to the seller, while automatically unlocking 100% collateral refunds for losing participants.

> **Note on Hackathon Demonstration Mode:** For the Coston2 hackathon demonstration, the FCC execution path runs through the official scaffold in simulated-TEE mode; the 11-step ledger independently proves the settlement contract lifecycle.

---

## Deployed Addresses & Network Endpoints (Coston2 Testnet - Chain 114)

| Component | Target / Address | Explorer / Endpoint Status |
| :--- | :--- | :--- |
| **Web Application** | `https://hushflow.dev` | [Open Deployment](https://hushflow.dev) (HTTP 200 OK) |
| **HushFlowRfq Contract** | `0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab` | [Coston2 Explorer](https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab) (Bytecode Confirmed) |
| **FXRP Token (FTestXRP)** | `0x0b6A3645c240605887a5532109323A3E12273dc7` | [Coston2 Explorer](https://coston2-explorer.flare.network/address/0x0b6A3645c240605887a5532109323A3E12273dc7) |
| **USDT0 Collateral Token (USD₮0)** | `0xC1A5B41512496B80903D1f32d6dEa3a73212E71F` | [Coston2 Explorer](https://coston2-explorer.flare.network/address/0xC1A5B41512496B80903D1f32d6dEa3a73212E71F) |
| **FlareTeeManager Registry** | `0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE` | [Coston2 Explorer](https://coston2-explorer.flare.network/address/0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE) |
| **Public Simulated FCC Proxy** | `https://fcc.hushflow.dev` | [Live `/info` Endpoint](https://fcc.hushflow.dev/info) (HTTP 200 OK) |

---

## On-Chain Settlement Ledger (11/11 Coston2 Transactions)

HushFlow has executed and verified the full multi-party RFQ settlement lifecycle on Flare Coston2 across three distinct wallets (Seller, Provider A, Provider B):

| Step | Action | Tx Hash | Description & Verified Outcome | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | `APPROVE_FXRP` | [`0xca5e4954...`](https://coston2-explorer.flare.network/tx/0xca5e49546434b5b42ca4a8474a6538be030f8d1daff9be38ef63684166de0e3d) | Seller approved 1 FXRP lot for contract escrow | `CONFIRMED` |
| **2** | `CREATE_RFQ` | [`0xce351a60...`](https://coston2-explorer.flare.network/tx/0xce351a60d64096fc823426175104a6abb46b8fb14e1ab18a91297ba015738fab) | RFQ #1 created (1 FXRP lot, 5 USDT0 cap, sealed reserve price) | `CONFIRMED` |
| **3** | `APPROVE_USDT0_A` | [`0xc75fb514...`](https://coston2-explorer.flare.network/tx/0xc75fb5149f7c6c9e0bc8a25e5de6062d76c12ed9f7f9fad5d65a828cf953dc3c) | Provider A approved 5 USDT0 collateral escrow | `CONFIRMED` |
| **4** | `SUBMIT_QUOTE_A` | [`0x3ce10ebf...`](https://coston2-explorer.flare.network/tx/0x3ce10ebfab1e447343e52ba2c19fa8d6173a10cb7563a26168a102a1a8b8c80f) | Provider A submitted encrypted quote of 3 USDT0 | `CONFIRMED` |
| **5** | `APPROVE_USDT0_B` | [`0xeaa520db...`](https://coston2-explorer.flare.network/tx/0xeaa520db815ef0b7e7f21181af6c8d676c26a2187393a89e63d2f4d5b055f30d) | Provider B approved 5 USDT0 collateral escrow | `CONFIRMED` |
| **6** | `SUBMIT_QUOTE_B` | [`0xb6448e17...`](https://coston2-explorer.flare.network/tx/0xb6448e17d8706b7c1034aec7a5a3739144ae1a1072720a01e4441d7b762241bc) | Provider B submitted encrypted quote of 4 USDT0 (Winning Quote) | `CONFIRMED` |
| **7** | `REQUEST_RESOLUTION` | [`0x0a2317c4...`](https://coston2-explorer.flare.network/tx/0x0a2317c4d9bf28a3df529ef99447b46600f50d25264825e84922624426da5970) | Initiated resolution on-chain (`actionId: 0xdc2245bc...`) | `CONFIRMED` |
| **8** | `SUBMIT_RESULT` | [`0xcbdda0ae...`](https://coston2-explorer.flare.network/tx/0xcbdda0ae9448030632138a382556e4aae4198eb59c3b72df4fb3dc8e9f250ef2) | Relayed signed resolution (Winner: Provider B @ 4 USDT0) | `CONFIRMED` |
| **9** | `CLAIM_SELLER` | [`0xc6dcf965...`](https://coston2-explorer.flare.network/tx/0xc6dcf96550f5d3ac4bccee57ba5d5eea60a6f85968655748f79c6cc204537458) | Seller claimed 4 USDT0 trade proceeds | `CONFIRMED` |
| **10** | `CLAIM_PROVIDER_B` | [`0xfd72d6d4...`](https://coston2-explorer.flare.network/tx/0xfd72d6d4083500bb5a47acae0619da8fc75276c57ee1a59b1fe2aef1ded2e884) | Winner (Provider B) claimed 1 FXRP lot | `CONFIRMED` |
| **11** | `CLAIM_PROVIDER_A` | [`0xc20885ec...`](https://coston2-explorer.flare.network/tx/0xc20885ec1b5e3effaaa92330523366f15b243e66111d1cea91927a7eba5a533e) | Losing Provider A claimed 100% refund of 5 USDT0 collateral | `CONFIRMED` |

*Machine-readable specification: [`docs/runbooks/coston2-evidence-ledger.json`](docs/runbooks/coston2-evidence-ledger.json)*

---

## Verifiability Status & Technical Boundaries

HushFlow maintains rigorous technical transparency regarding tested versus pending operational gates:

| Scope | Implementation Reality | Operational Boundary |
| :--- | :--- | :--- |
| **Coston2 On-Chain Settlement** | 11/11 transactions executed and verified on Flare Block Explorer. Deployed contract bytecode verified. | Proves on-chain custody accounting, signature verification, and pull-based claims. |
| **Flare FCC Integration** | Built on the official `fce-extension-scaffold` TypeScript route for `HUSHFLOW / RESOLVE_RFQ`. | Executed in `SIMULATED_TEE=true` mode against Coston2 testnet. |
| **Public Proxy Endpoint** | Publicly accessible via Cloudflare Tunnel at `fcc.hushflow.dev/info`. | Serves simulated enclave identity (`extensionId: 0xffff...`). Registered GCP Confidential Space hardware attestation on `FlareTeeManager` is an operational gate for mainnet. |
| **Automated Test Suite** | 325 Vitest TypeScript tests + 52 Foundry Solidity tests passing (100% green). | Covers unit, integration, crypto envelopes, and invariant state testing. |

---

## System Architecture & Protocol Flow

```text
  +-----------------+       +-----------------+       +-----------------+
  |     Seller      |       |   Provider A    |       |   Provider B    |
  |  (Escrows FXRP) |       | (Escrows USDT0) |       | (Escrows USDT0) |
  +--------+--------+       +--------+--------+       +--------+--------+
           | Encrypted Minimum       | Encrypted Quote         | Encrypted Quote
           | (ECIES secp256k1)       | (3 USDT0)               | (4 USDT0 - Winner)
           v                         v                         v
   ========================================================================
                     FLARE CONFIDENTIAL COMPUTE (FCC)
                       Secure Enclave Execution Path
     1. Ingests encrypted envelopes in isolated runtime memory
     2. Decrypts private commercial terms off-chain
     3. Selects optimal quote with deterministic tie-breaking
     4. Emits cryptographically signed ActionResult attestation
   ========================================================================
                                     |
                                     | Signed Result Data
                                     v
   ========================================================================
                       ON-CHAIN SETTLEMENT (Coston2)
             HushFlowResultVerifier.sol  --->  HushFlowRfq.sol
     1. Verifies signed resolution against configured domain and signer
     2. Releases 4 USDT0 proceeds to Seller
     3. Transfers 1 FXRP lot to winning Provider B
     4. Unlocks 100% collateral refund (5 USDT0) to losing Provider A
   ========================================================================
```

---

## Flare Ecosystem Integration

HushFlow natively composes core Flare Network primitives:

1. **Flare Confidential Compute (FCC):** Off-chain enclave execution where multi-party sealed bids are matched without exposing pricing models to mempool searchers.
2. **Flare Time Series Oracle (FTSO V2):** FTSO V2 reference pricing design integrated into trading telemetry as a baseline anchor (direct on-chain contract feed integration targeted for production deployment).
3. **Flare Coston2 / EVM:** Non-custodial escrow custody, signature verification, and pull-based terminal claims.

---

## Cryptography & Protocol Safety

1. **Envelope Cryptography:** Encrypted client-side with standard ECIES (secp256k1 + AES-GCM + SHA-256), strictly isolating seller floors from competing liquidity providers.
2. **Replay & Freshness Protection:** Resolution instructions require fresh nonces and deadline timestamps, preventing stale execution and quote reuse.
3. **Pull-Claim Distribution:** Settlement uses isolated pull-claims (`claimSeller`, `claimProvider`), eliminating DoS attack vectors in refund loops.
4. **Comprehensive Test Coverage:**
   - **325 Vitest Tests:** 100% passing across crypto, protocol, indexer, fcc-extension, and web packages.
   - **52 Foundry Tests:** 100% passing unit, fuzz, and invariant test suites.

---

## Local Verification Commands

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Run automated test suite (325 Vitest tests)
pnpm test

# 3. Run Foundry invariant and unit test suite
forge test

# 4. Validate Flare Coston2 network preflight
pnpm preflight:coston2

# 5. Build production web bundle
pnpm --filter @hushflow/web build
```

---

## Repository Map

```text
HushFlow/
├── contracts/               # Solidity smart contracts (HushFlowRfq, HushFlowResultVerifier)
│   ├── src/                 # Core protocol contracts & Flare interfaces
│   └── test/                # Foundry invariant & unit test suites (52 passing)
├── packages/
│   ├── crypto/              # ECIES encryption, envelope encoding, & key derivation
│   └── protocol/            # Protocol constants, ABIs, types, and canonical encodings
├── services/
│   ├── fcc-extension/       # Official FCE scaffold adapter (HUSHFLOW / RESOLVE_RFQ)
│   └── indexer/             # Reorg-aware Coston2 indexing & read API service
├── apps/
│   └── web/                 # Next.js 16 institutional cockpit, trade UI, & proof center
├── infra/
│   └── fcc/                 # Docker compose stack for Coston2 FCC simulated TEE node
└── docs/
    ├── architecture/        # Deep-dive architectural specs & boundaries
    ├── runbooks/            # Evidence ledger & step-by-step reproduction runbooks
    ├── security/            # Threat model, assumptions, & failure mode disclosures
    └── submission/          # Official hackathon submission pitch & video walkthrough
```

---

## Disclaimer

HushFlow is developed as a hackathon prototype for the Flare Network ecosystem. While contracts feature comprehensive invariant and unit test coverage, they have not undergone a third-party security audit and should be used on testnets only.
