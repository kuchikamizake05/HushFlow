import Link from "next/link";
import { InteractiveHeroDemo } from "./interactive-hero-demo";
import { ArchitectureFlow } from "./architecture-flow";
import { FaqAccordion } from "./faq-accordion";
import { PremiumHeroBackground } from "./premium-hero-background";
import { AnimatedMarquee } from "./animated-marquee";
import { TelemetryDeck } from "./telemetry-deck";
import { ShieldIcon, LockIcon, ZapIcon, ActivityIcon, FlareLogo } from "../shell/icons";

const LIVE_CONTRACT = "0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab";

const coston2Transactions = [
  {
    step: 1,
    action: "APPROVE_FXRP",
    desc: "Seller approved 1 FXRP lot custody",
    hash: "0xca5e49546434b5b42ca4a8474a6538be030f8d1daff9be38ef63684166de0e3d",
  },
  {
    step: 2,
    action: "CREATE_RFQ",
    desc: "Created Sealed RFQ #1 with ECIES reservation price",
    hash: "0xce351a60d64096fc823426175104a6abb46b8fb14e1ab18a91297ba015738fab",
  },
  {
    step: 3,
    action: "APPROVE_USDT0_A",
    desc: "Provider A approved 5 USDT0 collateral",
    hash: "0xc75fb5149f7c6c9e0bc8a25e5de6062d76c12ed9f7f9fad5d65a828cf953dc3c",
  },
  {
    step: 4,
    action: "SUBMIT_QUOTE_A",
    desc: "Provider A submitted sealed quote (3 USDT0)",
    hash: "0x3ce10ebfab1e447343e52ba2c19fa8d6173a10cb7563a26168a102a1a8b8c80f",
  },
  {
    step: 5,
    action: "APPROVE_USDT0_B",
    desc: "Provider B approved 5 USDT0 collateral",
    hash: "0xeaa520db815ef0b7e7f21181af6c8d676c26a2187393a89e63d2f4d5b055f30d",
  },
  {
    step: 6,
    action: "SUBMIT_QUOTE_B",
    desc: "Provider B submitted winning sealed quote (4 USDT0)",
    hash: "0xb6448e17d8706b7c1034aec7a5a3739144ae1a1072720a01e4441d7b762241bc",
  },
  {
    step: 7,
    action: "REQUEST_RESOLUTION",
    desc: "Resolution requested on-chain (Action ID: 0xdc22...)",
    hash: "0x0a2317c4d9bf28a3df529ef99447b46600f50d25264825e84922624426da5970",
  },
  {
    step: 8,
    action: "SUBMIT_RESULT",
    desc: "FCC TEE signed result verified & settled on-chain",
    hash: "0xcbdda0ae9448030632138a382556e4aae4198eb59c3b72df4fb3dc8e9f250ef2",
  },
  {
    step: 9,
    action: "CLAIM_SELLER",
    desc: "Seller claimed 4 USDT0 proceeds",
    hash: "0xc6dcf96550f5d3ac4bccee57ba5d5eea60a6f85968655748f79c6cc204537458",
  },
  {
    step: 10,
    action: "CLAIM_PROVIDER_B",
    desc: "Provider B claimed 1 FXRP lot",
    hash: "0xfd72d6d4083500bb5a47acae0619da8fc75276c57ee1a59b1fe2aef1ded2e884",
  },
  {
    step: 11,
    action: "CLAIM_PROVIDER_A",
    desc: "Provider A claimed 5 USDT0 collateral refund",
    hash: "0xc20885ec1b5e3effaaa92330523366f15b243e66111d1cea91927a7eba5a533e",
  },
];

