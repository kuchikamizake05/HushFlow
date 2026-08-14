<p align="center">
  <img src="apps/web/app/icon.svg" width="80" height="80" alt="HushFlow logo" />
</p>

<h1 align="center">HushFlow</h1>

<p align="center">
  <strong>Verifiable, Confidential RFQ & Dark Settlement Layer for XRPFi on Flare Network</strong><br />
  Keep commercial pricing terms strictly confidential off-chain, while enforcing verifiable, mathematical settlement on Coston2.
</p>

<p align="center">
  <a href="https://hushflow.vercel.app"><strong>🌐 Live Web App (Vercel)</strong></a> ·
  <a href="https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab"><strong>📜 Coston2 Contract</strong></a> ·
  <a href="https://fcc.hushflow.dev/info"><strong>⚡ Live TEE Enclave</strong></a> ·
  <a href="docs/submission/hackathon.md"><strong>🏆 Hackathon Pack</strong></a> ·
  <a href="docs/architecture/overview.md"><strong>🏛️ Architecture</strong></a> ·
  <a href="docs/security/threat-model.md"><strong>🛡️ Threat Model</strong></a>
</p>

<p align="center">
  <a href="https://hushflow.vercel.app"><img src="https://img.shields.io/badge/Live%20Demo-hushflow.vercel.app-00E599?style=for-the-badge&logo=vercel" alt="Live Demo on Vercel" /></a>
  <a href="https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab"><img src="https://img.shields.io/badge/Coston2-Chain%20114%20(Deployed)-E84142?style=for-the-badge&logo=flare" alt="Flare Coston2" /></a>
  <img src="https://img.shields.io/badge/On--Chain%20Evidence-11%2F11%20Verified%20Txns-0F9D8A?style=for-the-badge" alt="11/11 Verified Coston2 Txns" />
  <img src="https://img.shields.io/badge/Flare%20FCC-Official%20Scaffold%20Adapter-8B5CF6?style=for-the-badge" alt="Flare FCC" />
  <img src="https://img.shields.io/badge/Tests-325%20Passing%20(100%25)-38BDF8?style=for-the-badge" alt="325 Vitest Tests" />
  <img src="https://img.shields.io/badge/Foundry-52%20Passing%20(Invariants)-F59E0B?style=for-the-badge" alt="52 Foundry Tests" />
</p>

---

## 🚀 30-Second Judge Tour (Test the Live App)

