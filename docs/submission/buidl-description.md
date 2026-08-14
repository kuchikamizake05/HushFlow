# HushFlow: Confidential RFQ & Settlement Protocol for XRPFi on Flare Network

HushFlow is a verifiable, confidential Request-for-Quote (RFQ) and settlement protocol for XRPFi built on Flare Network. It decouples private commercial negotiation from public settlement: commercial matching runs inside Flare Confidential Compute (FCC) enclaves, while cryptographic settlement executes deterministically on Flare Coston2.

---

## Executive Summary

Public AMMs and on-chain order books expose pending orders, trade sizes, and price floors to mempool searchers, enabling front-running, sandwich attacks, and predatory MEV. 

HushFlow eliminates information leakage through a three-stage lifecycle:
1. **Client-Side Sealing:** Sellers and liquidity providers encrypt commercial terms locally using standard ECIES cryptography (secp256k1 + AES-GCM + SHA-256).
2. **Flare Confidential Compute (FCC):** A secure enclave adapter (`HUSHFLOW / RESOLVE_RFQ` built on the official Flare FCE scaffold) decrypts private envelopes off-chain, evaluates winning bids via deterministic tie-breaking, and signs an execution attestation.
3. **On-Chain Settlement:** The `HushFlowRfq` and `HushFlowResultVerifier` contracts verify the signed resolution on Flare Coston2, transferring assets to the winner and proceeds to the seller, while automatically unlocking 100% collateral refunds for losing participants.

*Note on Demonstration Mode: For this hackathon demonstration, the FCC execution path runs through the official scaffold in simulated-TEE mode; the 11-step ledger independently proves the settlement contract lifecycle.*

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
- **Flare Confidential Compute (FCC):** Off-chain enclave execution where multi-party sealed bids are matched without exposing pricing models to mempool searchers.
- **Flare Time Series Oracle (FTSO V2):** FTSO V2 reference pricing design integrated into trading telemetry as a baseline anchor (direct on-chain contract feed integration targeted for production deployment).
- **Flare Coston2 / EVM:** Non-custodial escrow custody, signature verification, and pull-based terminal claims.

---

## On-Chain Settlement Ledger (11/11 Coston2 Transactions)

HushFlow has executed and verified the full multi-party RFQ settlement lifecycle on Flare Coston2 across three distinct wallets (Seller, Provider A, Provider B):

| Step | Action | Tx Hash | Description & Verified Outcome |
| :---: | :--- | :--- | :--- |
| 1 | `APPROVE_FXRP` | `0xca5e4954...` | Seller approved 1 FXRP lot for contract escrow |
| 2 | `CREATE_RFQ` | `0xce351a60...` | RFQ #1 created (1 FXRP lot, 5 USDT0 cap, sealed reserve price) |
| 3 | `APPROVE_USDT0_A` | `0xc75fb514...` | Provider A approved 5 USDT0 collateral escrow |
| 4 | `SUBMIT_QUOTE_A` | `0x3ce10ebf...` | Provider A submitted encrypted quote of 3 USDT0 |
| 5 | `APPROVE_USDT0_B` | `0xeaa520db...` | Provider B approved 5 USDT0 collateral escrow |
| 6 | `SUBMIT_QUOTE_B` | `0xb6448e17...` | Provider B submitted encrypted quote of 4 USDT0 (Winning Quote) |
| 7 | `REQUEST_RESOLUTION` | `0x0a2317c4...` | Initiated resolution on-chain (`actionId: 0xdc2245bc...`) |
| 8 | `SUBMIT_RESULT` | `0xcbdda0ae...` | Relayed signed resolution (Winner: Provider B @ 4 USDT0) |
| 9 | `CLAIM_SELLER` | `0xc6dcf965...` | Seller claimed 4 USDT0 trade proceeds |
| 10 | `CLAIM_PROVIDER_B` | `0xfd72d6d4...` | Winner (Provider B) claimed 1 FXRP lot |
| 11 | `CLAIM_PROVIDER_A` | `0xc20885ec...` | Losing Provider A claimed 100% refund of 5 USDT0 collateral |

---

## Security & Verification Guarantees

- **Envelope Cryptography:** Encrypted client-side with ECIES (secp256k1 + AES-GCM + SHA-256), strictly isolating seller floors from competing liquidity providers.
- **Replay & Freshness Protection:** Resolution instructions require fresh nonces and deadline timestamps, preventing stale execution and quote reuse.
- **Pull-Claim Distribution:** Settlement uses isolated pull-claims (`claimSeller`, `claimProvider`), eliminating DoS attack vectors and reentrancy risks in refund loops.
- **Test Suite Rigor:** 325 Vitest TypeScript tests and 52 Foundry Solidity tests passing (100% green across unit, integration, and invariant suites).

---

## Deployed Addresses & Endpoints

- **Live Web Application:** https://hushflow.dev
- **GitHub Repository:** https://github.com/kuchikamizake05/HushFlow
- **HushFlowRfq Contract (Coston2):** `0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab`
- **FXRP Token (FTestXRP):** `0x0b6A3645c240605887a5532109323A3E12273dc7`
- **USDT0 Collateral Token (USD₮0):** `0xC1A5B41512496B80903D1f32d6dEa3a73212E71F`
- **Public Simulated FCC Proxy:** https://fcc.hushflow.dev/info