export function LandingPage() {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      {/* Aceternity Background Beams & Magic UI Grid Spotlight */}
      <PremiumHeroBackground />

      {/* Hero Section */}
      <section className="hero-wrapper">
        <div className="announcement-chip">
          <FlareLogo width={14} height={14} />
          <span>Flare Confidential Compute · Coston2 Testnet Live</span>
        </div>

        <h1 className="hero-heading">
          Confidential Execution Layer for XRPFi.
        </h1>

        <p className="hero-subheading">
          Zero information leakage, blind maker bidding, and hardware TEE matching.
          Trade sizes and reservation minimums remain cryptographically sealed until atomic settlement.
        </p>

        <div className="hero-actions">
          <Link className="action-btn action-btn-primary" href="/trade">
            <span>Start Private RFQ</span>
            <span style={{ fontSize: "0.875rem" }}>→</span>
          </Link>

          <Link className="action-btn action-btn-secondary" href="/proof">
            <span>Proof Center</span>
          </Link>

          <a
            className="action-btn action-btn-secondary"
            href={`https://coston2-explorer.flare.network/address/${LIVE_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Contract Explorer ↗</span>
          </a>
        </div>

        {/* User-Friendly Interactive Demo Card */}
        <InteractiveHeroDemo />
      </section>

      {/* Smooth Marquee Ticker */}
      <AnimatedMarquee />

      {/* Bespoke Telemetry Deck */}
      <TelemetryDeck />

      {/* Architecture Flow Section */}
      <ArchitectureFlow />

      {/* Comparison Matrix */}
      <section id="security" className="section-container">
        <div className="section-header">
          <div className="section-label">COMPARATIVE ANALYSIS</div>
          <h2 className="section-title">Public AMMs vs. HushFlow Dark Pool</h2>
          <p className="section-subtitle">
            Eliminating toxic MEV extraction, sandwich bots, and reservation price exposure.
          </p>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Security Property</th>
                <th>Standard DEX / Public RFQ</th>
                <th style={{ color: "var(--raycast-red)" }}>HushFlow (Flare TEE RFQ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Mempool Visibility</strong></td>
                <td style={{ color: "#ef4444" }}>Public (Exposed to Searchers)</td>
                <td style={{ color: "var(--brand-emerald)", fontWeight: 600 }}>ECIES Encrypted (Zero Leakage)</td>
              </tr>
              <tr>
                <td><strong>MEV & Front-Running</strong></td>
                <td style={{ color: "#ef4444" }}>Vulnerable to Sandwich Attacks</td>
                <td style={{ color: "var(--brand-emerald)", fontWeight: 600 }}>Immune (Matched in Hardware TEE)</td>
              </tr>
              <tr>
                <td><strong>Reservation Price</strong></td>
                <td style={{ color: "#ef4444" }}>Broadcasted in Plaintext</td>
                <td style={{ color: "var(--brand-emerald)", fontWeight: 600 }}>Decrypted Only in Secure Enclave</td>
              </tr>
              <tr>
                <td><strong>Custody Model</strong></td>
                <td style={{ color: "var(--text-secondary)" }}>Variable / Multi-sig</td>
                <td style={{ color: "var(--brand-emerald)", fontWeight: 600 }}>Native Non-Custodial Smart Contract</td>
              </tr>
              <tr>
                <td><strong>Losing Quote Protection</strong></td>
                <td style={{ color: "var(--text-secondary)" }}>N/A</td>
                <td style={{ color: "var(--brand-emerald)", fontWeight: 600 }}>100% Guaranteed Pull-Claim Refund</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Coston2 Ledger */}
      <section id="ledger" className="section-container">
        <div className="section-header">
          <div className="section-label">VERIFIABLE LEDGER</div>
          <h2 className="section-title">Live Coston2 Activity Stream</h2>
          <p className="section-subtitle">
            Complete cryptographic audit trail of the 11-step execution drill settled on Flare Testnet Coston2.
          </p>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>Action</th>
                <th>Description</th>
                <th>Transaction Hash (Coston2 Explorer)</th>
              </tr>
            </thead>
            <tbody>
              {coston2Transactions.map((tx) => (
                <tr key={tx.step}>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                    #{tx.step}
                  </td>
                  <td>
                    <span className="tag-badge">{tx.action}</span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{tx.desc}</td>
                  <td>
                    <a
                      href={`https://coston2-explorer.flare.network/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-mono"
                    >
                      <span>{tx.hash.slice(0, 10)}...{tx.hash.slice(-8)} ↗</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <FaqAccordion />
    </div>
  );
}