Judges can explore the end-to-end confidential RFQ lifecycle directly on the live web app at **[hushflow.vercel.app](https://hushflow.vercel.app)**:

1. **Institutional Cockpit (`/trade`):** View the live FXRP/USDT0 order book, interactive depth chart, and Flare FTSO V2 reference price anchor.
2. **Interactive TEE Simulation (`/demo`):** Step through the confidential RFQ flow:
   - *Step 1:* Seller deposits FXRP lot with an encrypted reserve floor.
   - *Step 2:* Competing Liquidity Providers submit sealed ECIES-encrypted quotes.
   - *Step 3:* Trigger Flare Confidential Compute (FCC) matching in the secure enclave.
   - *Step 4:* Verify on-chain settlement and pull-based collateral claims.
3. **Cryptographic Proof Center (`/proof`):** Inspect verified transaction proofs and direct explorer receipts on Flare Coston2 Testnet.

---

## ⚡ Executive Summary

In public Request-for-Quote (RFQ) and order book protocols on XRPFi, **information leakage destroys market efficiency**:
- Sellers expose their reservation floor prices.
- Market makers expose their inventory thresholds and pricing algorithms.
- Predatory searchers front-run and copy-trade orders before settlement occurs.

**HushFlow solves this by decoupling negotiation privacy from settlement verifiability:**
1. **Confidential Negotiation:** Sellers and liquidity providers encrypt their commercial terms off-chain using ECIES.
2. **Flare Confidential Compute (FCC):** A secure Trusted Execution Environment (TEE) enclave decrypts the private envelopes, selects the winning quote using deterministic tie-breaking rules, and signs a cryptographic execution attestation.
3. **On-Chain Settlement:** The `HushFlowRfq` and `HushFlowResultVerifier` smart contracts verify the TEE signature on Flare Coston2, releasing the FXRP lot to the winner and USDT0 proceeds to the seller, while automatically refunding 100% of losing providers' collateral.

---

## 📍 Live Deployments & Network Addresses (Coston2 Testnet - Chain 114)

| Component | Target / Address | Explorer / Link |
| :--- | :--- | :--- |
| **Live Web App** | `https://hushflow.vercel.app` | [Open Web App](https://hushflow.vercel.app) |
| **HushFlowRfq (Custody & Settlement)** | `0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab` | [View on Coston2 Explorer](https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab) |
| **FXRP Token (FTestXRP)** | `0x0b6A3645c240605887a5532109323A3E12273dc7` | [View on Coston2 Explorer](https://coston2-explorer.flare.network/address/0x0b6A3645c240605887a5532109323A3E12273dc7) |
| **USDT0 Collateral Token (USD₮0)** | `0xC1A5B41512496B80903D1f32d6dEa3a73212E71F` | [View on Coston2 Explorer](https://coston2-explorer.flare.network/address/0xC1A5B41512496B80903D1f32d6dEa3a73212E71F) |
| **FlareTeeManager Registry** | `0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE` | [View on Coston2 Explorer](https://coston2-explorer.flare.network/address/0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE) |
| **FCC TEE Live Proxy Endpoint** | `https://fcc.hushflow.dev` | [Check Live `/info` Endpoint](https://fcc.hushflow.dev/info) |

---

## 🧾 Verifiable On-Chain Evidence Ledger (11/11 Coston2 Transactions)

HushFlow has verified and recorded the full multi-party RFQ lifecycle on Flare Coston2 Testnet across three distinct wallets (Seller, Provider A, Provider B):

| Step | Action | Tx Hash | Description & Verified Outcome | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | `APPROVE_FXRP` | [`0xca5e4954...`](https://coston2-explorer.flare.network/tx/0xca5e49546434b5b42ca4a8474a6538be030f8d1daff9be38ef63684166de0e3d) | Seller approves 1 FXRP lot for contract escrow | `CONFIRMED` ✅ |
| **2** | `CREATE_RFQ` | [`0xce351a60...`](https://coston2-explorer.flare.network/tx/0xce351a60d64096fc823426175104a6abb46b8fb14e1ab18a91297ba015738fab) | RFQ #1 created (1 FXRP lot, 5 USDT0 cap, sealed reserve price) | `CONFIRMED` ✅ |
| **3** | `APPROVE_USDT0_A` | [`0xc75fb514...`](https://coston2-explorer.flare.network/tx/0xc75fb5149f7c6c9e0bc8a25e5de6062d76c12ed9f7f9fad5d65a828cf953dc3c) | Provider A approves 5 USDT0 collateral escrow | `CONFIRMED` ✅ |
| **4** | `SUBMIT_QUOTE_A` | [`0x3ce10ebf...`](https://coston2-explorer.flare.network/tx/0x3ce10ebfab1e447343e52ba2c19fa8d6173a10cb7563a26168a102a1a8b8c80f) | Provider A submits encrypted quote of 3 USDT0 | `CONFIRMED` ✅ |
| **5** | `APPROVE_USDT0_B` | [`0xeaa520db...`](https://coston2-explorer.flare.network/tx/0xeaa520db815ef0b7e7f21181af6c8d676c26a2187393a89e63d2f4d5b055f30d) | Provider B approves 5 USDT0 collateral escrow | `CONFIRMED` ✅ |
| **6** | `SUBMIT_QUOTE_B` | [`0xb6448e17...`](https://coston2-explorer.flare.network/tx/0xb6448e17d8706b7c1034aec7a5a3739144ae1a1072720a01e4441d7b762241bc) | Provider B submits encrypted quote of 4 USDT0 (Winning Quote) | `CONFIRMED` ✅ |
| **7** | `REQUEST_RESOLUTION` | [`0x0a2317c4...`](https://coston2-explorer.flare.network/tx/0x0a2317c4d9bf28a3df529ef99447b46600f50d25264825e84922624426da5970) | Initiates FCC resolution on-chain (`actionId: 0xdc2245bc...`) | `CONFIRMED` ✅ |
| **8** | `SUBMIT_RESULT` | [`0xcbdda0ae...`](https://coston2-explorer.flare.network/tx/0xcbdda0ae9448030632138a382556e4aae4198eb59c3b72df4fb3dc8e9f250ef2) | Relays signed TEE resolution (Winner: Provider B @ 4 USDT0) | `CONFIRMED` ✅ |
| **9** | `CLAIM_SELLER` | [`0xc6dcf965...`](https://coston2-explorer.flare.network/tx/0xc6dcf96550f5d3ac4bccee57ba5d5eea60a6f85968655748f79c6cc204537458) | Seller claims 4 USDT0 trade proceeds | `CONFIRMED` ✅ |
| **10** | `CLAIM_PROVIDER_B` | [`0xfd72d6d4...`](https://coston2-explorer.flare.network/tx/0xfd72d6d4083500bb5a47acae0619da8fc75276c57ee1a59b1fe2aef1ded2e884) | Winner (Provider B) claims 1 FXRP lot | `CONFIRMED` ✅ |
| **11** | `CLAIM_PROVIDER_A` | [`0xc20885ec...`](https://coston2-explorer.flare.network/tx/0xc20885ec1b5e3effaaa92330523366f15b243e66111d1cea91927a7eba5a533e) | Losing Provider A claims 100% refund of 5 USDT0 collateral | `CONFIRMED` ✅ |

*Full machine-readable ledger: [`docs/runbooks/coston2-evidence-ledger.json`](docs/runbooks/coston2-evidence-ledger.json)*

---

## 🏗️ End-to-End Architecture & Confidential Flow

```text
  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
  │     Seller      │       │   Provider A    │       │   Provider B    │
  │  (Escrows FXRP) │       │ (Escrows USDT0) │       │ (Escrows USDT0) │
  └────────┬────────┘       └────────┬────────┘       └────────┬────────┘
           │ Encrypted Minimum       │ Encrypted Quote         │ Encrypted Quote
           │ (ECIES secp256k1)       │ (3 USDT0)               │ (4 USDT0 - Winner)
           ▼                         ▼                         ▼
   ════════════════════════════════════════════════════════════════════════
                     FLARE CONFIDENTIAL COMPUTE (FCC)
                     Trusted Execution Environment (TEE)
     1. Ingests encrypted envelopes inside hardware-isolated enclave
     2. Decrypts private commercial terms off-chain
     3. Selects optimal quote with deterministic tie-breaking
     4. Emits cryptographically signed ActionResult attestation
   ════════════════════════════════════════════════════════════════════════
                                     │
                                     │ Signed Result Data
                                     ▼
   ════════════════════════════════════════════════════════════════════════
                       ON-CHAIN SETTLEMENT (Coston2)
             HushFlowResultVerifier.sol  ──►  HushFlowRfq.sol
     1. Verifies TEE signature against FlareTeeManager registry
     2. Releases 4 USDT0 proceeds to Seller
     3. Transfers 1 FXRP lot to winning Provider B
     4. Unlocks 100% collateral refund (5 USDT0) to losing Provider A
   ════════════════════════════════════════════════════════════════════════
```

---

## 💡 Flare Ecosystem Synergy (FCC + FTSO V2)

HushFlow natively integrates the core primitives of the Flare Network:

1. **Flare Confidential Compute (FCC):** Provides the off-chain cryptographic enclave where sensitive negotiations occur without exposing order intent to the public mempool.
2. **Flare Time Series Oracle (FTSO V2):** Provides real-time decentralized price reference anchors for FXRP/USDT0 directly inside the trading cockpit and telemetry bars.
3. **Flare Coston2 / EVM:** Provides final, non-custodial on-chain asset custody and pull-based settlements.

| Primitive | Role in HushFlow | Why It Matters |
| :--- | :--- | :--- |
| **FCC (TEE Enclave)** | Private quote matching & signing | Eliminates front-running, copy-trading, and toxic MEV. |
| **FTSO V2 Anchor** | Fair reference pricing | Prevents off-market quote manipulation and fat-finger errors. |
| **Coston2 Smart Contracts** | Non-custodial escrow & claims | Enforces deterministic settlement without counterparty risk. |

---

## 🛡️ Security, Cryptography & Rigorous Verification

1. **Envelope Cryptography:** Encrypted with standard ECIES (secp256k1 + AES-GCM + SHA-256), strictly isolating seller floors from competing liquidity providers.
2. **Replay & Freshness Protection:** Every resolution instruction includes a fresh cryptographic nonce and expiry timestamp, preventing front-running and stale quote submissions.
3. **Pull-Payment Pattern:** All settlements use pull-based claims (`claimSeller`, `claimProvider`), protecting users against griefing or denial-of-service in refund loops.
4. **Comprehensive Test Suite:**
   - **325 Vitest TypeScript Tests** (100% green across crypto, protocol, indexer, fcc-extension, and web packages).
   - **52 Foundry Solidity Tests** (including comprehensive invariant & fuzz testing on custody accounting and state transitions).

---

## 💻 Local Quickstart & Verification

```bash
# 1. Install dependencies
pnpm install

# 2. Run comprehensive test suite (325 Vitest tests)
pnpm test

# 3. Run Foundry smart contract tests & invariant suite
forge test

# 4. Check Flare Coston2 network preflight
pnpm preflight:coston2

# 5. Build production web cockpit
pnpm --filter @hushflow/web build
```

---

## 📂 Repository Structure

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
    └── submission/          # Official hackathon submission pitch & guide
```

---

## ⚖️ Disclaimer

HushFlow is developed as a hackathon prototype for the Flare Network ecosystem. While contracts feature comprehensive invariant and unit test coverage, they have not undergone a third-party security audit and should be used on testnets only.
